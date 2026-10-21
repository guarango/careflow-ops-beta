import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    // ─── List all users ───────────────────────────────────────────────
    if (action === 'list') {
      const users = await base44.asServiceRole.entities.User.list();
      return Response.json({ users });
    }

    // ─── Invite a new user ───────────────────────────────────────────
    if (action === 'invite') {
      const { email, role, hrBundle, billingBundle, staffMemberId, assignedClientIds, assignedHouseIds, teamStaffIds } = body;
      if (!email || !email.includes('@')) {
        return Response.json({ error: 'Valid email is required' }, { status: 400 });
      }
      if (!['dsp', 'manager', 'admin'].includes(role)) {
        return Response.json({ error: 'Invalid role' }, { status: 400 });
      }

      // Invite via platform (admin → admin, manager/dsp → user)
      const platformRole = role === 'admin' ? 'admin' : 'user';
      await base44.users.inviteUser(email, platformRole);

      // Find the newly invited user (retry up to 5 times — the record may not be
      // immediately queryable after inviteUser returns)
      let target = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const found = await base44.asServiceRole.entities.User.filter({ email });
        const items = Array.isArray(found) ? found : (found?.items || []);
        if (items.length > 0) { target = items[0]; break; }
        await new Promise(r => setTimeout(r, 500));
      }

      if (target) {
        const updateData = { role, is_super_admin: false };
        if (role === 'admin') {
          updateData.hr_bundle = !!hrBundle;
          updateData.billing_bundle = !!billingBundle;
        } else {
          updateData.hr_bundle = false;
          updateData.billing_bundle = false;
        }
        if (staffMemberId) updateData.staff_member_id = staffMemberId;
        if (assignedClientIds) updateData.assigned_client_ids = assignedClientIds;
        if (assignedHouseIds) updateData.assigned_house_ids = assignedHouseIds;
        if (teamStaffIds) updateData.team_staff_ids = teamStaffIds;
        await base44.asServiceRole.entities.User.update(target.id, updateData);
        return Response.json({ success: true, email, role, userId: target.id, updated: true });
      }

      // User record not found yet — invite was sent but role couldn't be set
      return Response.json({ success: true, email, role, updated: false, warning: 'Role update pending — user record not yet queryable' });
    }

    // ─── Update an existing user's role/bundles ──────────────────────
    if (action === 'update') {
      const { userId, role, hrBundle, billingBundle, isSuperAdmin } = body;

      // Only existing super_admins can grant super_admin
      if (isSuperAdmin && !user.is_super_admin) {
        return Response.json({ error: 'Only Super Admins can grant Super Admin access' }, { status: 403 });
      }

      const updateData = {
        is_super_admin: !!isSuperAdmin,
      };

      if (isSuperAdmin) {
        updateData.role = 'admin';
        updateData.hr_bundle = false;
        updateData.billing_bundle = false;
      } else if (['dsp', 'manager', 'admin'].includes(role)) {
        updateData.role = role;
        if (role === 'admin') {
          updateData.hr_bundle = !!hrBundle;
          updateData.billing_bundle = !!billingBundle;
        } else {
          updateData.hr_bundle = false;
          updateData.billing_bundle = false;
        }
      }

      await base44.asServiceRole.entities.User.update(userId, updateData);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}