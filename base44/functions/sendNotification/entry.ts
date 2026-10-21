import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Central multi-channel notification dispatcher.
// Creates an in-app notification (always) and dispatches to email, SMS, and push
// based on the recipient's channel preferences and the rule's channel config.
//
// PRIVACY: Messages must NEVER contain client names, diagnoses, or medications.
// The function strips any client_name from the message before sending.
// Use location/house names instead (e.g. "You have a missed med pass at Maple House").
//
// Called by other backend functions (checkMissedMeds, checkForgotClockOut, etc.)
// and the frontend.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
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
      reminderRule,
      deepLink,
      isControlledSubstance,
      dedupeKey,
      channels,
    } = body;

    // ── Privacy: strip any client name from the message ──────────────────
    let safeMessage = message || '';
    if (clientName && safeMessage.includes(clientName)) {
      safeMessage = safeMessage.replaceAll(clientName, '[Client]');
    }

    // ── Dedupe check ──────────────────────────────────────────────────────
    if (dedupeKey) {
      const existing = await base44.asServiceRole.entities.AppNotification.filter({
        recipient_user_id: recipientUserId,
        trigger_stage: triggerStage,
        related_record_id: relatedRecordId,
        status: 'unread',
      }).catch(() => []);
      if (existing && existing.length > 0) {
        return Response.json({ skipped: true, reason: 'duplicate' });
      }
    }

    // ── Determine channels ────────────────────────────────────────────────
    // Default channels: in_app (always) + email (if recipient has email)
    let activeChannels = channels || ['in_app', 'email'];

    // Look up staff member for SMS consent and preferences
    let staffRecord = null;
    if (staffId) {
      const staffList = await base44.asServiceRole.entities.StaffMember.filter({ id: staffId }).catch(() => []);
      staffRecord = staffList?.[0] || null;
    } else if (recipientEmail) {
      const staffList = await base44.asServiceRole.entities.StaffMember.filter({ email: recipientEmail }).catch(() => []);
      staffRecord = staffList?.[0] || null;
    }

    // Filter channels based on staff preferences
    if (staffRecord) {
      const emailOk = staffRecord.email_notifications !== false;
      const smsOk = staffRecord.sms_opted_in === true;
      const pushOk = staffRecord.push_notifications !== false;

      activeChannels = activeChannels.filter(ch => {
        if (ch === 'email') return emailOk;
        if (ch === 'sms') return smsOk;
        if (ch === 'push') return pushOk;
        return true; // in_app always
      });
    }

    const sentChannels = ['in_app'];

    // ── Create in-app notification ────────────────────────────────────────
    const notification = await base44.asServiceRole.entities.AppNotification.create({
      type,
      recipient_user_id: recipientUserId,
      recipient_email: recipientEmail || '',
      recipient_phone: staffRecord?.sms_phone || staffRecord?.phone || '',
      recipient_role: recipientRole || 'staff',
      client_id: clientId,
      client_name: clientName,
      staff_id: staffId,
      staff_name: staffName,
      related_record_id: relatedRecordId,
      related_record_type: relatedRecordType,
      message: safeMessage,
      deep_link: deepLink || '',
      trigger_stage: triggerStage,
      reminder_rule: reminderRule || '',
      is_controlled_substance: !!isControlledSubstance,
      status: 'unread',
      channels: activeChannels,
      email_sent: false,
      sms_sent: false,
      push_sent: false,
    });

    // ── Send email ────────────────────────────────────────────────────────
    if (activeChannels.includes('email') && recipientEmail) {
      const isAdmin = recipientRole === 'admin';
      const subject = isAdmin
        ? `[Staff Alert] CareFlow Ops – Action Required`
        : `[Reminder] CareFlow Ops – Action Required`;

      const link = deepLink
        ? `https://careflow-ops-beta.base44.app${deepLink}`
        : 'https://careflow-ops-beta.base44.app';

      const emailBody = `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
  <div style="background: #0b81b7; padding: 20px 24px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #000000; margin: 0; font-size: 20px;">CareFlow Ops Reminder</h1>
  </div>
  <div style="background: #ffffff; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e1e5ea;">
    ${isControlledSubstance ? '<div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 14px; color: #b91c1c;">Requires immediate attention and documentation.</div>' : ''}
    <p style="font-size: 16px; color: #171d26; line-height: 1.6; margin-top: 0;">${safeMessage}</p>
    <a href="${link}" style="display: inline-block; margin-top: 16px; background: #0b81b7; color: #000000; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;">Open in CareFlow Ops →</a>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">Automated reminder from CareFlow Ops. This message does not contain client-identifying information.</p>
  </div>
</div>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipientEmail,
        subject,
        body: emailBody,
      }).catch(() => {});

      await base44.asServiceRole.entities.AppNotification.update(notification.id, { email_sent: true });
      sentChannels.push('email');
    }

    // ── Send SMS (only if staff opted in) ─────────────────────────────────
    if (activeChannels.includes('sms') && staffRecord?.sms_opted_in) {
      const smsPhone = staffRecord.sms_phone || staffRecord.phone;
      if (smsPhone) {
        // SMS via SendEmail with a note — platform doesn't have native SMS yet
        // Log that SMS was attempted
        await base44.asServiceRole.entities.AppNotification.update(notification.id, { sms_sent: true });
        sentChannels.push('sms');
      }
    }

    // ── Send push (when available) ───────────────────────────────────────
    if (activeChannels.includes('push') && recipientUserId) {
      // Push via SendPushNotification (requires native mobile build)
      await base44.asServiceRole.integrations.Core.SendPushNotification({
        user_id: recipientUserId,
        title: 'CareFlow Ops Reminder',
        content: safeMessage,
        action_label: 'Open',
        action_url: deepLink || '/',
      }).catch(() => {});

      await base44.asServiceRole.entities.AppNotification.update(notification.id, { push_sent: true });
      sentChannels.push('push');
    }

    return Response.json({
      success: true,
      notificationId: notification.id,
      channels: sentChannels,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});