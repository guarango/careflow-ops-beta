import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called on the 1st of each month (or manually by a manager).
// Drafts a MonthlySummary for every active client from the previous month's:
//   - session notes (goal_data, summary, health_safety_flags)
//   - client goals (progress_entries)
//   - incident reports
//   - medication logs
//
// The AI is instructed to use ONLY facts in the records — no speculation.
// Each statement links to its source session note IDs.
// Managers can regenerate anytime via the same function.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Determine the target month
    const now = new Date();
    let targetYear, targetMonth;

    if (body.year != null && body.month != null) {
      targetYear = body.year;
      targetMonth = body.month; // 0-indexed
    } else {
      // Default: previous month
      const target = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      targetYear = target.getFullYear();
      targetMonth = target.getMonth();
    }

    const periodStart = new Date(targetYear, targetMonth, 1);
    const periodEnd = new Date(targetYear, targetMonth + 1, 0); // last day of month
    const periodStartStr = periodStart.toISOString().split('T')[0];
    const periodEndStr = periodEnd.toISOString().split('T')[0];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthYear = `${monthNames[targetMonth]} ${targetYear}`;

    // Fetch all data
    const clients = await base44.asServiceRole.entities.Client.filter({ status: 'Active' });
    const targetClients = body.client_id
      ? clients.filter(c => c.id === body.client_id)
      : clients;

    // Fetch session notes for the target month (server-side date filter)
    const monthNotes = await base44.asServiceRole.entities.SessionNote.filter({
      date: { $gte: periodStartStr, $lte: periodEndStr }
    });

    // Fetch goals (all — needed for progress_entries per client)
    const allGoals = await base44.asServiceRole.entities.ClientGoal.filter({});

    // Fetch incidents for the target month
    const monthIncidents = await base44.asServiceRole.entities.IncidentReport.filter({
      date: { $gte: periodStartStr, $lte: periodEndStr }
    });

    // Fetch med logs for the target month
    const monthMedLogs = await base44.asServiceRole.entities.MedicationLog.filter({
      date: { $gte: periodStartStr, $lte: periodEndStr }
    });

    // Check for existing summaries (skip if already exists and not forcing)
    const existing = await base44.asServiceRole.entities.MonthlySummary.filter({
      client_id: { $in: targetClients.map(c => c.id) },
      period_start: periodStartStr,
    });

    const results = [];

    for (const client of targetClients) {
      const existingSummary = existing.find(s => s.client_id === client.id);
      if (existingSummary && !body.force_regenerate) {
        results.push({ client_id: client.id, client_name: `${client.first_name} ${client.last_name}`, status: 'already_exists', summary_id: existingSummary.id });
        continue;
      }

      // Gather client-specific data
      const clientNotes = monthNotes.filter(n => n.client_id === client.id);
      const clientGoals = allGoals.filter(g => g.client_id === client.id);
      const clientIncidents = monthIncidents.filter(i => i.client_id === client.id);
      const clientMedLogs = monthMedLogs.filter(l => l.client_id === client.id);

      // Build goal progress data
      const goalData = clientGoals.map(goal => {
        const monthEntries = (goal.progress_entries || []).filter(e =>
          e.date >= periodStartStr && e.date <= periodEndStr
        );
        return {
          goal_title: goal.goal_title,
          domain: goal.domain,
          sessions_charted: monthEntries.length,
          entries: monthEntries.map(e => ({
            date: e.date,
            score: e.score,
            prompt_level: e.prompt_level,
            trials_correct: e.trials_correct,
            trials_total: e.trials_total,
            notes: e.notes,
          })),
        };
      }).filter(g => g.sessions_charted > 0);

      // Build the AI prompt with ONLY factual data
      const prompt = buildPrompt(client, monthYear, periodStartStr, periodEndStr, clientNotes, goalData, clientIncidents, clientMedLogs);

      const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            how_month_went: { type: 'string', description: 'Narrative summary of how the month went, based only on facts in the records' },
            goals_summary: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  goal_title: { type: 'string' },
                  sessions_charted: { type: 'number' },
                  progress_summary: { type: 'string', description: 'Progress toward this goal with specific numbers from the data' },
                  source_note_ids: { type: 'array', items: { type: 'string' } }
                }
              }
            },
            notable_events: { type: 'string', description: 'Any incidents, behavioral events, health changes, or notable occurrences' }
          },
          required: ['how_month_went', 'goals_summary', 'notable_events']
        }
      });

      // Merge source note IDs from AI response with actual note IDs
      const sourceNoteIds = clientNotes.map(n => n.id);

      const summaryData = {
        client_id: client.id,
        client_name: `${client.first_name} ${client.last_name}`,
        month_year: monthYear,
        period_start: periodStartStr,
        period_end: periodEndStr,
        status: 'Pending Review',
        ai_generated: true,
        ai_generated_at: new Date().toISOString(),
        how_month_went: aiResponse.how_month_went,
        goals_summary: (aiResponse.goals_summary || []).map(gs => ({
          goal_title: gs.goal_title,
          sessions_charted: gs.sessions_charted,
          progress_summary: gs.progress_summary,
          source_note_ids: (gs.source_note_ids || []).filter(id => sourceNoteIds.includes(id))
        })),
        notable_events: aiResponse.notable_events,
        source_note_ids: sourceNoteIds,
        source_data: {
          note_count: clientNotes.length,
          incident_count: clientIncidents.length,
          med_pass_count: clientMedLogs.length,
          goals_charted_count: goalData.length
        }
      };

      let summary;
      if (existingSummary && body.force_regenerate) {
        summary = await base44.asServiceRole.entities.MonthlySummary.update(existingSummary.id, summaryData);
      } else {
        summary = await base44.asServiceRole.entities.MonthlySummary.create(summaryData);
      }

      results.push({
        client_id: client.id,
        client_name: summaryData.client_name,
        status: 'drafted',
        summary_id: summary.id,
        note_count: clientNotes.length,
        incident_count: clientIncidents.length,
        goals_charted: goalData.length
      });
    }

    return Response.json({
      success: true,
      month_year: monthYear,
      period_start: periodStartStr,
      period_end: periodEndStr,
      total_clients: targetClients.length,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});

