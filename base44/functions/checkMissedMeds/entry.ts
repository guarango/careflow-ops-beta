import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called by scheduled workflow every 5 minutes
// Checks for med passes at 3 stages:
//   at_time    = 0-5 min past scheduled time → notify DSP "med pass due now at [house]"
//   reminder   = 30-35 min past → re-notify DSP "missed med pass at [house]" + create Missed log
//   escalation = 60-65 min past → notify Manager "staff has a missed med pass at [house]"
//
// PRIVACY: Messages never include client name or medication name.
// Uses house/location name instead (e.g., "You have a missed med pass at Maple House").

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const medications = await base44.asServiceRole.entities.Medication.filter({ status: 'Active' });
    const logs = await base44.asServiceRole.entities.MedicationLog.list('-created_date', 1000);
    const clients = await base44.asServiceRole.entities.Client.list();
    const houses = await base44.asServiceRole.entities.House.list().catch(() => []);
    const staff = await base44.asServiceRole.entities.StaffMember.list();
    const adminUsers = await base44.asServiceRole.entities.User.list().catch(() => []);
    const admins = adminUsers.filter(u => u.role === 'admin' || u.role === 'manager');

    const existingNotifs = await base44.asServiceRole.entities.AppNotification
      .filter({ related_record_type: 'emar' })
      .catch(() => []);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const notifiedKeys = new Set(
      existingNotifs
        .filter(n => n.status !== 'dismissed')
        .map(n => `${n.related_record_id}__${n.trigger_stage}__${n.recipient_user_id}`)
    );

    // Build house name lookup
    const houseNameMap = {};
    for (const h of houses) {
      houseNameMap[h.id] = h.name || 'Unknown Location';
    }

    let notificationsSent = 0;
    let missedLogsCreated = 0;

    for (const med of medications) {
      if (!med.scheduled_times || med.scheduled_times.length === 0) continue;
      if (med.is_prn) continue; // PRN meds don't have scheduled reminders

      const client = clients.find(c => c.id === med.client_id);
      if (!client) continue;

      const locationName = client.house_id ? (houseNameMap[client.house_id] || 'their location') : 'their location';

      // Check if already logged today
      const todayLogs = logs.filter(l =>
        l.medication_id === med.id &&
        l.date === todayStr &&
        (l.status === 'Administered' || l.status === 'Refused' || l.status === 'Held')
      );

      for (const scheduledTime of med.scheduled_times) {
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

        const alreadyLogged = todayLogs.some(l => {
          if (!l.time) return false;
          const lm = l.time.match(/^(\d{1,2}):(\d{2})/);
          if (!lm) return false;
          const logMin = parseInt(lm[1]) * 60 + parseInt(lm[2]);
          return Math.abs(logMin - schMinutes) <= 30;
        });
        if (alreadyLogged) continue;

        const diff = nowMinutes - schMinutes;

        // Find assigned staff for this client
        const assignedStaff = staff.filter(s =>
          s.status === 'Active' &&
          (s.assigned_client_ids || []).includes(med.client_id)
        );

        // Stage 1: at_time (0-5 min past)
        if (diff >= 0 && diff <= 5) {
          for (const s of assignedStaff) {
            const key = `${med.id}__at_time__${s.id}`;
            if (notifiedKeys.has(key)) continue;

            const message = `You have a med pass due now at ${locationName}.`;

            await base44.asServiceRole.integrations.Core.SendEmail({
              to: s.email,
              subject: `[Reminder] Careflow – Med Pass Due at ${locationName}`,
              body: buildEmailBody(message, `/emar`),
            }).catch(() => {});

            await base44.asServiceRole.entities.AppNotification.create({
              type: 'emar_reminder',
              recipient_user_id: s.id,
              recipient_email: s.email,
              recipient_role: 'staff',
              client_id: med.client_id,
              client_name: `${client.first_name} ${client.last_name}`,
              staff_id: s.id,
              staff_name: `${s.first_name} ${s.last_name}`,
              related_record_id: med.id,
              related_record_type: 'emar',
              message,
              trigger_stage: 'at_time',
              status: 'unread',
              email_sent: true,
            });

            notifiedKeys.add(key);
            notificationsSent++;
          }
        }

        // Stage 2: reminder (30-35 min past) — re-notify DSP + create Missed log
        if (diff >= 30 && diff <= 35) {
          // Create a system-generated Missed log if none exists
          const existingMissedLog = logs.find(l =>
            l.medication_id === med.id &&
            l.date === todayStr &&
            l.status === 'Missed' &&
            l.system_generated === true
          );

          if (!existingMissedLog) {
            await base44.asServiceRole.entities.MedicationLog.create({
              medication_id: med.id,
              client_id: med.client_id,
              client_name: `${client.first_name} ${client.last_name}`,
              medication_name: med.medication_name,
              date: todayStr,
              time: scheduledTime,
              status: 'Missed',
              reason: 'System-generated: no administration recorded within 30 minutes of scheduled time',
              system_generated: true,
              is_late: true,
              review_status: 'pending_review',
            });
            missedLogsCreated++;
          }

          for (const s of assignedStaff) {
            const key = `${med.id}__reminder__${s.id}`;
            if (notifiedKeys.has(key)) continue;

            const message = `You have a missed med pass at ${locationName}. Please document immediately or contact your supervisor.`;

            await base44.asServiceRole.integrations.Core.SendEmail({
              to: s.email,
              subject: `[Action Required] Careflow – Missed Med Pass at ${locationName}`,
              body: buildEmailBody(message, `/emar`),
            }).catch(() => {});

            await base44.asServiceRole.entities.AppNotification.create({
              type: 'emar_missed',
              recipient_user_id: s.id,
              recipient_email: s.email,
              recipient_role: 'staff',
              client_id: med.client_id,
              client_name: `${client.first_name} ${client.last_name}`,
              staff_id: s.id,
              staff_name: `${s.first_name} ${s.last_name}`,
              related_record_id: med.id,
              related_record_type: 'emar',
              message,
              trigger_stage: 'reminder',
              status: 'unread',
              email_sent: true,
            });

            notifiedKeys.add(key);
            notificationsSent++;
          }
        }

        // Stage 3: escalation (60-65 min past) — notify manager
        if (diff >= 60 && diff <= 65) {
          const staffNames = assignedStaff.map(s => `${s.first_name} ${s.last_name}`).join(', ') || 'Unassigned Staff';

          for (const admin of admins) {
            const key = `${med.id}__escalation__${admin.id}`;
            if (notifiedKeys.has(key)) continue;

            const message = `A staff member has a missed med pass at ${locationName}. Immediate follow-up required.`;

            await base44.asServiceRole.integrations.Core.SendEmail({
              to: admin.email,
              subject: `[Escalation] Careflow – Missed Med Pass at ${locationName}`,
              body: buildEmailBody(message, `/emar`, true),
            }).catch(() => {});

            await base44.asServiceRole.entities.AppNotification.create({
              type: 'emar_missed',
              recipient_user_id: admin.id,
              recipient_email: admin.email,
              recipient_role: 'admin',
              client_id: med.client_id,
              client_name: `${client.first_name} ${client.last_name}`,
              staff_name: staffNames,
              related_record_id: med.id,
              related_record_type: 'emar',
              message,
              trigger_stage: 'escalation',
              status: 'unread',
              email_sent: true,
            });

            notifiedKeys.add(key);
            notificationsSent++;
          }
        }
      }
    }

    return Response.json({
      success: true,
      checkedAt: now.toISOString(),
      notificationsSent,
      missedLogsCreated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildEmailBody(message, deepLink, isEscalation) {
  const bannerColor = isEscalation ? '#dc2626' : '#0e7490';
  const bannerText = isEscalation ? 'Escalation' : 'Careflow Notification';
  return `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
  <div style="background: ${bannerColor}; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">${bannerText}</h1>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
    <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-top: 0;">${message}</p>
    <a href="https://careflow-ops-beta.base44.app${deepLink}" style="display: inline-block; margin-top: 16px; background: #0e7490; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;">View in Careflow →</a>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">Automated notification from Careflow. This message does not contain client or medication names for privacy.</p>
  </div>
</div>`;
}