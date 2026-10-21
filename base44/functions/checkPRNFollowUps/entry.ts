import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called by scheduled workflow every 5 minutes
// Checks for PRN medication logs that are 60+ minutes old without an effectiveness note
// Notifies the DSP to record the follow-up effectiveness

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const nowMs = now.getTime();
    const todayStr = now.toISOString().split('T')[0];

    // Get all PRN medication logs from today
    const logs = await base44.asServiceRole.entities.MedicationLog.list('-created_date', 500);
    const medications = await base44.asServiceRole.entities.Medication.filter({ status: 'Active', is_prn: true });
    const prnMedIds = new Set(medications.map(m => m.id));

    const existingNotifs = await base44.asServiceRole.entities.AppNotification
      .filter({ trigger_stage: 'prn_followup' })
      .catch(() => []);

    const notifiedKeys = new Set(
      existingNotifs
        .filter(n => n.status !== 'dismissed')
        .map(n => `${n.related_record_id}__prn_followup__${n.recipient_user_id}`)
    );

    let notificationsSent = 0;

    for (const log of logs) {
      // Only PRN medications that were administered
      if (!prnMedIds.has(log.medication_id)) continue;
      if (log.status !== 'Administered') continue;
      if (log.prn_effectiveness_note) continue; // already has effectiveness note

      // Check if 60+ minutes have passed since administration
      const logDateTime = log.created_date || `${log.date}T${log.time || '00:00'}:00`;
      const logMs = new Date(logDateTime).getTime();
      if (isNaN(logMs)) continue;

      const minutesSinceAdmin = (nowMs - logMs) / (1000 * 60);
      if (minutesSinceAdmin < 60 || minutesSinceAdmin > 120) continue; // 60-120 min window

      if (!log.administered_by) continue;

      const recipientId = log.administered_by;
      const recipientEmail = log.administered_by_name ? `${log.administered_by_name.toLowerCase().replace(/\s+/g, '.')}@careflow.app` : '';

      // Get staff record for email
      const staffRecords = await base44.asServiceRole.entities.StaffMember.filter({ id: recipientId }).catch(() => []);
      const staffEmail = staffRecords[0]?.email || recipientEmail;

      const key = `${log.id}__prn_followup__${recipientId}`;
      if (notifiedKeys.has(key)) continue;

      const message = `A PRN medication was administered 60+ minutes ago. Please record the effectiveness note in the eMAR.`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: staffEmail,
        subject: `[Follow-Up Required] Careflow – PRN Effectiveness Note`,
        body: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
  <div style="background: #f59e0b; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">PRN Follow-Up Required</h1>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
    <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-top: 0;">${message}</p>
    <a href="https://careflow-ops-beta.base44.app/emar" style="display: inline-block; margin-top: 16px; background: #f59e0b; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;">Record Effectiveness →</a>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">Automated notification from Careflow.</p>
  </div>
</div>`,
      }).catch(() => {});

      await base44.asServiceRole.entities.AppNotification.create({
        type: 'emar_reminder',
        recipient_user_id: recipientId,
        recipient_email: staffEmail,
        recipient_role: 'staff',
        client_id: log.client_id,
        client_name: log.client_name,
        staff_id: recipientId,
        staff_name: log.administered_by_name,
        related_record_id: log.id,
        related_record_type: 'emar',
        message,
        trigger_stage: 'prn_followup',
        status: 'unread',
        email_sent: true,
      });

      notifiedKeys.add(key);
      notificationsSent++;
    }

    return Response.json({
      success: true,
      checkedAt: now.toISOString(),
      notificationsSent,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});