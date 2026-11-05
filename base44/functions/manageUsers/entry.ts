import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { applyStaffAccess, normalizeAccess } from '../../shared/staffAccess.ts';

/**
 * manageUsers — the Users tab's backend.
 *
 * People live in StaffMember (one record per person); their login mirrors it.
 * App access is NEVER written here directly: every access change is delegated to
 * applyStaffAccess (shared with setStaffAccess), which mirrors onto the User record
 * and writes the AuditLog entry.
 *
 * Actions: list | invite | resend_invite | update | set_deactivated | cancel_invite | reset_password
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    const allUsers = async () => {
      const raw = await svc.User.list();
      return Array.isArray(raw) ? raw : (raw?.items || []);
    };
    const allStaff = async () => {
      const raw = await svc.StaffMember.list();
      return Array.isArray(raw) ? raw : (raw?.items || []);
    };
    const findStaff = async (staffId) => svc.StaffMember.get(staffId).catch(() => null);

    // ─── Access view of every person (Super Admin excluded) ─────────────
    if (action === 'list') {
      const [staff, users] = await Promise.all([allStaff(), allUsers()]);
      const userByEmail = new Map();
      const userById = new Map();
      for (const u of users) {
        if (u.email) userByEmail.set(u.email.toLowerCase(), u);
        userById.set(u.id, u);
      }

      const rows = staff
        .map((s) => {
          const linked = (s.user_id && userById.get(s.user_id)) || userByEmail.get((s.email || '').toLowerCase()) || null;
          if (linked?.is_super_admin) return null;
          return {
            staffId: s.id,
            name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || linked?.full_name || s.email || '—',
            first_name: s.first_name || '',
            last_name: s.last_name || '',
            email: s.email || linked?.email || '',
            job_title: s.role || '',
            app_access: s.app_access || 'dsp',
            hr_bundle: !!s.hr_bundle,
            billing_bundle: !!s.billing_bundle,
            status: s.status || 'Pending',
            user_id: linked?.id || s.user_id || null,
            has_login: !!linked,
            last_login: linked?.last_login || linked?.last_sign_in || s.activated_at || null,
            invited_by: s.invited_by || '',
            invited_at: s.invited_at || '',
            deactivated_at: s.deactivated_at || '',
            deactivation_reason: s.deactivation_reason || '',
          };
        })
        .filter(Boolean);

      return Response.json({ rows, total: rows.length });
    }

    // ─── Invite a person: creates the Pending StaffMember record ───────
    if (action === 'invite') {
      const { email, job_title, app_access, hr_bundle, billing_bundle } = body;
      if (!email || !email.includes('@')) {
        return Response.json({ error: 'A valid email is required' }, { status: 400 });
      }
      const access = normalizeAccess(app_access || 'dsp', hr_bundle, billing_bundle);
      const cleanEmail = email.trim().toLowerCase();
      const staff = (await allStaff()).find((s) => (s.email || '').toLowerCase() === cleanEmail);
      const now = new Date().toISOString();
      const nameParts = cleanEmail.split('@')[0].split(/[._-]/).filter(Boolean);
      const guessedFirst = nameParts[0] ? nameParts[0][0].toUpperCase() + nameParts[0].slice(1) : cleanEmail;

      let staffId = staff?.id;
      const inviteFields = {
        email: cleanEmail,
        role: job_title || staff?.role || 'DSP',
        ...access,
        invited_by: user.full_name || user.email,
        invited_at: now,
      };

      if (staff) {
        await svc.StaffMember.update(staff.id, inviteFields);
      } else {
        const created = await svc.StaffMember.create({
          first_name: guessedFirst,
          last_name: '',
          status: 'Pending',
          ...inviteFields,
        });
        staffId = created.id;
      }

      await base44.users.inviteUser(cleanEmail, 'user');

      // If a login already exists, mirror the chosen access onto it now.
      let mirrored = false;
      const existing = (await allUsers()).find((u) => (u.email || '').toLowerCase() === cleanEmail);
      if (existing && !existing.is_super_admin) {
        const result = await applyStaffAccess(base44, {
          staffId,
          app_access: access.app_access,
          hr_bundle: access.hr_bundle,
          billing_bundle: access.billing_bundle,
          status: staff?.status === 'Active' ? 'Active' : 'Pending',
          action: 'set_access',
          actor: user,
        });
        mirrored = result.mirrored;
      }

      await svc.AuditLog.create({
        action: 'staff_invited',
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        actor_email: user.email,
        target_type: 'StaffMember',
        target_id: staffId,
        target_name: cleanEmail,
        details: JSON.stringify({ app_access: access.app_access, job_title: inviteFields.role, mirrored_to_user: mirrored }),
        timestamp: now,
      });

      return Response.json({ success: true, email: cleanEmail, staffId, mirrored });
    }

    // ─── Resend a pending invite ──────────────────────────────────────
    if (action === 'resend_invite') {
      const staff = await findStaff(body.staffId);
      if (!staff) return Response.json({ error: 'Person not found' }, { status: 404 });
      if (staff.status !== 'Pending' || staff.user_id) {
        return Response.json({ error: 'Only a pending invite can be resent' }, { status: 400 });
      }
      await base44.users.inviteUser((staff.email || '').toLowerCase(), 'user');
      const now = new Date().toISOString();
      await svc.StaffMember.update(staff.id, {
        invited_at: now,
        invited_by: user.full_name || user.email,
      });
      await svc.AuditLog.create({
        action: 'staff_invite_resent',
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        actor_email: user.email,
        target_type: 'StaffMember',
        target_id: staff.id,
        target_name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email,
        timestamp: now,
      });
      return Response.json({ success: true });
    }

    // ─── Change access (delegates to the single writer) ───────────────
    if (action === 'update' || action === 'set_access') {
      const result = await applyStaffAccess(base44, {
        staffId: body.staffId,
        app_access: body.app_access,
        hr_bundle: body.hr_bundle,
        billing_bundle: body.billing_bundle,
        action: 'set_access',
        actor: user,
      });
      return Response.json({ success: true, ...result });
    }

    // ─── Deactivate / reactivate (never delete) ───────────────────────
    if (action === 'set_deactivated' || action === 'deactivate' || action === 'reactivate') {
      const deactivate = action === 'deactivate' || body.deactivated === true;
      const result = await applyStaffAccess(base44, {
        staffId: body.staffId,
        action: deactivate ? 'deactivate' : 'reactivate',
        reason: body.reason,
        actor: user,
      });
      return Response.json({ success: true, ...result });
    }

    // ─── Cancel a pending invite ──────────────────────────────────────
    if (action === 'cancel_invite') {
      const result = await applyStaffAccess(base44, {
        staffId: body.staffId,
        action: 'cancel_invite',
        actor: user,
      });
      return Response.json({ success: true, ...result });
    }

    // ─── Reset a password (Active people only) ────────────────────────
    if (action === 'reset_password') {
      const { email } = body;
      if (!email || !email.includes('@')) {
        return Response.json({ error: 'A valid email is required' }, { status: 400 });
      }
      await base44.auth.resetPasswordRequest(email);
      return Response.json({ success: true, message: 'Password reset email sent' });
    }

    if (action === 'delete') {
      return Response.json({ error: 'People are never deleted — deactivate them instead.' }, { status: 400 });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    const message = error.message || 'Request failed';
    const clientError = /required|Invalid|only|not found|can be cancelled|Pending/i.test(message);
    return Response.json({ error: message }, { status: clientError ? 400 : 500 });
  }
}