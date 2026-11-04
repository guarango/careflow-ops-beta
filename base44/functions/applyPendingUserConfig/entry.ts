import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getCaller, unauthorized, forbidden } from '../../shared/functionAuth.ts';

/**
 * applyPendingUserConfig
 *
 * Called by the "Apply Pending User Config" workflow when a user signs up
 * or logs in. Checks for a PendingUserConfig matching the user's email and
 * applies the stored role, bundles, and assignment fields to the User record.
 *
 * This solves the race condition where inviteUser() doesn't create a User
 * record synchronously — the config is stored at invite time and applied
 * once the user actually accepts and the User record exists.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const caller = await getCaller(base44);
    if (!caller) return unauthorized();

    const body = await req.json().catch(() => ({}));
    const { email } = body;
    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 });
    }

    // Bind the request to the account it is for: a regular caller may only apply
    // their own invite config; an admin (invite workflow) may apply for that email.
    if (caller.role !== 'admin' && (caller.email || '').toLowerCase() !== email.toLowerCase()) {
      return forbidden();
    }

    // Find an unapplied PendingUserConfig for this email
    const configRes = await base44.asServiceRole.entities.PendingUserConfig.filter({
      email: email.toLowerCase(),
      applied: false,
    });
    const configs = Array.isArray(configRes) ? configRes : (configRes?.items || []);
    const config = configs[0];

    if (!config) {
      return Response.json({ applied: false, reason: 'no pending config' });
    }

    // Build the update payload
    const updateData = {
      role: config.role,
      is_super_admin: false,
    };

    if (config.role === 'admin') {
      updateData.hr_bundle = !!config.hr_bundle;
      updateData.billing_bundle = !!config.billing_bundle;
    } else {
      updateData.hr_bundle = false;
      updateData.billing_bundle = false;
    }

    if (config.staff_member_id) updateData.staff_member_id = config.staff_member_id;
    if (config.assigned_client_ids) updateData.assigned_client_ids = config.assigned_client_ids;
    if (config.assigned_house_ids) updateData.assigned_house_ids = config.assigned_house_ids;
    if (config.team_staff_ids) updateData.team_staff_ids = config.team_staff_ids;

    // Resolve the target account from the config's own email — never from a caller-supplied id
    const userRes = await base44.asServiceRole.entities.User.filter({ email: config.email });
    const matchedUsers = Array.isArray(userRes) ? userRes : (userRes?.items || []);
    const targetUser = matchedUsers[0];
    if (!targetUser) {
      return Response.json({ applied: false, reason: 'user account not found' });
    }

    // Apply to the User record
    await base44.asServiceRole.entities.User.update(targetUser.id, updateData);

    // Mark the config as applied (prevents replay)
    await base44.asServiceRole.entities.PendingUserConfig.update(config.id, {
      applied: true,
      applied_user_id: targetUser.id,
      applied_at: new Date().toISOString(),
    });

    return Response.json({
      applied: true,
      email,
      role: config.role,
      user_id: targetUser.id,
      config_id: config.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}