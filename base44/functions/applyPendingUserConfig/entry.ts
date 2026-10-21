import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

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

    const body = await req.json();
    const { user_id, email } = body;
    if (!user_id || !email) {
      return Response.json({ error: 'user_id and email are required' }, { status: 400 });
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

    // Apply to the User record
    await base44.asServiceRole.entities.User.update(user_id, updateData);

    // Mark the config as applied
    await base44.asServiceRole.entities.PendingUserConfig.update(config.id, {
      applied: true,
      applied_user_id: user_id,
      applied_at: new Date().toISOString(),
    });

    return Response.json({
      applied: true,
      email,
      role: config.role,
      user_id,
      config_id: config.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}