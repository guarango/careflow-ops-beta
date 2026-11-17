import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Builds (or rebuilds) a quarterly summary from the quarter's records — DHHS91172 SOW 1.25.
//
// Element 1  person's name
// Element 2  each service provided (15-minute units, notes, staff)
// Element 3  date range covered
// Element 4  notable events prefilled from incidents and significant notes;
//            the manager writes the services summary and status/response
// Element 5  progress toward each goal from the quarter's Valid goal entries.
//            Services marked goal_progress_required_in_summary = false, and
//            ELS / MTP / PBA / Professional Medication Monitoring / Respite,
//            carry no goal progress.
// Element 6  the staff member writing it
//
// Due 15 calendar days after the quarter ends; an unsent summary past that date is Late.
// Numbers are computed here — never invented. Manager-written text is preserved on rebuild.

const EXEMPT_CODES = ['ELS', 'MTP', 'PBA', 'PMM', 'PMP'];
const PROMPT_HIERARCHY = [
  'Full Physical Assist',
  'Hand-Over-Hand',
  'Physical Prompt',
  'Gestural Prompt',
  'Verbal Prompt',
  'Indirect Verbal Cue',
  'Independent',
];

const pad = (n) => String(n).padStart(2, '0');
const isoUTC = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function isoPlusDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function todayISO() {
  const now = new Date();
  return isoUTC(now.getFullYear(), now.getMonth(), now.getDate());
}

