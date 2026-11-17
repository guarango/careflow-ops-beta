// Compliance deadline rules shared by the dashboard function and the digest sender.
// Reads records already built in T1–T10; never re-implements their validation.

import { dueFiscalYearEndYear, fiscalYearBounds } from './annualReport.ts';

const DAY = 86400000;

export function localTodayISO(timeZone = 'America/Denver') {
  return new Date().toLocaleDateString('en-CA', { timeZone });
}

export function addDaysISO(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromISO, toISO) {
  return Math.round((Date.parse(`${toISO}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`)) / DAY);
}

export function weekStartISO(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return addDaysISO(iso, -d.getUTCDay());
}

async function fetchAll(fetchPage) {
  const items = [];
  let cursor;
  for (let i = 0; i < 20; i++) {
    const page = await fetchPage(cursor);
    items.push(...(page?.items || []));
    if (!page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  return items;
}

const COVERING = ['Ready', 'Submitted to SC', 'Revised'];

function monthsBack(iso, months) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 - months, d));
  return date.toISOString().slice(0, 10);
}

export function scopeFor(user) {
  if (user?.role === 'admin') return { mode: 'agency', clientIds: null, staffMemberId: user?.staff_member_id || '' };
  if (user?.role === 'manager') {
    return { mode: 'caseload', clientIds: new Set(user?.assigned_client_ids || []), staffMemberId: user?.staff_member_id || '' };
  }
  return { mode: 'self', clientIds: new Set(), staffMemberId: user?.staff_member_id || '' };
}

function noteMinutes(note) {
  const parse = (t) => {
    if (!t) return null;
    const [h, m] = String(t).split(':').map(Number);
    return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
  };
  const s = parse(note.start_time);
  const e = parse(note.end_time);
  if (s === null || e === null) return 0;
  let diff = e - s;
  if (diff < 0 && note.end_date && note.end_date !== note.date) diff += 1440;
  return diff > 0 ? diff : 0;
}

function toneFor({ red = 0, amber = 0 }) {
  if (red > 0) return 'red';
  if (amber > 0) return 'amber';
  return 'green';
}

