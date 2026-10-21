import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.is_super_admin) {
      return Response.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { action, targetUserId } = body;

    // ─── Start Login As ──────────────────────────────────────────────
    if (action === 'loginAs') {
      if (!targetUserId) return Response.json({ error: 'targetUserId required' }, { status: 400 });

      const target = await base44.asServiceRole.entities.User.get(targetUserId);
      if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        actor_email: user.email,
        action: 'login_as',
        target_type: 'user',
        target_id: target.id,
        target_name: target.full_name || target.email,
        details: `Super Admin ${user.email} initiated Login As for ${target.full_name || target.email} (role: ${target.role})`,
        timestamp: new Date().toISOString(),
      });

      return Response.json({
        targetUser: {
          id: target.id,
          email: target.email,
          full_name: target.full_name,
          role: target.role,
          is_super_admin: target.is_super_admin || false,
          hr_bundle: target.hr_bundle || false,
          billing_bundle: target.billing_bundle || false,
        },
        originalUser: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
        },
      });
    }

    // ─── End Login As ────────────────────────────────────────────────
    if (action === 'returnToSelf') {
      await base44.asServiceRole.entities.AuditLog.create({
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        actor_email: user.email,
        action: 'login_as_end',
        target_type: 'user',
        target_id: targetUserId || '',
        details: `Super Admin ${user.email} ended Login As session`,
        timestamp: new Date().toISOString(),
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}