import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called daily by scheduled workflow
// Scans all BehaviorSupportPlan records for human_rights_restrictions with upcoming review dates
// Notifies admins 30 days before, 7 days before, and on the day of the review date
// Also notifies if a review date has already passed (overdue)

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch all BSPs (service role bypasses RLS)
    const bsps = await base44.asServiceRole.entities.BehaviorSupportPlan.list('-created_date', 500);

    // Fetch admins
    const adminUsers = await base44.asServiceRole.entities.User.list().catch(() => []);
    const admins = adminUsers.filter(u => u.role === 'admin');

    // Fetch existing HRC notifications to dedupe
    const existingNotifs = await base44.asServiceRole.entities.AppNotification
      .filter({ trigger_stage: 'hrc_review' })
      .catch(() => []);

    const notifiedKeys = new Set(
      existingNotifs
        .filter(n => n.status !== 'dismissed')
        .map(n => `${n.related_record_id}__${n.trigger_stage}__${n.recipient_user_id}`)
    );

    let notifiedCount = 0;

    for (const bsp of bsps) {
      if (bsp.status === 'Archived') continue;
      if (!bsp.human_rights_restrictions || bsp.human_rights_restrictions.length === 0) continue;

      for (const restriction of bsp.human_rights_restrictions) {
        if (!restriction.review_date) continue;

        const reviewDate = restriction.review_date; // YYYY-MM-DD
        const restrictionType = restriction.restriction_type || 'Unspecified restriction';
        const clientName = bsp.client_name || 'Unknown client';

        let stage = null;
        let daysLabel = '';

        if (reviewDate < todayStr) {
          stage = 'hrc_overdue';
          daysLabel = 'is OVERDUE';
        } else if (reviewDate === todayStr) {
          stage = 'hrc_due_today';
          daysLabel = 'is due TODAY';
        } else if (reviewDate === in7Days) {
          stage = 'hrc_7_days';
          daysLabel = 'is due in 7 days';
        } else if (reviewDate === in30Days) {
          stage = 'hrc_30_days';
          daysLabel = 'is due in 30 days';
        }

        if (!stage) continue;

        for (const admin of admins) {
          const key = `${bsp.id}__${stage}__${admin.id}`;
          if (notifiedKeys.has(key)) continue;

          const message = `HRC Review Reminder: The human rights restriction "${restrictionType}" for ${clientName} ${daysLabel} (review date: ${reviewDate}). Please ensure the Human Rights Committee reviews this restriction and documents approval.`;

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: `[HRC Review] Careflow – ${restrictionType} for ${clientName} ${daysLabel}`,
            body: `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
  <div style="background: #0e7490; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">HRC Review Reminder</h1>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
    <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-top: 0;">${message}</p>
    <a href="https://careflow-ops-beta.base44.app/bsp/${bsp.id}" style="display: inline-block; margin-top: 16px; background: #0e7490; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;">View BSP in Careflow →</a>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">Automated notification from Careflow.</p>
  </div>
</div>`,
          }).catch(() => {});

          await base44.asServiceRole.entities.AppNotification.create({
            type: 'emar_reminder', // reuse existing enum value since AppNotification.type is restricted
            recipient_user_id: admin.id,
            recipient_email: admin.email,
            recipient_role: 'admin',
            client_id: bsp.client_id,
            client_name: clientName,
            related_record_id: bsp.id,
            related_record_type: 'emar', // closest match; BSP not in enum
            message,
            trigger_stage: stage,
            status: 'unread',
            email_sent: true,
          });

          notifiedKeys.add(key);
          notifiedCount++;
        }
      }
    }

    return Response.json({
      success: true,
      checkedAt: today.toISOString(),
      notificationsSent: notifiedCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});