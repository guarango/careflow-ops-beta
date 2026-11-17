import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireAdmin } from '../../shared/functionAuth.ts';
import { DEFAULT_COLUMNS, fiscalYearBounds, mergeColumns, minutesForNote } from '../../shared/annualReport.ts';

// Builds the DHHS91172 fiscal-year annual report (July 1 – June 30) for every
// service code flagged annual_report_required, and saves the run as a snapshot.

async function fetchAll(fetchPage: (cursor?: string) => Promise<any>) {
  const items: any[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 40; i++) {
    const page = await fetchPage(cursor);
    items.push(...(page?.items || []));
    if (!page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  return items;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await req.json().catch(() => ({}));
    const yearEnd = Number(body.fiscal_year_end_year);
    if (!Number.isInteger(yearEnd) || yearEnd < 2000 || yearEnd > 2100) {
      return Response.json({ error: 'fiscal_year_end_year is required (e.g. 2027)' }, { status: 400 });
    }

    const bounds = fiscalYearBounds(yearEnd);

    const codes = await base44.asServiceRole.entities.ServiceCode.filter({ annual_report_required: true });
    codes.sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)));

    const [notes, incidents, goals, templates] = await Promise.all([
      fetchAll((cursor) => base44.asServiceRole.entities.SessionNote.filter(
        { status: 'Approved', date: { $gte: bounds.start, $lte: bounds.end } },
        cursor ? { limit: 500, cursor } : { limit: 500 },
      )),
      fetchAll((cursor) => base44.asServiceRole.entities.IncidentReport.filter(
        { date: { $gte: bounds.start, $lte: bounds.end } },
        cursor ? { limit: 500, cursor } : { limit: 500 },
      )),
      fetchAll((cursor) => base44.asServiceRole.entities.ClientGoal.filter(
        { status: 'Mastered' },
        cursor ? { limit: 500, cursor } : { limit: 500 },
      )),
      base44.asServiceRole.entities.AnnualReportTemplate.list('-created_date', 300).catch(() => []),
    ]);

    const notesByCode = new Map<string, any[]>();
    for (const note of notes) {
      if (!note.service_code_id) continue;
      if (!notesByCode.has(note.service_code_id)) notesByCode.set(note.service_code_id, []);
      notesByCode.get(note.service_code_id)!.push(note);
    }

    const rows = codes.map((code: any) => {
      const codeNotes = notesByCode.get(code.id) || [];
      const clients = new Set(codeNotes.map((n) => n.client_id).filter(Boolean));
      const staff = new Set(codeNotes.map((n) => n.staff_id || n.staff_name).filter(Boolean));
      const minutes = codeNotes.reduce((sum, n) => sum + minutesForNote(n), 0);
      return {
        service_code_id: code.id,
        code: code.code,
        code_label: code.description || code.code,
        persons_served: clients.size,
        units: round2(minutes / 15),
        hours: round2(minutes / 60),
        sessions: codeNotes.length,
        sessions_site_based: codeNotes.filter((n) => n.setting === 'Site-based day program').length,
        sessions_community: codeNotes.filter((n) => n.setting === 'Community').length,
        staff_count: staff.size,
        incidents_count: incidents.filter((i: any) => clients.has(i.client_id)).length,
        goals_mastered: goals.filter((g: any) => Array.isArray(g.service_code_ids) && g.service_code_ids.includes(code.id)).length,
        custom_values: {} as Record<string, string>,
      };
    });

    // One column template per code — default metrics stay until an admin renames them.
    const templatesByCode = new Map<string, any>(templates.map((t: any) => [t.service_code_id, t]));
    for (const code of codes) {
      const existing = templatesByCode.get(code.id);
      const columns = mergeColumns(existing?.columns, DEFAULT_COLUMNS);
      if (!existing) {
        await base44.asServiceRole.entities.AnnualReportTemplate.create({
          service_code_id: code.id,
          code: code.code,
          code_label: code.description || code.code,
          columns,
          updated_by: user.id,
          updated_by_name: user.full_name || user.email,
          updated_at: new Date().toISOString(),
        });
      } else if (JSON.stringify(columns) !== JSON.stringify(existing.columns || [])) {
        await base44.asServiceRole.entities.AnnualReportTemplate.update(existing.id, { columns });
      }
    }

    const existingPage = await base44.asServiceRole.entities.AnnualReport.filter(
      { fiscal_year_end_year: yearEnd },
      { limit: 1 },
    );
    const existingReport = existingPage?.items?.[0] || null;

    // Admin-typed form answers survive a re-run.
    const previousCustom = new Map<string, any>(
      (existingReport?.rows || []).map((r: any) => [r.service_code_id, r.custom_values || {}]),
    );
    rows.forEach((row) => {
      row.custom_values = previousCustom.get(row.service_code_id) || {};
    });

    const payload = {
      fiscal_year_end_year: yearEnd,
      fiscal_year_label: bounds.label,
      period_start: bounds.start,
      period_end: bounds.end,
      due_date: bounds.due,
      rows,
      source_summary: {
        approved_notes: notes.length,
        incidents: incidents.length,
        goals_mastered_agency: goals.length,
      },
      last_run_at: new Date().toISOString(),
      last_run_by: user.id,
      last_run_by_name: user.full_name || user.email,
      status: existingReport?.status === 'Submitted' ? 'Submitted' : 'Run',
    };

    const report = existingReport
      ? await base44.asServiceRole.entities.AnnualReport.update(existingReport.id, payload)
      : await base44.asServiceRole.entities.AnnualReport.create(payload);

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'annual_report_run',
      event_type: 'generic',
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      actor_role: user.role,
      target_type: 'AnnualReport',
      target_id: report.id,
      target_name: bounds.label,
      details: JSON.stringify({
        period_start: bounds.start,
        period_end: bounds.end,
        codes: rows.length,
        approved_notes: notes.length,
        incidents: incidents.length,
        goals_mastered: goals.length,
      }),
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({
      report_id: report.id,
      fiscal_year_label: bounds.label,
      period_start: bounds.start,
      period_end: bounds.end,
      due_date: bounds.due,
      rows_count: rows.length,
      approved_notes: notes.length,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}