import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// T5 migration — DHHS91172 SOW 1.25(5).
//
// Finds existing goal data entries that cannot be true (correct trials above
// total tries, a score above 100%) or that do not record who entered them and
// marks them Flagged for manager review. The numbers are never changed; a
// manager flags, excludes or restores an entry with a reason.
//
// Admin only. Safe to re-run: already reviewed entries are left as they are.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const goals = await base44.asServiceRole.entities.ClientGoal.list();
    const now = new Date().toISOString();

    let scanned = 0;
    let flagged = 0;
    let validated = 0;
    const changes = [];

    for (const goal of goals) {
      const entries = goal.progress_entries || [];
      let touched = false;

      const next = entries.map((entry) => {
        scanned += 1;
        const correct = Number(entry.trials_correct);
        const total = Number(entry.trials_total);
        const hasTrials = Number.isFinite(correct) && Number.isFinite(total) && total > 0;
        const storedPct = entry.percentage === null || entry.percentage === undefined || entry.percentage === ''
          ? null
          : Number(entry.percentage);
        const pct = Number.isFinite(storedPct) ? storedPct : (hasTrials ? Math.round((correct / total) * 100) : null);

        const issues = [];
        if (hasTrials && correct > total) issues.push(`${correct} correct of ${total} tries${pct !== null ? ` (${pct}%)` : ''}`);
        if (pct !== null && pct > 100) issues.push(`score ${pct}% is above 100%`);
        if (!entry.recorded_by && !entry.staff_name && !entry.missed_reason) issues.push('no staff member recorded');

        if (issues.length === 0) {
          if (!entry.status) {
            touched = true;
            validated += 1;
            return { ...entry, status: 'Valid' };
          }
          return entry;
        }

        // Never reopen an entry a manager already excluded.
        if (entry.status === 'Excluded' || entry.status === 'Flagged') return entry;

        touched = true;
        flagged += 1;
        return {
          ...entry,
          status: 'Flagged',
          flagged_reason: issues.join('; '),
          flagged_by: 'Migration T5',
          flagged_at: now,
        };
      });

      if (touched) {
        await base44.asServiceRole.entities.ClientGoal.update(goal.id, { progress_entries: next });
        const newlyFlagged = next.filter((e, i) => e.status === 'Flagged' && entries[i]?.status !== 'Flagged');
        if (newlyFlagged.length) {
          changes.push({
            goal: goal.goal_title,
            client_name: goal.client_name,
            entries: newlyFlagged.map((e) => ({ date: e.date, score: e.score, reason: e.flagged_reason })),
          });
        }
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      action: 'goal_data_migration',
      event_type: 'generic',
      actor_id: user.id || '',
      actor_name: user.full_name || user.email || 'Unknown',
      actor_email: user.email || '',
      actor_role: user.role || 'admin',
      target_type: 'ClientGoal',
      target_name: `${goals.length} goals scanned`,
      field: 'progress_entries',
      new_value: `${flagged} flagged`,
      details: `Scanned ${scanned} goal data entries; ${flagged} flagged for manager review; ${validated} confirmed Valid. Numbers unchanged.`,
      timestamp: now,
    }).catch(() => null);

    return Response.json({ success: true, goals: goals.length, scanned, flagged, validated, changes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});