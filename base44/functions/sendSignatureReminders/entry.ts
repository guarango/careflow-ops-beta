import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Called by a scheduled workflow daily.
// Finds SignatureRequests that are Sent/Viewed and overdue or approaching due date,
// sends reminder notifications to the recipient staff member.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Get all active signature requests (not signed, not voided)
    const sentPage = await base44.asServiceRole.entities.SignatureRequest.filter({
      status: { $in: ['Sent', 'Viewed'] },
    }, { limit: 500 }).catch(() => ({ items: [] }));
    const requests = sentPage?.items || [];

    if (requests.length === 0) {
      return Response.json({ success: true, checkedAt: now.toISOString(), remindersSent: 0 });
    }

    // Get staff records for user_id resolution
    const staffIds = [...new Set(requests.map(r => r.staff_id).filter(Boolean))];
    const staffPage = staffIds.length > 0
      ? await base44.asServiceRole.entities.StaffMember.filter({ id: { $in: staffIds } }, { limit: 500 }).catch(() => ({ items: [] }))
      : { items: [] };
    const staffList = staffPage?.items || [];
    const staffMap = {};
    for (const s of staffList) {
      staffMap[s.id] = s;
    }

    let remindersSent = 0;

    for (const request of requests) {
      if (!request.due_date) continue;

      const dueDate = new Date(request.due_date + 'T23:59:59');
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Send reminders: 3 days before, 1 day before, and overdue
      const shouldRemind = daysUntilDue <= 3;
      if (!shouldRemind) continue;

      const staff = staffMap[request.staff_id];
      if (!staff || !staff.user_id) continue;

      // Check if we already sent a reminder today (dedupe by last_reminder_at date)
      if (request.last_reminder_at) {
        const lastReminder = new Date(request.last_reminder_at);
        if (lastReminder.toDateString() === now.toDateString()) continue;
      }

      const isOverdue = daysUntilDue < 0;
      const message = isOverdue
        ? `OVERDUE: Your signature is required for "${request.template_name}". It was due ${request.due_date}.`
        : `Reminder: "${request.template_name}" is due in ${daysUntilDue} day(s) (${request.due_date}). Please sign soon.`;

      await base44.asServiceRole.entities.AppNotification.create({
        type: 'timecard_reminder',
        recipient_user_id: staff.user_id,
        recipient_email: staff.email || '',
        recipient_role: 'staff',
        staff_id: request.staff_id,
        staff_name: request.staff_name,
        related_record_id: request.id,
        related_record_type: 'timecard',
        message,
        trigger_stage: isOverdue ? 'forgot_clockout_1hr' : 'forgot_clockout_15min',
        status: 'unread',
        email_sent: false,
      }).catch(() => {});

      // Update reminder count and timestamp
      await base44.asServiceRole.entities.SignatureRequest.update(request.id, {
        reminder_count: (request.reminder_count || 0) + 1,
        last_reminder_at: now.toISOString(),
      }).catch(() => {});

      // If overdue, also update status to Overdue
      if (isOverdue && request.status !== 'Overdue') {
        await base44.asServiceRole.entities.SignatureRequest.update(request.id, {
          status: 'Overdue',
        }).catch(() => {});
      }

      remindersSent++;
    }

    return Response.json({
      success: true,
      checkedAt: now.toISOString(),
      remindersSent,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}