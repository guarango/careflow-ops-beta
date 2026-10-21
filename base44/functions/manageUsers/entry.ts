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
      const { email, role, hrBundle, billingBundle } = body;
      if (!email || !email.includes('@')) {
        return Response.json({ error: 'Valid email is required' }, { status: 400 });
      }
      if (!['dsp', 'manager', 'admin'].includes(role)) {
        return Response.json({ error: 'Invalid role' }, { status: 400 });
      }

      // Invite via platform (admin → admin, manager/dsp → user)
      const platformRole = role === 'admin' ? 'admin' : 'user';
      await base44.users.inviteUser(email, platformRole);

      // Find the newly invited user and set their role + bundles
      const found = await base44.asServiceRole.entities.User.filter({ email });
      const target = Array.isArray(found) ? found[0] : (found?.items?.[0]);
      if (target) {
        const updateData = { role };
        if (role === 'admin') {
          updateData.hr_bundle = !!hrBundle;
          updateData.billing_bundle = !!billingBundle;
        } else {
          updateData.hr_bundle = false;
          updateData.billing_bundle = false;
        }
        updateData.is_super_admin = false;
        await base44.asServiceRole.entities.User.update(target.id, updateData);
      }

      return Response.json({ success: true, email, role });
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