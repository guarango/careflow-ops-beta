/**
 * staffAccess — the single place app access is written.
 *
 * Only setStaffAccess (and manageUsers, which delegates to this module) may write
 * app access, and every write mirrors onto the linked User login in the same call:
 * role, hr_bundle, billing_bundle, is_deactivated.
 */

export const APP_ACCESS = ['dsp', 'manager', 'admin'];
export const STAFF_STATUS = ['Pending', 'Active', 'Inactive'];

/** Bundles only exist for admins; any other access level drops them. */
export function normalizeAccess(appAccess, hrBundle, billingBundle) {
  const access = APP_ACCESS.includes(appAccess) ? appAccess : 'dsp';
  const isAdmin = access === 'admin';
  return {
    app_access: access,
    hr_bundle: isAdmin ? !!hrBundle : false,
    billing_bundle: isAdmin ? !!billingBundle : false,
  };
}

function actorInfo(actor) {
  return {
    actor_id: actor?.id || '',
    actor_name: actor?.full_name || actor?.email || 'Unknown',
    actor_email: actor?.email || '',
  };
}

async function findUser(base44, staff) {
  const svc = base44.asServiceRole.entities;
  if (staff.user_id) {
    const byId = await svc.User.get(staff.user_id).catch(() => null);
    if (byId) return byId;
  }
  if (!staff.email) return null;
  const found = await svc.User.filter({ email: staff.email.toLowerCase() });
  const items = Array.isArray(found) ? found : (found?.items || []);
  return items[0] || null;
}

/**
 * Applies an access change to a StaffMember and mirrors it onto the linked login.
 *
 * opts: { staffId, app_access, hr_bundle, billing_bundle, status, reason, action, actor }
 * action: 'set_access' (default) | 'deactivate' | 'reactivate' | 'activate' | 'cancel_invite'
 */
export async function applyStaffAccess(base44, opts) {
  const svc = base44.asServiceRole.entities;
  const { staffId, reason } = opts;
  if (!staffId) throw new Error('staffId is required');

  const staff = await svc.StaffMember.get(staffId).catch(() => null);
  if (!staff) throw new Error('Staff member not found');

  const action = opts.action || 'set_access';
  const now = new Date().toISOString();
  const actor = actorInfo(opts.actor);

  // Cancel invite — the only removal that is allowed, and only for someone who never signed in.
  if (action === 'cancel_invite') {
    if (staff.status !== 'Pending' || staff.user_id) {
      throw new Error('Only a pending invite that was never accepted can be cancelled');
    }
    // A cancelled invite takes its unsigned e-signature requests with it.
    const requestsRaw = await svc.SignatureRequest.filter({ staff_id: staffId });
    const requests = Array.isArray(requestsRaw) ? requestsRaw : (requestsRaw?.items || []);
    const unsigned = requests.filter((r) => r.status !== 'Signed');
    for (const request of unsigned) {
      await svc.SignatureRequest.delete(request.id);
    }

    await svc.StaffMember.delete(staffId);
    await svc.AuditLog.create({
      ...actor,
      action: 'staff_invite_cancelled',
      target_type: 'StaffMember',
      target_id: staffId,
      target_name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email,
      details: JSON.stringify({ email: staff.email, status: staff.status, app_access: staff.app_access || 'dsp' }),
      timestamp: now,
    });
    return { cancelled: true, staffId };
  }

  const old = {
    app_access: staff.app_access || 'dsp',
    hr_bundle: !!staff.hr_bundle,
    billing_bundle: !!staff.billing_bundle,
    status: staff.status || 'Pending',
  };

  if (action === 'deactivate' && !(reason || '').trim()) {
    throw new Error('A reason is required to deactivate someone');
  }

  const targetAccess = opts.app_access || old.app_access;
  const access = normalizeAccess(
    targetAccess,
    opts.hr_bundle === undefined ? old.hr_bundle : opts.hr_bundle,
    opts.billing_bundle === undefined ? old.billing_bundle : opts.billing_bundle
  );

  let status = opts.status || old.status;
  if (action === 'deactivate') status = 'Inactive';
  if (action === 'reactivate' || action === 'activate') status = 'Active';
  if (!STAFF_STATUS.includes(status)) throw new Error('Invalid status');

  const staffUpdate = {
    app_access: access.app_access,
    hr_bundle: access.hr_bundle,
    billing_bundle: access.billing_bundle,
    status,
  };

  if (status === 'Inactive') {
    staffUpdate.deactivated_at = now;
    staffUpdate.deactivated_by = actor.actor_name;
    staffUpdate.deactivation_reason = (reason || '').trim();
  }
  if (status === 'Active') {
    staffUpdate.activated_at = staff.activated_at || now;
    staffUpdate.deactivated_at = '';
    staffUpdate.deactivated_by = '';
    staffUpdate.deactivation_reason = '';
  }

  await svc.StaffMember.update(staffId, staffUpdate);

  // Mirror onto the login (never the Super Admin account, never a role/bundle rewrite here).
  const user = await findUser(base44, staff);
  let mirrored = false;
  let userUpdate = null;
  if (user && !user.is_super_admin) {
    userUpdate = {
      role: access.app_access,
      hr_bundle: access.hr_bundle,
      billing_bundle: access.billing_bundle,
      is_deactivated: status === 'Inactive',
      staff_member_id: staffId,
    };
    if ((user.email || '').toLowerCase() !== (staff.email || '').toLowerCase()) {
      // keep the login bound to this staff record only
    }
    await svc.User.update(user.id, userUpdate);
    mirrored = true;
  }

  const label = (a) =>
    `${a.app_access}${a.hr_bundle ? ' +HR' : ''}${a.billing_bundle ? ' +Billing' : ''} (${a.status})`;

  await svc.AuditLog.create({
    ...actor,
    action: action === 'set_access' ? 'staff_access_changed' : `staff_${action}`,
    target_type: 'StaffMember',
    target_id: staffId,
    target_name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email,
    field: action === 'set_access' ? 'Access & bundles' : 'Status',
    old_value: label(old),
    new_value: label({
      app_access: access.app_access,
      hr_bundle: access.hr_bundle,
      billing_bundle: access.billing_bundle,
      status,
    }),
    reason: (reason || '').trim(),
    details: JSON.stringify({
      old,
      new: {
        app_access: access.app_access,
        hr_bundle: access.hr_bundle,
        billing_bundle: access.billing_bundle,
        status,
      },
      reason: (reason || '').trim() || undefined,
      mirrored_to_user: mirrored,
    }),
    timestamp: now,
  });

  return {
    staffId,
    old,
    new: staffUpdate,
    mirrored,
    user_id: user?.id || null,
  };
}

/** Sets the app-access defaults for a brand-new staff record (never a role rewrite). */
export function defaultAccess(jobTitle, appAccess) {
  const access = APP_ACCESS.includes(appAccess) ? appAccess : 'dsp';
  return { app_access: access, ...normalizeAccess(access, false, false) };
}