function timeMinutes(value) {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function noteMinutes(note) {
  const start = timeMinutes(note.start_time);
  const end = timeMinutes(note.end_time);
  if (start === null || end === null) return null;
  let total = end - start;
  if (note.end_date && note.date && note.end_date !== note.date) {
    const days = Math.round(
      (Date.parse(`${note.end_date}T00:00:00Z`) - Date.parse(`${note.date}T00:00:00Z`)) / 86400000
    );
    total += days * 1440;
  } else if (total < 0) {
    total += 1440;
  }
  return Math.max(0, total);
}

function isExemptCode(record) {
  if (!record) return false;
  if (EXEMPT_CODES.includes(String(record.code || '').toUpperCase())) return true;
  return /respite|professional medication monitoring/i.test(`${record.description || ''} ${record.service_type || ''}`);
}

function isCountedEntry(entry) {
  const status = entry?.status || 'Valid';
  return status === 'Valid' && !entry?.missed_reason;
}

function percentageMode(goal) {
  const method = `${goal.measurement_type || ''} ${goal.primary_measurement_method || ''}`;
  return /percent|trial/i.test(method) || !goal.measurement_type;
}

/** Numeric value of one entry, using the same rules as the goal chart. */
function entryValue(entry, goal) {
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  const percentage = num(entry.percentage);
  if (percentage !== null && !Number.isNaN(percentage)) return Math.max(0, Math.min(100, Math.round(percentage)));
  const total = num(entry.trials_total);
  const correct = num(entry.trials_correct);
  if (total > 0 && correct !== null) return Math.max(0, Math.min(100, Math.round((correct / total) * 100)));
  if (percentageMode(goal)) {
    const label = String(entry.score || '');
    const pct = label.match(/(\d+)%/);
    if (pct) return Number(pct[1]);
    const frac = label.match(/(\d+)\s*\/\s*(\d+)/);
    if (frac && Number(frac[2]) > 0) return Math.round((Number(frac[1]) / Number(frac[2])) * 100);
  }
  const rating = num(entry.rating);
  if (rating !== null) return rating;
  const frequency = num(entry.frequency_count);
  if (frequency !== null) return frequency;
  const duration = num(entry.duration_minutes);
  if (duration !== null) return duration;
  return null;
}

function levelLabel(value, goal) {
  if (value === null || value === undefined) return '';
  const rounded = Math.round(value * 10) / 10;
  return percentageMode(goal) ? `${rounded}%` : `${rounded}`;
}

function promptTrend(entries) {
  const prompts = entries.map((e) => e.prompt_level).filter((p) => PROMPT_HIERARCHY.includes(p));
  if (prompts.length < 2) return '';
  const first = prompts[0];
  const last = prompts[prompts.length - 1];
  if (first === last) return first;
  return `${first} → ${last}`;
}

function computeTrend(values, goal) {
  if (values.length < 2) return 'Insufficient data';
  const mid = Math.floor(values.length / 2);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const firstAvg = avg(values.slice(0, mid));
  const lastAvg = avg(values.slice(mid));
  const diff = lastAvg - firstAvg;
  const threshold = percentageMode(goal) ? 5 : 0.5;
  if (diff > threshold) return 'Improving';
  if (diff < -threshold) return 'Declining';
  return 'Stable';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'manager') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { client_id } = body;
    if (!client_id) return Response.json({ error: 'client_id is required' }, { status: 400 });

    const client = await base44.asServiceRole.entities.Client.get(client_id).catch(() => null);
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });
    const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim();

    // Quarter — default the most recent completed one
    let quarterNumber = Number(body.quarter_number) || null;
    let quarterYear = Number(body.year) || null;
    if (!quarterNumber || !quarterYear) {
      const now = new Date();
      quarterNumber = Math.floor(now.getMonth() / 3) + 1;
      quarterYear = now.getFullYear();
      quarterNumber -= 1;
      if (quarterNumber === 0) {
        quarterNumber = 4;
        quarterYear -= 1;
      }
    }

    const quarterLabel = `Q${quarterNumber} ${quarterYear}`;
    const startMonth = (quarterNumber - 1) * 3;
    const periodStart = isoUTC(quarterYear, startMonth, 1);
    const periodEnd = new Date(Date.UTC(quarterYear, startMonth + 3, 0)).toISOString().slice(0, 10);
    const dueDate = isoPlusDays(periodEnd, 15);

    const [codes, allGoals, allPlans, quarterNotes, quarterIncidents, monthlies, staff] = await Promise.all([
      base44.asServiceRole.entities.ServiceCode.list(),
      base44.asServiceRole.entities.ClientGoal.filter({ client_id }),
      base44.asServiceRole.entities.ISPlan.filter({ client_id }),
      base44.asServiceRole.entities.SessionNote.filter({
        client_id,
        date: { $gte: periodStart, $lte: periodEnd },
      }),
      base44.asServiceRole.entities.IncidentReport.filter({
        client_id,
        date: { $gte: periodStart, $lte: periodEnd },
      }),
      base44.asServiceRole.entities.MonthlySummary.filter({ client_id }),
      base44.asServiceRole.entities.StaffMember.list().catch(() => []),
    ]);

    const codeById = new Map(codes.map((c) => [c.id, c]));

    // Element 2 — services delivered, from the quarter's session notes
    const groups = new Map();
    (quarterNotes || []).forEach((note) => {
      const code = codeById.get(note.service_code_id);
      const key = note.service_code_id || note.service_code || 'unspecified';
      const group = groups.get(key) || {
        service_code_id: note.service_code_id || '',
        service_code: note.service_code || code?.code || '',
        service_name: code?.description || '',
        units: 0,
        notes: 0,
        staff: new Set(),
      };
      group.notes += 1;
      group.units += (noteMinutes(note) || 0) / 15;
      if (note.staff_name) group.staff.add(note.staff_name);
      if (!group.service_code && code?.code) group.service_code = code.code;
      groups.set(key, group);
    });

    const servicesProvided = [...groups.values()]
      .map((g) => ({
        service_code_id: g.service_code_id,
        service_code: g.service_code,
        service_name: g.service_name,
        units_delivered: Math.round(g.units * 100) / 100,
        notes_count: g.notes,
        staff_names: [...g.staff],
      }))
      .sort((a, b) => String(a.service_code).localeCompare(String(b.service_code)));

    // Element 5 — progress toward each goal
    const activePlan = (allPlans || []).find((p) => p.status === 'Active') || (allPlans || [])[0];
    const pcspGoals = activePlan?.pcsp_goals || [];

    const goalProgress = [];
    for (const goal of allGoals || []) {
      if (goal.status === 'Discontinued') continue;

      const responsibleCodes = (goal.service_code_ids || [])
        .map((id) => codeById.get(id))
        .filter(Boolean);
      const allCodesExempt =
        responsibleCodes.length > 0 &&
        responsibleCodes.every((c) => isExemptCode(c) || c.goal_progress_required_in_summary === false);
      if (allCodesExempt) continue;

      const entries = (goal.progress_entries || [])
        .filter((e) => e.date && e.date >= periodStart && e.date <= periodEnd && isCountedEntry(e))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));

      const points = entries
        .map((e) => ({ date: e.date, value: entryValue(e, goal) }))
        .filter((p) => p.value !== null && !Number.isNaN(p.value));
      const values = points.map((p) => p.value);

      const recent = values.slice(-3);
      const currentValue = recent.length
        ? recent.reduce((a, b) => a + b, 0) / recent.length
        : null;

      const pcspGoal = pcspGoals.find((g) => g.goal_id === goal.id);

      const trend = computeTrend(values, goal);
      const prefillNarrative = points.length
        ? `${points.length} data point(s) recorded this quarter (${levelLabel(points[0].value, goal)} → ${levelLabel(points[points.length - 1].value, goal)}). ${
            promptTrend(entries) ? `Prompting: ${promptTrend(entries)}.` : ''
          }`.trim()
        : '';

      goalProgress.push({
        goal_id: goal.id,
        goal_title: goal.goal_title,
        pcsp_goal_text: pcspGoal?.goal_text_as_written || '',
        service_code_ids: goal.service_code_ids || [],
        data_points_count: points.length,
        baseline: goal.baseline_description || goal.baseline || '',
        current_level: levelLabel(currentValue, goal),
        trend,
        prompt_level_trend: promptTrend(entries),
        narrative: prefillNarrative,
        mastery_met: goal.status === 'Mastered',
        series: points,
      });
    }

    // Element 4 — notable events prefilled from incidents and flagged notes
    const incidentLines = (quarterIncidents || [])
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((incident) => {
        const detail = String(incident.description || '').replace(/\s+/g, ' ').slice(0, 180);
        return `${incident.date} — ${incident.type || 'Incident'} (${incident.severity || 'unspecified'})${incident.location ? ` at ${incident.location}` : ''}${detail ? `: ${detail}` : ''}`;
      });
    const flaggedNoteLines = (quarterNotes || [])
      .filter((note) => {
        const flags = note.health_safety_flags || {};
        return Object.entries(flags).some(([key, value]) => key !== 'detail' && value === true);
      })
      .map((note) => `${note.date} — health or safety concern recorded during a service (${note.staff_name || 'staff'}).`);
    const notableEvents = [...incidentLines, ...flaggedNoteLines].join('\n') ||
      'No incidents or notable events reported this quarter.';

    // Existing record — never overwrite a signed or sent summary
    const existing = await base44.asServiceRole.entities.QuarterlySummary.filter({
      client_id,
      quarter: quarterLabel,
    });
    const current = existing[0] || null;
    if (current && (current.status === 'Signed' || current.status === 'Sent')) {
      return Response.json(
        {
          error: `The ${quarterLabel} quarterly summary is already ${current.status.toLowerCase()} and cannot be rebuilt.`,
          summary_id: current.id,
        },
        { status: 400 }
      );
    }

    // Preserve manager-written text, refresh the record-derived content
    const priorNarratives = new Map(
      (current?.goal_progress || []).map((row) => [row.goal_id, row.narrative])
    );
    const mergedGoals = goalProgress.map((row) => {
      const prior = String(priorNarratives.get(row.goal_id) || '').trim();
      return prior ? { ...row, narrative: prior } : row;
    });

    const staffRecord = (staff || []).find(
      (s) => String(s.email || '').toLowerCase() === String(user.email || '').toLowerCase()
    );
    const staffName = `${staffRecord?.first_name || ''} ${staffRecord?.last_name || ''}`.trim();
    const writerName = current?.writer_name || staffName || user.full_name || '';
    const writerId = current?.writer_id || staffRecord?.id || user.id;

    const relatedMonthlies = (monthlies || []).filter(
      (m) => m.period_start >= periodStart && m.period_start <= periodEnd
    );

    const isLate = todayISO() > dueDate;
    const status = isLate ? 'Late' : current?.status === 'Ready' ? 'Ready' : 'Draft';

    const data = {
      client_id,
      client_name: clientName,
      quarter: quarterLabel,
      quarter_number: quarterNumber,
      year: quarterYear,
      period_start: periodStart,
      period_end: periodEnd,
      due_date: dueDate,
      format: current?.format || 'Combined',
      services_provided: servicesProvided,
      services_summary: current?.services_summary || '',
      status_and_response: current?.status_and_response || '',
      notable_events: notableEvents,
      goal_progress: mergedGoals,
      monthly_summary_ids: relatedMonthlies.map((m) => m.id),
      monthly_summary_dates: relatedMonthlies.map((m) => m.month_year),
      writer_name: writerName,
      writer_id: writerId,
      status,
      late_flagged_at: isLate ? new Date().toISOString() : current?.late_flagged_at || '',
    };

    const summary = current
      ? await base44.asServiceRole.entities.QuarterlySummary.update(current.id, data)
      : await base44.asServiceRole.entities.QuarterlySummary.create(data);

    await base44.asServiceRole.entities.AuditLog.create({
      action: current ? 'quarterly_summary_rebuilt' : 'quarterly_summary_generated',
      event_type: 'generic',
      actor_id: staffRecord?.id || user.id,
      actor_name: writerName || user.full_name || user.email || 'Unknown',
      actor_email: user.email || '',
      actor_role: user.role || '',
      target_type: 'QuarterlySummary',
      target_id: summary.id,
      target_name: `${clientName} — ${quarterLabel}`,
      details: `${servicesProvided.length} service(s), ${mergedGoals.length} goal(s), ${relatedMonthlies.length} monthly summary source(s)`,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({
      success: true,
      summary_id: summary.id,
      quarter: quarterLabel,
      client_name: clientName,
      period_start: periodStart,
      period_end: periodEnd,
      due_date: dueDate,
      status,
      services: servicesProvided.length,
      goals: mergedGoals.length,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});