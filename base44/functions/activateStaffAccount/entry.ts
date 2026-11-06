import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { applyStaffAccess } from '../../shared/staffAccess.ts';
import { syncStaffAssignments } from '../../shared/staffAssignments.ts';

/**
 * activateStaffAccount — the ONLY place a person goes from Pending to Active.
 *
 * Runs from the "Activate Staff Account" workflow on app-user SIGNUP and on every
 * LOGIN (so it also covers Google sign-in and logins for accounts that already
 * existed). Finds the StaffMember by email (case-insensitive):
 *
 *   Pending  → links the login (StaffMember.user_id + User.staff_member_id), sets
 *              Active + activated_at, copies app_access/bundles onto the login via
 *              applyStaffAccess, then syncs their assigned clients, houses and team
 *              lists before the first page loads.
 *   Active   → makes sure the link and caseload are current (safe to run every login).
 *   Inactive → stays blocked; only the link is kept.
 *   No record→ no access: AccountAccessGuard shows the no-access screen.
 *
 * Never touches the Super Admin account.
 */
function normalize(raw) {
  return Array.isArray(raw) ? raw : (raw?.items || []);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || caller.email || '').trim().toLowerCase();
    if (!email) return Response.json({ error: 'email is required' }, { status: 400 });

    // A regular caller may only activate their own record; an admin may act for that email.
    if (caller.role !== 'admin' && (caller.email || '').toLowerCase() !== email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const svc = base44.asServiceRole.entities;

    // Resolve the login from the VERIFIED email only. A client-supplied user_id would let
    // any caller rebind their staff record (and mirrored role/caseload) onto another
    // person's login, so it is never trusted.
    let user = null;
    const found = await svc.User.filter({ email }).catch(() => null);
    user = normalize(found).find((u) => (u.email || '').toLowerCase() === email) || null;
    if (!user && (caller.email || '').toLowerCase() === email) user = caller;
    if (!user) return Response.json({ applied: false, reason: 'user account not found' });
    if ((user.email || '').toLowerCase() !== email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const staffList = normalize(await svc.StaffMember.list());
    if (user.is_super_admin) {
      return Response.json({ applied: false, reason: 'super admin is never managed from a staff record' });
    }

    const staff = staffList.find((s) => (s.email || '').toLowerCase() === email) || null;
    if (!staff) {
      // No staff record → no app access (AccountAccessGuard shows the no-access screen).
      return Response.json({ applied: false, reason: 'no_staff_record', next: 'no_access' });
    }

    const systemActor = { full_name: 'System (sign-in)', email: '' };

    // Deactivated people stay blocked; keep the link, mirror the blocked state.
    if (staff.status === 'Inactive') {
      if (staff.user_id !== user.id) await svc.StaffMember.update(staff.id, { user_id: user.id });
      await applyStaffAccess(base44, {
        staffId: staff.id,
        app_access: staff.app_access || 'dsp',
        hr_bundle: !!staff.hr_bundle,
        billing_bundle: !!staff.billing_bundle,
        status: 'Inactive',
        action: 'set_access',
        actor: systemActor,
      });
      return Response.json({ applied: false, status: 'Inactive', reason: 'deactivated' });
    }

    const wasPending = staff.status !== 'Active';

    // Bind the login to the person first, so applyStaffAccess mirrors onto it.
    if (staff.user_id !== user.id) {
      await svc.StaffMember.update(staff.id, { user_id: user.id });
    }

    // The single writer sets Active + activated_at, and copies app_access/bundles
    // onto the User (role, hr_bundle, billing_bundle, staff_member_id).
    await applyStaffAccess(base44, {
      staffId: staff.id,
      app_access: staff.app_access || 'dsp',
      hr_bundle: !!staff.hr_bundle,
      billing_bundle: !!staff.billing_bundle,
      status: 'Active',
      action: wasPending ? 'activate' : 'set_access',
      actor: systemActor,
    });

    if (wasPending) {
      await svc.AuditLog.create({
        action: 'User activated',
        actor_id: user.id,
        actor_name: user.full_name || user.email || email,
        actor_email: user.email || email,
        target_type: 'StaffMember',
        target_id: staff.id,
        target_name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || email,
        details: JSON.stringify({
          email,
          app_access: staff.app_access || 'dsp',
          hr_bundle: !!staff.hr_bundle,
          billing_bundle: !!staff.billing_bundle,
          auth_method: body.auth_method || '',
        }),
        timestamp: new Date().toISOString(),
      });
    }

    // Caseload, houses and team lists must be on the User before the first page loads.
    const sync = await syncStaffAssignments(base44, [staff.id]);

    // First sign-in lands on the required onboarding wizard (StaffOnboardingGuard
    // also enforces this for logins that never passed through here).
    return Response.json({
      applied: wasPending,
      status: 'Active',
      staff_id: staff.id,
      user_id: user.id,
      sync: sync[0] || null,
      next: wasPending ? '/my-onboarding' : '/dashboard',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}