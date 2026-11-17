import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// T7 — cadence-driven summary generation (DHHS91172 SOW 1.25).
//
// For the month being summarized (default: the previous month), each client's
// active services are grouped by ServiceCode.summary_cadence:
//   Monthly                      → deliverable MonthlySummary, due period end + agency due days
//   Quarterly                    → internal MonthlySummary (deliverable = false) that feeds the quarterly
//   Monthly Financial Statement  → placeholder task until the PBA template exists
//   None                         → skipped
// On a quarter-end month a QuarterlySummary shell is created for the quarter just
// ended, due 15 calendar days after the quarter ends.
//
// Called by the Monthly Summary Generation workflow on the 1st of each month, and
// manually (year + month) from the Summaries page.

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const DEFAULT_DUE_DAYS = 15;

function isoUTC(y, m, d) {
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}

function addDaysISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function serviceCadence(entry, byId, byCode) {
  const code = entry.service_code || byId.get(entry.service_code_id)?.code || '';
  const record = byCode.get(String(code).toUpperCase()) || byId.get(entry.service_code_id);
  return (record?.summary_cadence) || 'Quarterly';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'manager'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    // The month whose services are being summarized
    const now = new Date();
    const targetYear = body.year != null ? Number(body.year) : new Date(now.getFullYear(), now.getMonth() - 1, 1).getFullYear();
    const targetMonth = body.month != null ? Number(body.month) : new Date(now.getFullYear(), now.getMonth() - 1, 1).getMonth();
    const force = body.force === true;

    const periodStart = isoUTC(targetYear, targetMonth, 1);
    const periodEnd = isoUTC(targetYear, targetMonth + 1, 0);
    const monthYear = `${MONTH_NAMES[targetMonth]} ${targetYear}`;

    // Agency settings live on the agency record
    const agencies = await base44.asServiceRole.entities.Agency.list();
    const agency = agencies[0] || null;
    const settings = agency?.notification_settings?.summaries || {};
    const dueDays = Number(settings.due_days) > 0 ? Number(settings.due_days) : DEFAULT_DUE_DAYS;
    const internalEnabled = settings.internal_monthly_enabled !== false;
    const anchor = settings.quarter_anchor === 'plan_year' ? 'plan_year' : 'calendar';

    const monthlyDueDate = addDaysISO(periodEnd, dueDays);

    const clients = await base44.asServiceRole.entities.Client.filter({ status: 'Active' });
    const plans = await base44.asServiceRole.entities.ISPlan.filter({ status: 'Active' });
    const codes = await base44.asServiceRole.entities.ServiceCode.list();
    const byId = new Map(codes.map((c) => [c.id, c]));
    const byCode = new Map(codes.map((c) => [String(c.code || '').toUpperCase(), c]));

    const existingMonthly = await base44.asServiceRole.entities.MonthlySummary.filter({ period_start: periodStart });
    const existingQuarterly = await base44.asServiceRole.entities.QuarterlySummary.list();

    const created = [];
    const updated = [];
    const skipped = [];

    for (const client of clients) {
      const plan = plans.find((p) => p.client_id === client.id) || null;

      let serviceEntries = (plan?.services_on_plan || []).map((s) => ({ ...s, _cadence: serviceCadence(s, byId, byCode) }));
      if (serviceEntries.length === 0) {
        serviceEntries = (client.service_enrollments || [])
          .filter((e) => e.service_code_id || e.service_code)
          .map((e) => ({ ...e, _cadence: serviceCadence(e, byId, byCode) }));
      }
      // Only services authorized during the summarized month count as active
      serviceEntries = serviceEntries.filter((s) => {
        const start = s.authorization_start || '';
        const end = s.authorization_end || '';
        if (start && start > periodEnd) return false;
        if (end && end < periodStart) return false;
        return true;
      });

      const cadenceOf = (name) => serviceEntries.filter((s) => s._cadence === name);

      const monthlyCodes = cadenceOf('Monthly');
      const quarterlyCodes = cadenceOf('Quarterly');
      const financialCodes = cadenceOf('Monthly Financial Statement');

      if (!monthlyCodes.length && !quarterlyCodes.length && !financialCodes.length) {
        skipped.push({ client: `${client.first_name} ${client.last_name}`, reason: 'No service with a summary cadence' });
        continue;
      }

      const codesOf = (rows) => [...new Set(rows.map((r) => (r.service_code || byId.get(r.service_code_id)?.code || '').toUpperCase()).filter(Boolean))];
      const idsOf = (rows) => [...new Set(rows.map((r) => r.service_code_id).filter(Boolean))];

      const requests = [];
      if (monthlyCodes.length) {
        requests.push({
          kind: 'monthly',
          deliverable: true,
          cadence: 'Monthly',
          codes: codesOf(monthlyCodes),
          codeIds: idsOf(monthlyCodes),
          due: monthlyDueDate,
        });
      }
      if (quarterlyCodes.length && internalEnabled) {
        requests.push({
          kind: 'internal',
          deliverable: false,
          cadence: 'Quarterly',
          codes: codesOf(quarterlyCodes),
          codeIds: idsOf(quarterlyCodes),
          due: '',
        });
      }
      if (financialCodes.length) {
        requests.push({
          kind: 'financial',
          deliverable: true,
          cadence: 'Monthly Financial Statement',
          codes: codesOf(financialCodes),
          codeIds: idsOf(financialCodes),
          due: monthlyDueDate,
        });
      }

      for (const request of requests) {
        const match = (existingMonthly || []).find((s) =>
          s.client_id === client.id &&
          (s.deliverable !== false) === request.deliverable &&
          (request.kind === 'financial'
            ? s.is_placeholder === true
            : !s.is_placeholder || s.is_placeholder === false)
        );

        const base = {
          client_id: client.id,
          client_name: `${client.first_name} ${client.last_name}`,
          month_year: monthYear,
          period_start: periodStart,
          period_end: periodEnd,
          deliverable: request.deliverable,
          service_code_ids: request.codeIds,
          service_codes: request.codes,
          summary_cadence: request.cadence,
          due_date: request.due || null,
          is_placeholder: request.kind === 'financial',
          status: 'Draft',
        };

        if (match) {
          if (match.status === 'Signed') {
            skipped.push({ client: base.client_name, kind: request.kind, reason: 'Already signed' });
            continue;
          }
          const patch = {};
          if ((match.due_date || '') !== (base.due_date || '')) patch.due_date = base.due_date;
          if (!match.service_codes?.length) {
            patch.service_codes = base.service_codes;
            patch.service_code_ids = base.service_code_ids;
          }
          if (force) patch.status = match.status === 'Signed' ? 'Signed' : match.status;
          if (Object.keys(patch).length > 0) {
            await base44.asServiceRole.entities.MonthlySummary.update(match.id, patch);
            if (patch.due_date !== undefined) {
              await logAudit(base44, user, {
                action: 'summary_due_date_changed',
                targetId: match.id,
                targetName: `${base.client_name} — ${monthYear}`,
                field: 'due_date',
                oldValue: match.due_date || '',
                newValue: patch.due_date || '',
                details: `Due date recalculated for ${request.kind === 'internal' ? 'internal monthly note' : 'deliverable summary'}`,
              });
            }
            updated.push({ client: base.client_name, kind: request.kind, due_date: patch.due_date ?? match.due_date ?? null, id: match.id });
          } else {
            skipped.push({ client: base.client_name, kind: request.kind, reason: 'Already generated' });
          }
          continue;
        }

        if (request.kind === 'financial') {
          base.how_month_went = 'Monthly financial statement due — the financial statement template is not configured yet.';
        }
        const record = await base44.asServiceRole.entities.MonthlySummary.create(base);
        created.push({ client: base.client_name, kind: request.kind, deliverable: request.deliverable, due_date: base.due_date, id: record.id });
      }

      // Quarterly summary for the quarter just ended
      const anchorMonth = anchor === 'plan_year' && plan?.plan_year_start
        ? new Date(`${plan.plan_year_start}T00:00:00Z`).getUTCMonth()
        : 0;
      const offset = (targetMonth - anchorMonth + 12) % 12;
      const isQuarterEnd = (offset + 1) % 3 === 0;

      if (isQuarterEnd && quarterlyCodes.length > 0) {
        const withinQuarter = offset % 3;
        const qStart = new Date(Date.UTC(targetYear, targetMonth - withinQuarter, 1));
        const qEnd = new Date(Date.UTC(targetYear, targetMonth - withinQuarter + 3, 0));
        const quarterNumber = Math.floor(offset / 3) + 1;
        const quarterLabel = `Q${quarterNumber} ${qEnd.getUTCFullYear()}`;
        const qStartISO = qStart.toISOString().slice(0, 10);
        const qEndISO = qEnd.toISOString().slice(0, 10);
        const qDue = addDaysISO(qEndISO, 15);

        const already = (existingQuarterly || []).find((q) => q.client_id === client.id && q.quarter === quarterLabel);
        if (already) {
          if ((already.due_date || '') !== qDue && already.status !== 'Signed') {
            await base44.asServiceRole.entities.QuarterlySummary.update(already.id, { due_date: qDue });
            await logAudit(base44, user, {
              action: 'summary_due_date_changed',
              targetId: already.id,
              targetName: `${client.first_name} ${client.last_name} — ${quarterLabel}`,
              field: 'due_date',
              oldValue: already.due_date || '',
              newValue: qDue,
              details: 'Quarterly due date recalculated (quarter end + 15 calendar days)',
            });
            updated.push({ client: `${client.first_name} ${client.last_name}`, kind: 'quarterly', due_date: qDue, id: already.id });
          } else {
            skipped.push({ client: `${client.first_name} ${client.last_name}`, kind: 'quarterly', reason: 'Already generated' });
          }
        } else {
          const record = await base44.asServiceRole.entities.QuarterlySummary.create({
            client_id: client.id,
            client_name: `${client.first_name} ${client.last_name}`,
            quarter: quarterLabel,
            quarter_number: quarterNumber,
            year: qEnd.getUTCFullYear(),
            period_start: qStartISO,
            period_end: qEndISO,
            due_date: qDue,
            status: 'Draft',
          });
          created.push({
            client: `${client.first_name} ${client.last_name}`,
            kind: 'quarterly',
            deliverable: true,
            quarter: quarterLabel,
            due_date: qDue,
            id: record.id,
          });
        }
      }
    }

    await logAudit(base44, user, {
      action: 'summary_generation',
      targetName: monthYear,
      field: 'MonthlySummary',
      newValue: `${created.length} created`,
      details: `Cadence generation for ${monthYear} (${periodStart} → ${periodEnd}). Created ${created.length}, updated ${updated.length}, skipped ${skipped.length}. Due days ${dueDays}, internal notes ${internalEnabled ? 'on' : 'off'}, quarter anchor ${anchor}.`,
    });

    return Response.json({
      success: true,
      month_year: monthYear,
      period_start: periodStart,
      period_end: periodEnd,
      monthly_due_date: monthlyDueDate,
      settings: { due_days: dueDays, internal_monthly_enabled: internalEnabled, quarter_anchor: anchor },
      counts: { clients: clients.length, created: created.length, updated: updated.length, skipped: skipped.length },
      created,
      updated,
      skipped,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});

async function logAudit(base44, user, { action, targetId = '', targetName = '', field = '', oldValue = '', newValue = '', details = '' }) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      action,
      event_type: 'generic',
      actor_id: user.id || '',
      actor_name: user.full_name || user.email || 'System',
      actor_email: user.email || '',
      actor_role: user.role || '',
      target_type: action.includes('quarterly') || field === 'due_date' ? 'Summary' : 'MonthlySummary',
      target_id: targetId,
      target_name: targetName,
      field,
      old_value: oldValue,
      new_value: newValue,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (_) {
    // Auditing never blocks generation
  }
}