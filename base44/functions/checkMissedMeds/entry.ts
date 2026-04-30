import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called by scheduled automation every 5 minutes
// Checks for missed eMAR sign-offs and fires notifications at 3 stages:
//   pre_window  = 15 min before scheduled time
//   at_time     = at scheduled time if unsigned
//   missed      = 30 min after scheduled time if still unsigned

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled automations (no user auth)
    const medications = await base44.asServiceRole.entities.Medication.filter({ status: 'Active' });
    const logs = await base44.asServiceRole.entities.MedicationLog.list('-created_date', 500);
    const clients = await base44.asServiceRole.entities.Client.list();
    const staff = await base44.asServiceRole.entities.StaffMember.list();
    const existingNotifs = await base44.asServiceRole.entities.AppNotification.filter({ related_record_type: 'emar' });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const notifiedKeys = new Set(
      existingNotifs
        .filter(n => n.status !== 'dismissed')
        .map(n => `${n.related_record_id}__${n.trigger_stage}__${n.recipient_user_id}`)
    );

    for (const med of medications) {
      if (!med.scheduled_times || med.scheduled_times.length === 0) continue;

      const client = clients.find(c => c.id === med.client_id);
      if (!client) continue;

      // Check if already logged today
      const todayLogs = logs.filter(l =>
        l.medication_id === med.id &&
        l.date === todayStr &&
        (l.status === 'Administered' || l.status === 'Refused' || l.status === 'Held')
      );

      for (const scheduledTime of med.scheduled_times) {
        // Parse "HH:MM" or "H:MM AM/PM"
        let schMinutes = null;
        const match24 = scheduledTime.match(/^(\d{1,2}):(\d{2})$/);
        const match12 = scheduledTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (match24) {
          schMinutes = parseInt(match24[1]) * 60 + parseInt(match24[2]);
        } else if (match12) {
          let h = parseInt(match12[1]);
          const m = parseInt(match12[2]);
          const ampm = match12[3].toUpperCase();
          if (ampm === 'PM' && h !== 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          schMinutes = h * 60 + m;
        }
        if (schMinutes === null) continue;

        // Check if already signed off for this specific time window (±30 min)
        const alreadySigned = todayLogs.some(l => {
          if (!l.time) return false;
          const lm = l.time.match(/^(\d{1,2}):(\d{2})/);
          if (!lm) return false;
          const logMin = parseInt(lm[1]) * 60 + parseInt(lm[2]);
          return Math.abs(logMin - schMinutes) <= 30;
        });
        if (alreadySigned) continue;

        const diff = nowMinutes - schMinutes; // positive = past scheduled time

        // Find assigned staff for this client
        const assignedStaff = staff.filter(s =>
          s.status === 'Active' &&
          (s.assigned_client_ids || []).includes(med.client_id)
        );

        // Get admins
        const adminUsers = await base44.asServiceRole.entities.User.list().catch(() => []);
        const admins = adminUsers.filter(u => u.role === 'admin');

        const clientName = `${client.first_name} ${client.last_name}`;
        const medName = med.medication_name;
        const isControlled = !!med.is_controlled;

        // Stage: pre_window (-15 to -1 minutes before)
        if (diff >= -15 && diff < 0) {
          for (const s of assignedStaff) {
            const key = `${med.id}__pre_window__${s.id}`;
            if (notifiedKeys.has(key)) continue;
            const message = `Reminder: ${medName} for ${clientName} is due in ${Math.abs(diff)} minutes. Please prepare to administer and sign off.`;
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: s.email,
              subject: `[Action Required] Careflow – eMAR Sign-Off Reminder for ${clientName}`,
              body: buildEmailBody(message, false, isControlled, '/emar'),
            }).catch(() => {});
            await base44.asServiceRole.entities.AppNotification.create({
              type: 'emar_reminder',
              recipient_user_id: s.id,
              recipient_email: s.email,
              recipient_role: 'staff',
              client_id: med.client_id,
              client_name: clientName,
              staff_id: s.id,
              staff_name: `${s.first_name} ${s.last_name}`,
              related_record_id: med.id,
              related_record_type: 'emar',
              message,
              trigger_stage: 'pre_window',
              is_controlled_substance: isControlled,
              status: 'unread',
              email_sent: true,
            });
          }
        }

        // Stage: at_time (0 to 5 minutes)
        if (diff >= 0 && diff <= 5) {
          for (const s of assignedStaff) {
            const key = `${med.id}__at_time__${s.id}`;
            if (notifiedKeys.has(key)) continue;
            const message = `Action Required: ${medName} for ${clientName} is due now. Please administer and sign off in the eMAR.`;
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: s.email,
              subject: `[Action Required] Careflow – eMAR Sign-Off Reminder for ${clientName}`,
              body: buildEmailBody(message, false, isControlled, '/emar'),
            }).catch(() => {});
            await base44.asServiceRole.entities.AppNotification.create({
              type: 'emar_reminder',
              recipient_user_id: s.id,
              recipient_email: s.email,
              recipient_role: 'staff',
              client_id: med.client_id,
              client_name: clientName,
              staff_id: s.id,
              staff_name: `${s.first_name} ${s.last_name}`,
              related_record_id: med.id,
              related_record_type: 'emar',
              message,
              trigger_stage: 'at_time',
              is_controlled_substance: isControlled,
              status: 'unread',
              email_sent: true,
            });
          }
        }

        // Stage: missed (30+ minutes past)
        if (diff >= 30 && diff <= 35) {
          // Staff notifications
          for (const s of assignedStaff) {
            const key = `${med.id}__missed__${s.id}`;
            if (notifiedKeys.has(key)) continue;
            const message = `Missed Sign-Off: You have not signed off on ${medName} for ${clientName}. Please document immediately or contact your supervisor.`;
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: s.email,
              subject: `[Action Required] Careflow – eMAR Sign-Off Reminder for ${clientName}`,
              body: buildEmailBody(message, false, isControlled, '/emar'),
            }).catch(() => {});
            await base44.asServiceRole.entities.AppNotification.create({
              type: 'emar_missed',
              recipient_user_id: s.id,
              recipient_email: s.email,
              recipient_role: 'staff',
              client_id: med.client_id,
              client_name: clientName,
              staff_id: s.id,
              staff_name: `${s.first_name} ${s.last_name}`,
              related_record_id: med.id,
              related_record_type: 'emar',
              message,
              trigger_stage: 'missed',
              is_controlled_substance: isControlled,
              status: 'unread',
              email_sent: true,
            });
          }

          // Admin notifications
          const staffNames = assignedStaff.map(s => `${s.first_name} ${s.last_name}`).join(', ') || 'Unassigned Staff';
          for (const admin of admins) {
            const key = `${med.id}__missed__${admin.id}`;
            if (notifiedKeys.has(key)) continue;
            const controlledLabel = isControlled ? ' ⚠️ Controlled Substance' : '';
            const message = `Staff Alert:${controlledLabel} ${staffNames} has not signed off on ${medName} for ${clientName}, scheduled at ${scheduledTime}. Immediate follow-up required.`;
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: admin.email,
              subject: `[Staff Alert] Careflow – Missed Sign-Off: ${staffNames} / ${clientName}`,
              body: buildEmailBody(message, true, isControlled, '/emar'),
            }).catch(() => {});
            await base44.asServiceRole.entities.AppNotification.create({
              type: 'emar_missed',
              recipient_user_id: admin.id,
              recipient_email: admin.email,
              recipient_role: 'admin',
              client_id: med.client_id,
              client_name: clientName,
              staff_id: assignedStaff[0]?.id || '',
              staff_name: staffNames,
              related_record_id: med.id,
              related_record_type: 'emar',
              message,
              trigger_stage: 'missed',
              is_controlled_substance: isControlled,
              status: 'unread',
              email_sent: true,
            });
          }
        }
      }
    }

    return Response.json({ success: true, checkedAt: now.toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildEmailBody(message, isAdmin, isControlled, deepLink) {
  return `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
  <div style="background: #0e7490; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">Careflow Notification</h1>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
    ${isControlled ? '<div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 14px; color: #b91c1c;">⚠️ <strong>Controlled Substance</strong> — Requires immediate attention and documentation.</div>' : ''}
    <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-top: 0;">${message}</p>
    <a href="https://careflow.app${deepLink}" style="display: inline-block; margin-top: 16px; background: #0e7490; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;">View in Careflow →</a>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">Automated notification from Careflow.</p>
  </div>
</div>`;
}