function buildPrompt(client, monthYear, periodStart, periodEnd, notes, goalData, incidents, medLogs) {
  const clientName = `${client.first_name} ${client.last_name}`;
  const noteSummaries = notes.map(n => ({
    date: n.date,
    summary: n.summary || n.ai_cleaned_summary || '',
    location: n.location,
    goal_data: (n.goal_data || []).map(gd => ({
      goal_title: gd.goal_title,
      trials_correct: gd.trials_correct,
      trials_total: gd.trials_total,
      percentage: gd.percentage,
      prompt_level: gd.prompt_level,
      narrative: gd.narrative,
      engagement: gd.engagement,
    })),
    health_flags: n.health_safety_flags,
    note_id: n.id,
  }));

  const incidentData = incidents.map(i => ({
    date: i.date,
    type: i.type,
    severity: i.severity,
    description: i.description,
    actions_taken: i.actions_taken,
  }));

  const medData = medLogs.map(l => ({
    date: l.date,
    medication_name: l.medication_name,
    status: l.status,
    reason: l.reason,
    is_late: l.is_late,
  }));

  return `You are drafting a Monthly Summary for ${clientName} for ${monthYear}.

CRITICAL RULES:
1. Use ONLY facts that appear in the records below. Do not speculate, invent, or assume.
2. Every statement must be traceable to a source note. Include source note IDs in the source_note_ids array for each goal.
3. If there is no data for a section, state "No data recorded for this period."
4. Use clear, professional language suitable for a DHHS-compliant case file.

=== SESSION NOTES (${notes.length} total) ===
${JSON.stringify(noteSummaries, null, 2)}

=== GOAL PROGRESS DATA ===
${JSON.stringify(goalData, null, 2)}

=== INCIDENTS (${incidents.length} total) ===
${JSON.stringify(incidentData, null, 2)}

=== MEDICATION LOGS (${medLogs.length} total) ===
${JSON.stringify(medData, null, 2)}

Now draft the monthly summary. For "how_month_went", write a narrative of how the month went based on the session notes and overall patterns. For each goal in goals_summary, include the goal title, number of sessions charted, a progress summary with specific numbers (percentages, trial counts, prompt levels), and the source note IDs that support the statements. For "notable_events", describe any incidents, behavioral escalations, health concerns, or medication issues.`;
}