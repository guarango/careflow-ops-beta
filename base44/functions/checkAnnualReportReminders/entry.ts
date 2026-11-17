import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireAdmin } from '../../shared/functionAuth.ts';
import { dueFiscalYearEndYear, fiscalYearBounds } from '../../shared/annualReport.ts';

// Called daily by a scheduled workflow. Notifies Admins only on July 1 and
// August 15, and stops once the Admin records the submission date.
// Messages carry no client information.

function denverToday() {
  const iso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
  const [year, month, day] = iso.split('-').map(Number);
  return { iso, year, month, day };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) return auth.error;

    const today = denverToday();
    const localDate = new Date(today.year, today.month - 1, today.day);
    const yearEnd = dueFiscalYearEndYear(localDate);
    const bounds = fiscalYearBounds(yearEnd);

    const page = await base44.asServiceRole.entities.AnnualReport.filter(
      { fiscal_year_end_year: yearEnd },
      { limit: 1 },
    );
    let report = page?.items?.[0] || null;
    if (!report) {
      report = await base44.asServiceRole.entities.AnnualReport.create({
        fiscal_year_end_year: yearEnd,
        fiscal_year_label: bounds.label,
        period_start: bounds.start,
        period_end: bounds.end,
        due_date: bounds.due,
        rows: [],
        status: 'Not run',
      });
    }

    // The recorded submission date closes the task — no further reminders.
    if (report.status === 'Submitted') {
      return Response.json({ success: true, skipped: 'submitted', fiscal_year_label: bounds.label });
    }

    let stage = '';
    if (today.month === 7 && today.day === 1) stage = 'jul1';
    else if (today.month === 8 && today.day === 15) stage = 'aug15';
    if (!stage) {
      return Response.json({ success: true, skipped: 'not_a_reminder_date', today: today.iso });
    }

    const flag = stage === 'jul1' ? 'reminder_jul1_sent' : 'reminder_aug15_sent';

    if (report[flag]) {
      return Response.json({ success: true, skipped: 'already_sent', stage, fiscal_year_label: bounds.label });
    }

    const users = await base44.asServiceRole.entities.User.list().catch(() => []);
    const admins = users.filter((u: any) => u.role === 'admin' && u.is_deactivated !== true);
    const daysLeft = Math.max(
      0,
      Math.round((Date.parse(`${bounds.due}T00:00:00Z`) - Date.parse(`${today.iso}T00:00:00Z`)) / 86400000),
    );
    const message =
      `Annual DSPD report for ${bounds.label} is due ${bounds.due} (Aug 30). ${daysLeft} day(s) left. ` +
      'Run the report and record the Google Form submission date on Reports → Annual DSPD report.';

    for (const admin of admins) {
      await base44.asServiceRole.entities.AppNotification.create({
        type: 'annual_report_due',
        severity: stage === 'aug15' ? 'action' : 'fyi',
        recipient_user_id: admin.id,
        recipient_email: admin.email,
        recipient_role: 'admin',
        message,
        deep_link: '/reports/annual',
        related_record_id: report.id,
        related_record_type: 'annual_report',
        trigger_stage: stage === 'jul1' ? 'annual_report_jul1' : 'annual_report_aug15',
        reminder_rule: `annual_report_${stage}`,
        status: 'unread',
        email_sent: false,
      }).catch(() => {});

      if (admin.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: stage === 'aug15'
            ? 'CareFlow – Annual DSPD report due August 30'
            : 'CareFlow – Annual DSPD report window is open',
          body: emailBody(message),
        }).catch(() => {});
      }
    }

    await base44.asServiceRole.entities.AnnualReport.update(report.id, {
      [flag]: true,
    });

    return Response.json({
      success: true,
      stage,
      fiscal_year_label: bounds.label,
      notified: admins.length,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function emailBody(message: string) {
  return `<div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
  <div style="background: #0b81b7; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #000000; margin: 0; font-size: 20px;">CareFlow Ops · Annual report reminder</h1>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e1e5ea;">
    <p style="font-size: 16px; color: #171d26; line-height: 1.6; margin-top: 0;">${message}</p>
    <a href="https://careflow-ops-beta.base44.app/reports/annual" style="display: inline-block; margin-top: 16px; background: #0b81b7; color: #000000; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;">Open the annual report</a>
  </div>
</div>`;
}