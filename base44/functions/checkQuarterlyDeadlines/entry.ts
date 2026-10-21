import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called daily by a scheduled workflow.
// Checks quarterly summaries for deadline compliance:
//   - 7 days before due date → remind the Manager
//   - 2 days before due date → remind the Manager (urgent)
//   - Past due date → escalate to Admin, mark status Overdue
//
// Also checks for unsigned quarterly summaries that are past due.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Fetch all quarterly summaries that are not yet sent to SC
    const allSummaries = await base44.asServiceRole.entities.QuarterlySummary.list('-due_date', 500);

    const pending = allSummaries.filter(s =>
      s.status !== 'Sent to SC' && s.status !== 'Signed' || s.status === 'Signed'
    );
    // We care about: Draft, Pending Review, Signed (not yet sent), Overdue
    const active = allSummaries.filter(s =>
      s.status === 'Draft' || s.status === 'Pending Review' || s.status === 'Signed' || s.status === 'Overdue'
    );

    // Fetch managers and admins
    const allUsers = await base44.asServiceRole.entities.User.list().catch(() => []);
    const managers = allUsers.filter(u => u.role === 'manager' || u.role === 'admin');
    const admins = allUsers.filter(u => u.role === 'admin');

    let reminders7Day = 0;
    let reminders2Day = 0;
    let escalations = 0;
    let overdueMarked = 0;

    for (const summary of active) {
      const dueDate = new Date(summary.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // 7-day reminder
      if (daysUntilDue <= 7 && daysUntilDue > 2 && !summary.reminder_7day_sent) {
        for (const mgr of managers) {
          const message = `Quarterly Summary for ${summary.client_name} (${summary.quarter}) is due in ${daysUntilDue} days (${summary.due_date}).`;

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: mgr.email,
            subject: `[Reminder] Careflow – Quarterly Summary Due in ${daysUntilDue} Days`,
            body: buildEmailBody(message, `/summaries/quarterly/${summary.id}`),
          }).catch(() => {});

          await base44.asServiceRole.entities.AppNotification.create({
            type: 'timecard_reminder',
            recipient_user_id: mgr.id,
            recipient_email: mgr.email,
            recipient_role: 'admin',
            client_id: summary.client_id,
            client_name: summary.client_name,
            message,
            trigger_stage: 'goal_clock_out',
            status: 'unread',
            email_sent: true,
          });
        }
        await base44.asServiceRole.entities.QuarterlySummary.update(summary.id, {
          reminder_7day_sent: true,
        });
        reminders7Day++;
      }

      // 2-day reminder
      if (daysUntilDue <= 2 && daysUntilDue > 0 && !summary.reminder_2day_sent) {
        for (const mgr of managers) {
          const message = `URGENT: Quarterly Summary for ${summary.client_name} (${summary.quarter}) is due in ${daysUntilDue} day(s) (${summary.due_date}).`;

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: mgr.email,
            subject: `[URGENT] Careflow – Quarterly Summary Due in ${daysUntilDue} Day(s)`,
            body: buildEmailBody(message, `/summaries/quarterly/${summary.id}`, true),
          }).catch(() => {});

          await base44.asServiceRole.entities.AppNotification.create({
            type: 'timecard_escalation',
            recipient_user_id: mgr.id,
            recipient_email: mgr.email,
            recipient_role: 'admin',
            client_id: summary.client_id,
            client_name: summary.client_name,
            message,
            trigger_stage: 'goal_escalation',
            status: 'unread',
            email_sent: true,
          });
        }
        await base44.asServiceRole.entities.QuarterlySummary.update(summary.id, {
          reminder_2day_sent: true,
        });
        reminders2Day++;
      }

      // Past due — escalate to Admin
      if (daysUntilDue <= 0 && summary.status !== 'Sent to SC' && !summary.escalated_to_admin) {
        // Mark as overdue if still in draft/review
        if (summary.status === 'Draft' || summary.status === 'Pending Review') {
          await base44.asServiceRole.entities.QuarterlySummary.update(summary.id, {
            status: 'Overdue',
            escalated_to_admin: true,
            escalated_at: now.toISOString(),
          });
          overdueMarked++;
        } else {
          await base44.asServiceRole.entities.QuarterlySummary.update(summary.id, {
            escalated_to_admin: true,
            escalated_at: now.toISOString(),
          });
        }

        for (const admin of admins) {
          const message = `OVERDUE: Quarterly Summary for ${summary.client_name} (${summary.quarter}) was due ${summary.due_date} and has not been sent to the Support Coordinator.`;

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: `[ESCALATION] Careflow – Overdue Quarterly Summary`,
            body: buildEmailBody(message, `/summaries/quarterly/${summary.id}`, true),
          }).catch(() => {});

          await base44.asServiceRole.entities.AppNotification.create({
            type: 'timecard_escalation',
            recipient_user_id: admin.id,
            recipient_email: admin.email,
            recipient_role: 'admin',
            client_id: summary.client_id,
            client_name: summary.client_name,
            message,
            trigger_stage: 'goal_escalation',
            status: 'unread',
            email_sent: true,
          });
        }
        escalations++;
      }
    }

    return Response.json({
      success: true,
      checkedAt: now.toISOString(),
      total_checked: active.length,
      reminders_7day: reminders7Day,
      reminders_2day: reminders2Day,
      escalations,
      overdue_marked: overdueMarked,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildEmailBody(message, deepLink, isUrgent) {
  const bannerColor = isUrgent ? '#dc2626' : '#0e7490';
  const bannerText = isUrgent ? 'Urgent' : 'Careflow Notification';
  return `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
  <div style="background: ${bannerColor}; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">${bannerText}</h1>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
    <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-top: 0;">${message}</p>
    <a href="https://careflow-ops-beta.base44.app${deepLink}" style="display: inline-block; margin-top: 16px; background: #0e7490; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;">View in Careflow →</a>
  </div>
</div>`;
}