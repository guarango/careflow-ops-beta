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
            has_login: !!linked || !!s.user_id,
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

    // ─── Invite: one call saves the Pending record, sends the invite,
    //     creates the signature requests and audit-logs it ───────────────
    if (action === 'invite') {
      const {
        first_name, last_name, email, phone, job_title, app_access,
        hr_bundle, billing_bundle, client_ids, house_ids, signature_template_ids, reactivate,
      } = body;

      const missing = [];
      if (!String(first_name || '').trim()) missing.push('First name');
      if (!String(last_name || '').trim()) missing.push('Last name');
      if (!email || !String(email).includes('@')) missing.push('Email');
      if (!String(phone || '').trim()) missing.push('Phone');
      if (!job_title) missing.push('Job title');
      if (!app_access) missing.push('App access');
      if (missing.length) {
        return Response.json({ error: `Missing: ${missing.join(', ')}` }, { status: 400 });
      }

      const access = normalizeAccess(app_access, hr_bundle, billing_bundle);
      const cleanEmail = String(email).trim().toLowerCase();
      const now = new Date().toISOString();
      const existing = (await allStaff()).find((s) => (s.email || '').toLowerCase() === cleanEmail);

      if (existing && !reactivate) {
        if (existing.status === 'Inactive') {
          return Response.json(
            { error: 'This person was deactivated — reactivate them instead.', needs_reactivate: true },
            { status: 409 }
          );
        }
        return Response.json({ error: 'This person already has an account.' }, { status: 409 });
      }

      const profile = {
        first_name: String(first_name).trim(),
        last_name: String(last_name).trim(),
        email: cleanEmail,
        phone: String(phone).trim(),
        role: job_title,
        ...access,
        // Admins see the whole agency; assignments only apply to DSPs and Managers.
        assigned_client_ids: access.app_access === 'admin' ? (existing?.assigned_client_ids || []) : (client_ids || []),
        assigned_house_ids: access.app_access === 'admin' ? (existing?.assigned_house_ids || []) : (house_ids || []),
      };

      let staffId;
      let reactivated = false;
      if (existing) {
        await svc.StaffMember.update(existing.id, profile);
        staffId = existing.id;
        if (existing.status === 'Inactive') {
          // Restore access through the single writer (never a direct role write).
          await applyStaffAccess(base44, {
            staffId,
            app_access: access.app_access,
            hr_bundle: access.hr_bundle,
            billing_bundle: access.billing_bundle,
            action: 'reactivate',
            actor: user,
          });
          reactivated = true;
        }
      } else {
        const created = await svc.StaffMember.create({
          ...profile,
          status: 'Pending',
          invited_by: user.full_name || user.email,
          invited_at: now,
        });
        staffId = created.id;
      }

      // Platform role is always "user" — app access lives on the staff record.
      const foundUserRaw = await svc.User.filter({ email: cleanEmail }).catch(() => null);
      const existingUser = (Array.isArray(foundUserRaw) ? foundUserRaw : (foundUserRaw?.items || []))[0] || null;
      let inviteSent = false;
      let inviteError = '';
      if (!existingUser) {
        try {
          await base44.users.inviteUser(cleanEmail, 'user');
          inviteSent = true;
        } catch (err) {
          // The record is already saved — report the email problem, don't lose the invite.
          inviteError = err.message || 'invite email failed';
        }
      }

      // E-signature documents picked at invite time
      const templateIds = Array.isArray(signature_template_ids) ? signature_template_ids : [];
      let signaturesCreated = 0;
      if (templateIds.length) {
        const templatesRaw = await svc.SignatureTemplate.filter({ id: { $in: templateIds } });
        const templates = Array.isArray(templatesRaw) ? templatesRaw : (templatesRaw?.items || []);
        if (templates.length) {
          const staffName = `${profile.first_name} ${profile.last_name}`.trim();
          await svc.SignatureRequest.bulkCreate(
            templates.map((t) => ({
              template_id: t.id,
              template_name: t.name,
              staff_id: staffId,
              staff_name: staffName,
              staff_email: cleanEmail,
              staff_role: profile.role,
              sent_by: user.id,
              sent_by_name: user.full_name || user.email,
              sent_at: now,
              status: 'Sent',
            }))
          );
          signaturesCreated = templates.length;
        }
      }

      await svc.AuditLog.create({
        action: 'User invited',
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        actor_email: user.email,
        target_type: 'StaffMember',
        target_id: staffId,
        target_name: `${profile.first_name} ${profile.last_name}`.trim() || cleanEmail,
        details: JSON.stringify({
          email: cleanEmail,
          job_title,
          app_access: access.app_access,
          hr_bundle: access.hr_bundle,
          billing_bundle: access.billing_bundle,
          clients: (client_ids || []).length,
          houses: (house_ids || []).length,
          signatures: signaturesCreated,
          invite_sent: inviteSent,
          reactivated,
        }),
        timestamp: now,
      });

      return Response.json({
        success: true,
        staffId,
        email: cleanEmail,
        inviteSent,
        inviteError: inviteError || undefined,
        signaturesCreated,
        reactivated,
      });
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
      const resetUserPage = await svc.User.filter({ email: email.toLowerCase() }).catch(() => null);
      const resetUser = resetUserPage?.items?.[0] || resetUserPage?.[0] || null;
      await svc.AuditLog.create({
        action: 'password_reset_sent',
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        actor_email: user.email,
        actor_role: user.role || '',
        target_type: 'User',
        target_id: resetUser?.id || '',
        target_name: email,
        field: 'Password',
        details: `Password reset email sent to ${email} by ${user.email}`,
        timestamp: new Date().toISOString(),
      });
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