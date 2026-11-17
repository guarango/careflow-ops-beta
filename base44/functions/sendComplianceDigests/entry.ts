import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireAdmin } from '../../shared/functionAuth.ts';
import { buildComplianceDeadlines, digestItems, lateItems, localTodayISO } from '../../shared/complianceDeadlines.ts';

// Runs daily at 7am via a scheduled workflow.
//  · Manager: daily digest of items due within 7 days or late.
//  · Admin: weekly digest (Mondays) plus an immediate alert for anything newly Late.
//  · DSP: push + in-app alert when one of their notes is returned.
// Every send is written to the audit log. Messages carry no client names.

async function notify(base44, payload) {
  return await base44.asServiceRole.entities.AppNotification.create(payload);
}

function emailBody(lines: string[]) {
  return `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <div style="background: #0b81b7; padding: 20px 24px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #000000; margin: 0; font-size: 20px;">CareFlow Ops · Compliance deadlines</h1>
  </div>
  <div style="background: #ffffff; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e1e5ea;">
    ${lines.map((l) => `<p style="font-size: 16px; color: #171d26; line-height: 1.6; margin: 0 0 8px;">${l}</p>`).join('')}
    <a href="https://careflow-ops-beta.base44.app/" style="display: inline-block; margin-top: 16px; background: #0b81b7; color: #000000; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;">Open the deadlines dashboard</a>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">Automated compliance digest. No client-identifying information is included.</p>
  </div>
</div>`;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) return auth.error;

    const db = base44.asServiceRole.entities;
    const today = localTodayISO();
    const isMonday = new Date(`${today}T12:00:00Z`).getUTCDay() === 1;
    const users = await db.User.list().catch(() => []);
    const managers = users.filter((u: any) => u.role === 'manager' && u.is_deactivated !== true);
    const admins = users.filter((u: any) => u.role === 'admin' && u.is_deactivated !== true);

    let digests = 0;
    let lateAlerts = 0;
    let noteAlerts = 0;

    async function alreadySent(recipientId: string, stage: string, relatedId: string) {
      const existing = await db.AppNotification.filter(
        { recipient_user_id: recipientId, trigger_stage: stage, related_record_id: relatedId },
        { limit: 1 },
      );
      return (existing?.items?.length || 0) > 0;
    }

    async function recordSend({ recipient, kind, details }) {
      await db.AuditLog.create({
        action: 'notification_sent',
        event_type: 'generic',
        actor_id: 'system',
        actor_name: 'Compliance digest',
        actor_email: '',
        actor_role: 'admin',
        target_type: 'ComplianceDigest',
        target_id: recipient.id,
        target_name: `${kind} · ${recipient.full_name || recipient.email}`,
        details,
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }

    // ── Manager daily digest ───────────────────────────────────────────────
    for (const manager of managers) {
      const deadlines = await buildComplianceDeadlines(base44, manager);
      const items = digestItems(deadlines, 7);
      if (!items.length) continue;
      const digestKey = `digest:${today}`;
      if (await alreadySent(manager.id, 'compliance_digest', digestKey)) continue;
      const late = items.filter((i: any) => i.days !== null && i.days < 0).length;
      const message = `Compliance digest: ${late} late item(s) and ${items.length - late} due within 7 days. Open the dashboard for the list.`;
      const notification = await notify(base44, {
        type: 'compliance_expiring',
        severity: late > 0 ? 'action' : 'fyi',
        recipient_user_id: manager.id,
        recipient_email: manager.email,
        recipient_role: 'admin',
        message,
        deep_link: '/',
        trigger_stage: 'compliance_digest',
        reminder_rule: 'manager_daily_digest',
        related_record_id: digestKey,
        status: 'unread',
      });
      if (manager.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: manager.email,
          subject: 'CareFlow – compliance deadlines due this week',
          body: emailBody([message]),
        }).catch(() => {});
        await db.AppNotification.update(notification.id, { email_sent: true }).catch(() => {});
      }
      await recordSend({ recipient: manager, kind: 'Manager daily digest', details: `${items.length} item(s), ${late} late` });
      digests++;
    }

    // ── Admin weekly digest + immediate Late alerts ────────────────────────
    const agencyDeadlines = await buildComplianceDeadlines(base44, { role: 'admin', id: 'system' });

    if (isMonday) {
      for (const admin of admins) {
        const items = digestItems(agencyDeadlines, 7);
        if (!items.length) continue;
        const digestKey = `weekly:${today}`;
        if (await alreadySent(admin.id, 'compliance_weekly', digestKey)) continue;
        const late = items.filter((i: any) => i.days !== null && i.days < 0).length;
        const message = `Weekly compliance digest: ${late} late item(s) and ${items.length - late} due within 7 days across the agency.`;
        const notification = await notify(base44, {
          type: 'compliance_expiring',
          severity: late > 0 ? 'action' : 'fyi',
          recipient_user_id: admin.id,
          recipient_email: admin.email,
          recipient_role: 'admin',
          message,
          deep_link: '/',
          trigger_stage: 'compliance_weekly',
          reminder_rule: 'admin_weekly_digest',
          related_record_id: digestKey,
          status: 'unread',
        });
        if (admin.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: 'CareFlow – weekly compliance digest',
            body: emailBody([message]),
          }).catch(() => {});
          await db.AppNotification.update(notification.id, { email_sent: true }).catch(() => {});
        }
        await recordSend({ recipient: admin, kind: 'Admin weekly digest', details: `${items.length} item(s), ${late} late` });
        digests++;
      }
    }

    for (const item of lateItems(agencyDeadlines)) {
      const relatedId = `late:${item.card}:${item.id}`;
      if (await alreadySent(admins[0]?.id || 'none', 'compliance_late', relatedId)) continue;
      for (const admin of admins) {
        const message = `Late: ${item.cardTitle} — ${item.group}. Record dated ${item.date || 'no date'}. Open the dashboard for details.`;
        const notification = await notify(base44, {
          type: 'compliance_missing',
          severity: 'critical',
          recipient_user_id: admin.id,
          recipient_email: admin.email,
          recipient_role: 'admin',
          message,
          deep_link: item.link || '/',
          trigger_stage: 'compliance_late',
          reminder_rule: 'admin_late_alert',
          related_record_id: relatedId,
          related_record_type: item.card === 'quarterly' ? 'quarterly_summary' : undefined,
          status: 'unread',
        });
        if (admin.email && notification?.id) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: 'CareFlow – compliance item is late',
            body: emailBody([message]),
          }).catch(() => {});
          await db.AppNotification.update(notification.id, { email_sent: true }).catch(() => {});
        }
        await recordSend({ recipient: admin, kind: 'Admin late alert', details: relatedId });
      }
      lateAlerts++;
    }

    // ── DSP push when a note is returned ───────────────────────────────────
    const returned = await db.SessionNote.filter({ status: 'Returned' }, { limit: 200 })
      .then((p: any) => p?.items || [])
      .catch(() => []);
    for (const note of returned) {
      if (!note.staff_id) continue;
      const staffUser = users.find((u: any) => u.staff_member_id === note.staff_id && u.is_deactivated !== true);
      if (!staffUser) continue;
      const relatedId = `note:${note.id}`;
      if (await alreadySent(staffUser.id, 'note_returned', relatedId)) continue;
      const message = 'One of your service notes was returned for correction. Open the note to fix it and resubmit.';
      const notification = await notify(base44, {
        type: 'note_returned',
        severity: 'action',
        recipient_user_id: staffUser.id,
        recipient_email: staffUser.email,
        recipient_role: 'staff',
        message,
        deep_link: '/session-notes',
        trigger_stage: 'note_returned',
        reminder_rule: 'note_returned_push',
        related_record_id: relatedId,
        related_record_type: 'session_note',
        status: 'unread',
        channels: ['in_app', 'push'],
      });
      await base44.asServiceRole.integrations.Core.SendPushNotification({
        user_id: staffUser.id,
        title: 'CareFlow Ops',
        content: message,
        action_label: 'Open',
        action_url: '/session-notes',
      }).catch(() => {});
      await db.AppNotification.update(notification.id, { push_sent: true }).catch(() => {});
      await recordSend({ recipient: staffUser, kind: 'Note returned', details: relatedId });
      noteAlerts++;
    }

    return Response.json({ success: true, today, digests, lateAlerts, noteAlerts });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}