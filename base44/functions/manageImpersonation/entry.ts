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
    const { action } = body;

    // ─── Start Session ─────────────────────────────────────────────────
    if (action === 'loginAs') {
      const { targetUserId, reason } = body;
      if (!targetUserId) return Response.json({ error: 'targetUserId required' }, { status: 400 });
      if (!reason || !reason.trim()) return Response.json({ error: 'reason required' }, { status: 400 });

      const target = await base44.asServiceRole.entities.User.get(targetUserId);
      if (!target) return Response.json({ error: 'User not found' }, { status: 404 });
      if (target.is_super_admin) return Response.json({ error: 'Cannot impersonate another Super Admin' }, { status: 400 });

      const sessionId = crypto.randomUUID();
      const now = new Date().toISOString();

      await base44.asServiceRole.entities.AuditLog.create({
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        actor_email: user.email,
        action: 'impersonate_session_start',
        event_type: 'session_start',
        target_type: 'user',
        target_id: target.id,
        target_name: target.full_name || target.email,
        session_id: sessionId,
        reason: reason.trim(),
        session_start: now,
        details: `Super Admin ${user.email} started viewing as ${target.full_name || target.email} (role: ${target.role}). Reason: ${reason.trim()}`,
        timestamp: now,
      });

      return Response.json({
        sessionId,
        sessionStart: now,
        targetUser: {
          id: target.id,
          email: target.email,
          full_name: target.full_name,
          role: target.role,
          is_super_admin: target.is_super_admin || false,
          hr_bundle: target.hr_bundle || false,
          billing_bundle: target.billing_bundle || false,
          assigned_client_ids: target.assigned_client_ids || [],
          assigned_house_ids: target.assigned_house_ids || [],
          team_staff_ids: target.team_staff_ids || [],
          staff_member_id: target.staff_member_id || '',
        },
        originalUser: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
        },
        reason: reason.trim(),
      });
    }

    // ─── Log Page View ─────────────────────────────────────────────────
    if (action === 'logPageView') {
      const { sessionId, path, recordId, recordType, recordName } = body;
      if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });

      await base44.asServiceRole.entities.AuditLog.create({
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        actor_email: user.email,
        action: 'impersonate_page_view',
        event_type: 'page_view',
        session_id: sessionId,
        viewed_path: path || '',
        viewed_record_id: recordId || '',
        viewed_record_type: recordType || '',
        viewed_record_name: recordName || '',
        details: `Viewed ${path}${recordName ? ' — ' + recordName : ''}`,
        timestamp: new Date().toISOString(),
      });

      return Response.json({ success: true });
    }

    // ─── End Session ───────────────────────────────────────────────────
    if (action === 'endSession') {
      const { sessionId, targetUserId, timedOut } = body;
      const now = new Date().toISOString();

      await base44.asServiceRole.entities.AuditLog.create({
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        actor_email: user.email,
        action: 'impersonate_session_end',
        event_type: 'session_end',
        target_type: 'user',
        target_id: targetUserId || '',
        session_id: sessionId || '',
        session_end: now,
        details: `Super Admin ${user.email} ended viewing session${timedOut ? ' (auto-timed out after 30 minutes)' : ''}`,
        timestamp: now,
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}