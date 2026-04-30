import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called by scheduled automation every 5 minutes
// Checks EVV clock-outs and fires goal documentation alerts

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const nowMs = now.getTime();

    // Get EVV/shift records clocked out in the last 3 hours
    const shifts = await base44.asServiceRole.entities.ShiftSchedule.filter({ status: 'Completed' });
    const goals = await base44.asServiceRole.entities.ClientGoal.filter({ status: 'Active' });
    const sessionNotes = await base44.asServiceRole.entities.SessionNote.list('-created_date', 500);
    const staff = await base44.asServiceRole.entities.StaffMember.list();
    const existingNotifs = await base44.asServiceRole.entities.AppNotification.filter({ related_record_type: 'goal' });

    const adminUsers = await base44.asServiceRole.entities.User.list().catch(() => []);
    const admins = adminUsers.filter(u => u.role === 'admin');

    const notifiedKeys = new Set(
      existingNotifs
        .filter(n => n.status !== 'dismissed')
        .map(n => `${n.related_record_id}__${n.trigger_stage}__${n.recipient_user_id}`)
    );

    for (const shift of shifts) {
      if (!shift.evv_clock_out || !shift.staff_id || !shift.client_id) continue;

      const clockOutTime = new Date(shift.evv_clock_out);
      if (isNaN(clockOutTime.getTime())) continue;

      const minutesSinceClockOut = (nowMs - clockOutTime.getTime()) / 60000;

      // Only process shifts clocked out between 0 and 180 minutes ago
      if (minutesSinceClockOut < 0 || minutesSinceClockOut > 180) continue;

      const clientGoals = goals.filter(g => g.client_id === shift.client_id);
      if (clientGoals.length === 0) continue;

      // Check which goals have session notes/data for this shift date
      const shiftDate = shift.date;
      const signedGoalIds = new Set(
        sessionNotes
          .filter(n =>
            n.client_id === shift.client_id &&
            n.staff_id === shift.staff_id &&
            n.date === shiftDate &&
            (n.status === 'Submitted' || n.status === 'Approved')
          )
          .flatMap(n => (n.goal_data || []).map(gd => gd.goal_id))
      );

      const unsignedGoals = clientGoals.filter(g => !signedGoalIds.has(g.id));
      if (unsignedGoals.length === 0) continue;

      const staffMember = staff.find(s => s.id === shift.staff_id);
      const staffName = staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Staff';
      const clientName = shift.client_name || 'Client';
      const goalNames = unsignedGoals.map(g => g.goal_title).join(', ');
      const clockOutDisplay = clockOutTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Denver' });

      // Stage 1: Immediate staff notification (0–5 min after clock-out)
      if (minutesSinceClockOut >= 0 && minutesSinceClockOut <= 5) {
        const staffKey = `${shift.id}__goal_clock_out__${shift.staff_id}`;
        if (!notifiedKeys.has(staffKey) && staffMember) {
          const message = `Incomplete Documentation: You clocked out but have unsigned goal data for ${clientName}. Please complete documentation now. After 2 hours, your supervisor will be notified. Goals: ${goalNames}`;
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: staffMember.email,
            subject: `[Action Required] Careflow – Goal Sign-Off Reminder for ${clientName}`,
            body: buildEmailBody(message, false, '/goals'),
          }).catch(() => {});
          await base44.asServiceRole.entities.AppNotification.create({
            type: 'goal_missed',
            recipient_user_id: shift.staff_id,
            recipient_email: staffMember.email,
            recipient_role: 'staff',
            client_id: shift.client_id,
            client_name: clientName,
            staff_id: shift.staff_id,
            staff_name: staffName,
            related_record_id: shift.id,
            related_record_type: 'goal',
            message,
            trigger_stage: 'goal_clock_out',
            status: 'unread',
            email_sent: true,
          });
        }
      }

      // Stage 2: Admin escalation (120+ minutes = 2 hours)
      if (minutesSinceClockOut >= 120 && minutesSinceClockOut <= 125) {
        for (const admin of admins) {
          const adminKey = `${shift.id}__goal_escalation__${admin.id}`;
          if (notifiedKeys.has(adminKey)) continue;
          const message = `Goal Documentation Alert: ${staffName} clocked out at ${clockOutDisplay} and has not completed goal sign-offs for ${clientName}. Goals affected: ${goalNames}. Follow-up required.`;
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: `[Staff Alert] Careflow – Missed Sign-Off: ${staffName} / ${clientName}`,
            body: buildEmailBody(message, true, '/goals'),
          }).catch(() => {});
          await base44.asServiceRole.entities.AppNotification.create({
            type: 'goal_missed',
            recipient_user_id: admin.id,
            recipient_email: admin.email,
            recipient_role: 'admin',
            client_id: shift.client_id,
            client_name: clientName,
            staff_id: shift.staff_id,
            staff_name: staffName,
            related_record_id: shift.id,
            related_record_type: 'goal',
            message,
            trigger_stage: 'goal_escalation',
            status: 'unread',
            email_sent: true,
          });
        }
      }
    }

    return Response.json({ success: true, checkedAt: now.toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildEmailBody(message, isAdmin, deepLink) {
  return `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc;">
  <div style="background: #0e7490; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">Careflow Notification</h1>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
    <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-top: 0;">${message}</p>
    <a href="https://careflow.app${deepLink}" style="display: inline-block; margin-top: 16px; background: #0e7490; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;">View in Careflow →</a>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">Automated notification from Careflow.</p>
  </div>
</div>`;
}