export async function buildComplianceDeadlines(base44, user) {
  const db = base44.asServiceRole.entities;
  const today = localTodayISO();
  const weekStart = weekStartISO(today);
  const ago7 = addDaysISO(today, -7);
  const ago14 = addDaysISO(today, -14);
  const staffId = user?.staff_member_id || '';
  const scope = scopeFor(user);
  const inScope = (clientId) => scope.clientIds === null || (clientId ? scope.clientIds.has(clientId) : false);
  const isDsp = user?.role !== 'admin' && user?.role !== 'manager';
  const ownsNote = (note) =>
    !isDsp || note?.staff_id === staffId || note?.created_by_id === user?.id;

  const [
    plans,
    goals,
    quarters,
    monthlies,
    shifts,
    recentNotes,
    returnedNotes,
    daySessions,
    serviceCodes,
    annualReports,
  ] = await Promise.all([
    db.ISPlan.filter({ status: 'Active' }, { limit: 300 }).then((p) => p?.items || []).catch(() => []),
    fetchAll((cursor) => db.ClientGoal.list(cursor ? { limit: 500, cursor } : { limit: 500 })).catch(() => []),
    db.QuarterlySummary.list('-due_date', 300).catch(() => []),
    db.MonthlySummary.list('-due_date', 300).catch(() => []),
    fetchAll((cursor) => db.ShiftSchedule.filter(
      { date: { $gte: ago14, $lte: today } },
      cursor ? { limit: 500, cursor } : { limit: 500 },
    )).catch(() => []),
    fetchAll((cursor) => db.SessionNote.filter(
      { date: { $gte: ago14, $lte: today } },
      cursor ? { limit: 500, cursor } : { limit: 500 },
    )).catch(() => []),
    db.SessionNote.filter({ status: 'Returned' }, { limit: 200 }).then((p) => p?.items || []).catch(() => []),
    db.DayProgramSession.filter({ date: { $gte: weekStart, $lte: today } }, { limit: 300 }).then((p) => p?.items || []).catch(() => []),
    db.ServiceCode.list('-created_date', 300).catch(() => []),
    db.AnnualReport.list('-fiscal_year_end_year', 5).catch(() => []),
  ]);

  const codesById = new Map(serviceCodes.map((c) => [c.id, c]));
  const noteIds = new Set(recentNotes.map((n) => n.id));
  const notesByShift = new Set(recentNotes.map((n) => n.shift_id).filter(Boolean));
  const allNotes = [...recentNotes, ...returnedNotes.filter((n) => !noteIds.has(n.id))];

  const scopedPlans = plans.filter((p) => inScope(p.client_id));
  const scopedGoals = goals.filter((g) => inScope(g.client_id));
  const requiredFor = (plan) => (plan.services_on_plan || []).filter((svc) => {
    const code = codesById.get(svc.service_code_id);
    return code ? code.support_strategy_required !== false : true;
  });
  const strategiesOf = (plan) => goals.filter((g) => g.pcsp_id === plan.id);

  // ── 1. Support Strategies (SOW 1.24(5)) ────────────────────────────────
  const ssItems = [];
  scopedPlans.forEach((plan) => {
    const due = plan.support_strategy_due_date || (plan.activation_date ? addDaysISO(plan.activation_date, 30) : '');
    if (!due) return;
    const days = daysBetween(today, due);
    const covered = new Set();
    strategiesOf(plan).forEach((s) => {
      if (!COVERING.includes(s.strategy_status || 'Draft')) return;
      (s.service_code_ids || []).forEach((id) => covered.add(id));
    });
    const gaps = requiredFor(plan).filter((svc) => !covered.has(svc.service_code_id));
    if (!gaps.length) return;
    const label = `${plan.client_name || 'Person'} · ${gaps.length} service(s) without a strategy`;
    const severity = days < 0 ? 'red' : days <= 7 ? 'amber' : 'green';
    ssItems.push({
      group: days < 0 ? 'Overdue' : days <= 7 ? 'Due in 7 days' : 'Upcoming',
      id: `plan-${plan.id}`,
      label,
      sublabel: `Support Strategies due ${due} (${gaps.map((g) => g.service_code || codesById.get(g.service_code_id)?.code || 'service').join(', ')})`,
      date: due,
      days,
      link: '/isp',
      severity,
    });
    gaps.forEach((svc) => {
      ssItems.push({
        group: 'Services without a strategy',
        id: `gap-${plan.id}-${svc.service_code_id}`,
        label: `${svc.service_code || codesById.get(svc.service_code_id)?.code || 'Service'} has no Support Strategy`,
        sublabel: `${plan.client_name || 'Person'} · PCSP activated ${plan.activation_date || '—'}`,
        date: due,
        days,
        link: '/isp',
        severity: days < 0 ? 'red' : 'amber',
      });
    });
  });
  const ssDue7 = ssItems.filter((i) => i.group === 'Due in 7 days').length;
  const ssOverdue = ssItems.filter((i) => i.group === 'Overdue').length;
  const ssGaps = ssItems.filter((i) => i.group === 'Services without a strategy').length;

  // ── 2. Quarterly summaries (SOW 1.25) ──────────────────────────────────
  const qItems = [];
  quarters.filter((q) => inScope(q.client_id)).forEach((q) => {
    const sent = q.status === 'Sent';
    if (sent) return;
    const late = !!q.due_date && q.due_date < today;
    const days = q.due_date ? daysBetween(today, q.due_date) : null;
    const group = late ? 'Late' : days !== null && days <= 5 ? 'Due in 5 days' : 'Drafts open';
    qItems.push({
      group,
      id: q.id,
      label: `${q.client_name || 'Person'} · ${q.quarter || 'Quarter'}`,
      sublabel: `Due ${q.due_date || '—'} · ${q.status || 'Draft'}`,
      date: q.due_date,
      days,
      link: `/summaries/quarterly/${q.id}`,
      severity: late ? 'red' : group === 'Due in 5 days' ? 'amber' : 'green',
    });
  });

  // ── 3. Monthly deliverable summaries ───────────────────────────────────
  const mItems = [];
  monthlies.filter((m) => m.deliverable !== false && inScope(m.client_id)).forEach((m) => {
    if (m.status === 'Signed') return;
    const late = !!m.due_date && m.due_date < today;
    const days = m.due_date ? daysBetween(today, m.due_date) : null;
    const dueSoon = days !== null && days <= 7;
    if (!late && !dueSoon) return;
    mItems.push({
      group: late ? 'Late' : 'Due',
      id: m.id,
      label: `${m.client_name || 'Person'} · ${m.month_year || 'Month'}`,
      sublabel: `Due ${m.due_date || '—'} · ${m.status || 'Draft'}`,
      date: m.due_date,
      days,
      link: `/summaries/monthly/${m.id}`,
      severity: late ? 'red' : 'amber',
    });
  });

  // ── 4. PCSP renewals (R539-2-5(3)(a)) ──────────────────────────────────
  const rItems = [];
  scopedPlans.forEach((plan) => {
    const due = plan.renewal_meeting_due || plan.plan_year_end;
    if (!due) return;
    const days = daysBetween(today, due);
    if (days > 60) return;
    rItems.push({
      group: days < 0 ? 'Past' : days <= 30 ? 'Due in 30 days' : 'Due in 60 days',
      id: plan.id,
      label: `${plan.client_name || 'Person'} · PCSP renewal meeting`,
      sublabel: `Plan year ends ${plan.plan_year_end || due}`,
      date: due,
      days,
      link: '/isp',
      severity: days < 0 ? 'red' : days <= 30 ? 'amber' : 'green',
    });
  });

  // ── 5. Notes (SOW 1.10(7)) ─────────────────────────────────────────────
  const nItems = [];
  const scopedShifts = shifts.filter((s) => (isDsp ? s.staff_id === staffId : inScope(s.client_id)));
  scopedShifts.forEach((s) => {
    if (s.status === 'Cancelled' || s.status === 'No Show') return;
    if (s.date >= today) return;
    if (s.id && notesByShift.has(s.id)) return;
    nItems.push({
      group: 'Shifts with no note',
      id: `shift-${s.id}`,
      label: `${s.client_name || 'Person'} · ${s.date}`,
      sublabel: `${s.staff_name || 'Unassigned'} · ${s.service_code || s.service_type || 'Shift'}`,
      date: s.date,
      days: daysBetween(today, s.date),
      link: '/session-notes',
      severity: 'red',
    });
  });
  allNotes.filter((n) => n.status === 'Returned' && ownsNote(n) && (isDsp || inScope(n.client_id))).forEach((n) => {
    nItems.push({
      group: 'Returned and not fixed',
      id: `note-${n.id}`,
      label: `${n.client_name || 'Person'} · ${n.date}`,
      sublabel: n.returned_comment || 'Returned for correction',
      date: n.date,
      days: n.date ? daysBetween(today, n.date) : null,
      link: '/session-notes',
      severity: 'red',
    });
  });
  allNotes.filter((n) => (n.late_entry || n.is_late) && n.date >= ago7 && ownsNote(n) && (isDsp || inScope(n.client_id))).forEach((n) => {
    nItems.push({
      group: 'Late entries this week',
      id: `late-${n.id}`,
      label: `${n.client_name || 'Person'} · ${n.date}`,
      sublabel: `${n.staff_name || 'Staff'} · ${n.service_code || 'Service'}`,
      date: n.date,
      days: n.date ? daysBetween(today, n.date) : null,
      link: '/session-notes',
      severity: 'amber',
    });
  });

  // ── 6. Goal data (SOW 1.25(5)) ─────────────────────────────────────────
  const gItems = [];
  scopedGoals.forEach((goal) => {
    const entries = goal.progress_entries || [];
    const flagged = entries.filter((e) => e.status === 'Flagged').length;
    if (flagged > 0) {
      gItems.push({
        group: 'Flagged entries awaiting review',
        id: `goal-${goal.id}`,
        label: `${goal.goal_title || 'Goal'} · ${flagged} flagged`,
        sublabel: goal.client_name || 'Person',
        date: '',
        days: null,
        link: '/goals',
        severity: 'amber',
      });
    }
    if (goal.charting_mode === 'Scheduled' && goal.status === 'Active') {
      const recent = entries.filter((e) => e.date && e.date >= ago7);
      const charted = recent.some((e) => (e.status || 'Valid') === 'Valid' && !e.missed_reason);
      const excused = recent.some((e) => e.missed_reason);
      if (!charted && !excused) {
        gItems.push({
          group: 'Scheduled goals missed without reason',
          id: `missed-${goal.id}`,
          label: goal.goal_title || 'Goal',
          sublabel: `${goal.client_name || 'Person'} · nothing charted in 7 days`,
          date: '',
          days: null,
          link: '/goals',
          severity: 'red',
        });
      }
    }
  });

  // ── 7. Day supports (SOW 7.3(2), 8.4(5)) ───────────────────────────────
  const dItems = [];
  const codeOf = (s) => String(s.service_code || codesById.get(s.service_code_id)?.code || '').toUpperCase();
  daySessions.forEach((session) => {
    if (codeOf(session) !== 'DSG') return;
    const persons = (session.client_ids || []).length;
    const staff = (session.staff_ids || []).length;
    if (session.ratio_override_reason) return;
    const over = persons > 0 && (staff === 0 || persons > staff * 6);
    if (!over) return;
    if (!isDsp && scope.clientIds !== null && !(session.client_ids || []).some((id) => scope.clientIds.has(id))) return;
    dItems.push({
      group: 'DSG ratio warnings this week',
      id: `dsg-${session.id}`,
      label: `${session.site_name || session.setting || 'Day program'} · ${persons} persons / ${staff} staff`,
      sublabel: `${session.date} · above 1:6 unless the PCSP documents one-to-one`,
      date: session.date,
      days: session.date ? daysBetween(today, session.date) : null,
      link: '/day-program',
      severity: 'red',
    });
  });
  const dsiByClient = new Map();
  recentNotes.filter((n) => n.date >= weekStart && codeOf(n) === 'DSI' && n.status !== 'Draft' && n.status !== 'Returned' && (isDsp ? ownsNote(n) : inScope(n.client_id))).forEach((n) => {
    const minutes = noteMinutes(n);
    if (!minutes) return;
    const key = n.client_id || n.client_name || 'unknown';
    const row = dsiByClient.get(key) || { client_id: n.client_id, client_name: n.client_name || 'Person', site: 0, total: 0 };
    row.total += minutes;
    if (n.setting === 'Site-based day program') row.site += minutes;
    dsiByClient.set(key, row);
  });
  dsiByClient.forEach((row) => {
    if (!(row.site > 0 && row.site * 2 > row.total)) return;
    dItems.push({
      group: 'DSI site-based warnings',
      id: `dsi-${row.client_id}`,
      label: `${row.client_name} · ${Math.round((row.site / row.total) * 100)}% of DSI minutes site-based`,
      sublabel: 'DSI may not be delivered site-based for the majority of the week (SOW 8.4(5))',
      date: weekStart,
      days: 0,
      link: '/day-program',
      severity: 'amber',
    });
  });

  // ── 8. Annual report (July and August only) ────────────────────────────
  const annualItems = [];
  const todayMonth = Number(today.slice(5, 7));
  let annualCard = null;
  if (todayMonth === 7 || todayMonth === 8) {
    const yearEnd = dueFiscalYearEndYear(new Date(`${today}T12:00:00`));
    const bounds = fiscalYearBounds(yearEnd);
    const record = annualReports.find((r) => Number(r.fiscal_year_end_year) === yearEnd);
    const submitted = record?.status === 'Submitted';
    const days = daysBetween(today, bounds.due);
    annualItems.push({
      group: submitted ? 'Submitted' : days < 0 ? 'Past due' : 'Open',
      id: record?.id || 'annual',
      label: `Annual DSPD report · ${bounds.label}`,
      sublabel: submitted
        ? `Submitted ${record?.submission_date || ''}`
        : `State Google Form due ${bounds.due}`,
      date: bounds.due,
      days,
      link: '/reports/annual',
      severity: submitted ? 'green' : days <= 30 ? 'red' : 'amber',
    });
    annualCard = {
      key: 'annual_report',
      title: 'Annual DSPD report',
      citation: 'DHHS91172 annual report — due August 30',
      icon: 'file-chart',
      tone: submitted ? 'green' : days <= 30 ? 'red' : 'amber',
      total: submitted ? 0 : 1,
      submetrics: [
        { key: 'days', label: 'Days to Aug 30', count: Math.max(days, 0), tone: submitted ? 'green' : days <= 30 ? 'red' : 'amber' },
        { key: 'total', label: 'Reports open', count: submitted ? 0 : 1, tone: submitted ? 'green' : 'amber' },
      ],
      items: annualItems,
    };
  }

  const cards = [
    {
      key: 'support_strategies',
      title: 'Support Strategies',
      citation: 'DHHS91172 SOW 1.24(5) — within 30 days of PCSP activation',
      icon: 'clock-exclamation',
      tone: toneFor({ red: ssOverdue, amber: ssDue7 }),
      total: ssDue7 + ssOverdue + ssGaps,
      submetrics: [
        { key: 'due7', label: 'Due in 7 days', count: ssDue7, tone: 'amber' },
        { key: 'overdue', label: 'Overdue', count: ssOverdue, tone: 'red' },
        { key: 'gaps', label: 'Services with no strategy', count: ssGaps, tone: 'amber' },
      ],
      items: ssItems,
    },
    {
      key: 'quarterly',
      title: 'Quarterly summaries',
      citation: 'DHHS91172 SOW 1.25 — within 15 calendar days of quarter end',
      icon: 'file-alert',
      tone: toneFor({
        red: qItems.filter((i) => i.group === 'Late').length,
        amber: qItems.filter((i) => i.group === 'Due in 5 days').length,
      }),
      total: qItems.length,
      submetrics: [
        { key: 'drafts', label: 'Drafts open', count: qItems.filter((i) => i.group === 'Drafts open').length, tone: 'amber' },
        { key: 'due5', label: 'Due in 5 days', count: qItems.filter((i) => i.group === 'Due in 5 days').length, tone: 'amber' },
        { key: 'late', label: 'Late', count: qItems.filter((i) => i.group === 'Late').length, tone: 'red' },
      ],
      items: qItems,
    },
    {
      key: 'monthly',
      title: 'Monthly deliverable summaries',
      citation: 'DHHS91172 SOW 1.25 — monthly-cadence codes',
      icon: 'calendar-due',
      tone: toneFor({
        red: mItems.filter((i) => i.group === 'Late').length,
        amber: mItems.filter((i) => i.group === 'Due').length,
      }),
      total: mItems.length,
      submetrics: [
        { key: 'due', label: 'Due', count: mItems.filter((i) => i.group === 'Due').length, tone: 'amber' },
        { key: 'late', label: 'Late', count: mItems.filter((i) => i.group === 'Late').length, tone: 'red' },
      ],
      items: mItems,
    },
    {
      key: 'pcsp_renewals',
      title: 'PCSP renewals',
      citation: 'Utah Admin Code R539-2-5(3)(a) — team meets at least every 12 months',
      icon: 'users-group',
      tone: toneFor({
        red: rItems.filter((i) => i.group === 'Past').length,
        amber: rItems.filter((i) => i.group !== 'Past').length,
      }),
      total: rItems.length,
      submetrics: [
        { key: 'd60', label: 'Due in 60 days', count: rItems.filter((i) => i.group === 'Due in 60 days').length, tone: 'amber' },
        { key: 'd30', label: 'Due in 30 days', count: rItems.filter((i) => i.group === 'Due in 30 days').length, tone: 'amber' },
        { key: 'past', label: 'Past', count: rItems.filter((i) => i.group === 'Past').length, tone: 'red' },
      ],
      items: rItems,
    },
    {
      key: 'notes',
      title: 'Service notes',
      citation: 'DHHS91172 SOW 1.10(7) — a daily note for every billed service',
      icon: 'file-alert',
      tone: toneFor({
        red: nItems.filter((i) => i.severity === 'red').length,
        amber: nItems.filter((i) => i.severity === 'amber').length,
      }),
      total: nItems.length,
      submetrics: [
        { key: 'no_note', label: 'Shifts with no note', count: nItems.filter((i) => i.group === 'Shifts with no note').length, tone: 'red' },
        { key: 'returned', label: 'Returned, not fixed', count: nItems.filter((i) => i.group === 'Returned and not fixed').length, tone: 'red' },
        { key: 'late', label: 'Late this week', count: nItems.filter((i) => i.group === 'Late entries this week').length, tone: 'amber' },
      ],
      items: nItems,
    },
    {
      key: 'goal_data',
      title: 'Goal data',
      citation: 'DHHS91172 SOW 1.25(5) — flagged entries and missed scheduled goals',
      icon: 'calendar-due',
      tone: toneFor({
        red: gItems.filter((i) => i.group === 'Scheduled goals missed without reason').length,
        amber: gItems.filter((i) => i.group === 'Flagged entries awaiting review').length,
      }),
      total: gItems.length,
      submetrics: [
        { key: 'flagged', label: 'Flagged entries', count: gItems.filter((i) => i.group === 'Flagged entries awaiting review').length, tone: 'amber' },
        { key: 'missed', label: 'Scheduled goals missed', count: gItems.filter((i) => i.group === 'Scheduled goals missed without reason').length, tone: 'red' },
      ],
      items: gItems,
    },
    {
      key: 'day_supports',
      title: 'Day supports',
      citation: 'DHHS91172 SOW 7.3(2) ratio / 8.4(5) DSI setting',
      icon: 'users-group',
      tone: toneFor({
        red: dItems.filter((i) => i.group === 'DSG ratio warnings this week').length,
        amber: dItems.filter((i) => i.group === 'DSI site-based warnings').length,
      }),
      total: dItems.length,
      submetrics: [
        { key: 'dsg', label: 'DSG ratio warnings', count: dItems.filter((i) => i.group === 'DSG ratio warnings this week').length, tone: 'red' },
        { key: 'dsi', label: 'DSI site-based warnings', count: dItems.filter((i) => i.group === 'DSI site-based warnings').length, tone: 'amber' },
      ],
      items: dItems,
    },
  ];
  if (annualCard) cards.push(annualCard);

  return {
    generated_at: new Date().toISOString(),
    today,
    role: user?.role || 'dsp',
    scope_mode: scope.mode,
    cards,
  };
}

/** Items a digest should report: late, or due within the given window. */
export function digestItems(deadlines, withinDays = 7) {
  const out = [];
  for (const card of deadlines.cards || []) {
    for (const item of card.items || []) {
      if (item.group === 'Submitted') continue;
      const late = item.severity === 'red' && (item.days === null || item.days < 0 || /Late|Overdue|Past|Returned|no note|missed/i.test(item.group));
      const soon = typeof item.days === 'number' && item.days >= 0 && item.days <= withinDays;
      if (late || soon) out.push({ card: card.key, cardTitle: card.title, ...item });
    }
  }
  return out;
}

/** Only items the rule calls late (not merely red because of a missing strategy). */
export function lateItems(deadlines) {
  const out = [];
  for (const card of deadlines.cards || []) {
    for (const item of card.items || []) {
      const late =
        (typeof item.days === 'number' && item.days < 0) ||
        ['Late', 'Past', 'Past due', 'Returned and not fixed', 'Shifts with no note', 'Scheduled goals missed without reason'].includes(item.group);
      if (late) out.push({ card: card.key, cardTitle: card.title, ...item });
    }
  }
  return out;
}