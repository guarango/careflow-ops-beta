import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      type,
      recipientUserId,
      recipientEmail,
      recipientRole,
      clientId,
      clientName,
      staffId,
      staffName,
      relatedRecordId,
      relatedRecordType,
      message,
      triggerStage,
      isControlledSubstance,
      dedupeKey,
    } = body;

    // Dedupe: check if a notification with same dedupeKey (type+record+stage) already exists unread
    if (dedupeKey) {
      const existing = await base44.asServiceRole.entities.AppNotification.filter({
        recipient_user_id: recipientUserId,
        trigger_stage: triggerStage,
        related_record_id: relatedRecordId,
        status: 'unread',
      });
      if (existing && existing.length > 0) {
        return Response.json({ skipped: true, reason: 'duplicate' });
      }
    }

    // Create in-app notification
    const notification = await base44.asServiceRole.entities.AppNotification.create({
      type,
      recipient_user_id: recipientUserId,
      recipient_email: recipientEmail,
      recipient_role: recipientRole,
      client_id: clientId,
      client_name: clientName,
      staff_id: staffId,
      staff_name: staffName,
      related_record_id: relatedRecordId,
      related_record_type: relatedRecordType,
      message,
      trigger_stage: triggerStage,
      is_controlled_substance: !!isControlledSubstance,
      status: 'unread',
      email_sent: false,
    });

    // Send email
    if (recipientEmail) {
      const isAdmin = recipientRole === 'admin';
      const subject = isAdmin
        ? `[Staff Alert] Careflow – Missed Sign-Off: ${staffName} / ${clientName}`
        : `[Action Required] Careflow – ${relatedRecordType === 'emar' ? 'eMAR' : 'Goal'} Sign-Off Reminder for ${clientName}`;

      const deepLink = relatedRecordType === 'emar'
        ? 'https://app.base44.com/emar'
        : 'https://app.base44.com/goals';

      const emailBody = `
<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
  <div style="background: #0e7490; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">Careflow Notification</h1>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
    ${isControlledSubstance ? '<div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 14px; color: #b91c1c;">⚠️ <strong>Controlled Substance</strong> — This notification requires immediate attention and documentation.</div>' : ''}
    <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-top: 0;">${message}</p>
    <a href="${deepLink}" style="display: inline-block; margin-top: 16px; background: #0e7490; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;">View in Careflow →</a>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">This is an automated notification from Careflow. Do not reply to this email.</p>
  </div>
</div>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipientEmail,
        subject,
        body: emailBody,
      });

      await base44.asServiceRole.entities.AppNotification.update(notification.id, { email_sent: true });
    }

    return Response.json({ success: true, notificationId: notification.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});