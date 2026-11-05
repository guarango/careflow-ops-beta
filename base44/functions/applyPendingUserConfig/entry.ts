import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getCaller, unauthorized, forbidden } from '../../shared/functionAuth.ts';
import { applyStaffAccess } from '../../shared/staffAccess.ts';

/**
 * applyPendingUserConfig — now runs on the StaffMember itself.
 *
 * Called by the "Apply Pending User Config" workflow when someone signs up or logs in.
 * There is no separate pending table any more: the pending person IS the StaffMember
 * with status Pending. Signing in links the login to that record, flips it to Active,
 * and mirrors its app access onto the User login (through applyStaffAccess).
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;

    const caller = await getCaller(base44);
    if (!caller) return unauthorized();

    const body = await req.json().catch(() => ({}));
    const email = (body.email || caller.email || '').toLowerCase();
    if (!email) return Response.json({ error: 'email is required' }, { status: 400 });

    // A regular caller may only activate their own record; an admin may do it for that email.
    if (caller.role !== 'admin' && (caller.email || '').toLowerCase() !== email) {
      return forbidden();
    }

    const staffRes = await svc.StaffMember.filter({ email });
    const staff = (Array.isArray(staffRes) ? staffRes : (staffRes?.items || []))[0];
    if (!staff) return Response.json({ applied: false, reason: 'no staff record for this email' });

    const userRes = await svc.User.filter({ email });
    const targetUser = (Array.isArray(userRes) ? userRes : (userRes?.items || []))[0];
    if (!targetUser) return Response.json({ applied: false, reason: 'user account not found' });
    if (targetUser.is_super_admin) {
      return Response.json({ applied: false, reason: 'the super admin account is never managed from a staff record' });
    }

    const alreadyLinked = staff.user_id === targetUser.id;

    // Bind the login to the person, then activate (or keep inactive) through the single writer.
    await svc.StaffMember.update(staff.id, { user_id: targetUser.id });

    const result = await applyStaffAccess(base44, {
      staffId: staff.id,
      app_access: staff.app_access || 'dsp',
      hr_bundle: !!staff.hr_bundle,
      billing_bundle: !!staff.billing_bundle,
      status: staff.status === 'Inactive' ? 'Inactive' : 'Active',
      action: staff.status === 'Inactive' ? 'set_access' : 'activate',
      actor: { full_name: 'System (sign-in)', email: '' },
    });

    return Response.json({
      applied: true,
      email,
      staff_id: staff.id,
      user_id: targetUser.id,
      status: result.new.status,
      first_sign_in: !alreadyLinked,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}