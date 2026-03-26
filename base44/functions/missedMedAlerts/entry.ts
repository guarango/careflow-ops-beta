import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Time window map: scheduled time label -> wall clock hour (24h) for comparison
const TIME_WINDOW_HOURS = {
  "7:00 AM": 7,
  "Breakfast": 8,
  "8:00 AM": 8,
  "9:00 AM": 9,
  "10:00 AM": 10,
  "12:00 PM": 12,
  "2:00 PM": 14,
  "4:00 PM": 16,
  "Dinner": 18,
  "8:00 PM": 20,
  "9:00 PM": 21,
  "Bedtime": 21,
  "Unscheduled": null,
};

function getWindowHour(timeLabel) {
  return TIME_WINDOW_HOURS[timeLabel] ?? null;
}

function isMissedWindow(timeLabel, nowHour) {
  const windowHour = getWindowHour(timeLabel);
  if (windowHour === null) return false;
  // Missed = 30+ minutes past the scheduled hour (simplified as 1+ hour past for hourly scheduling)
  return nowHour >= windowHour + 1;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduled (no-auth) or admin invocation
  let isScheduled = false;
  try {
    const user = await base44.auth.me();
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    // Called from scheduler without user auth — allow via service role
    isScheduled = true;
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const nowHour = now.getHours();

  // Fetch all active medications, today's logs, and risk alerts for pattern detection
  const [medications, todayLogs, existingAlerts] = await Promise.all([
    base44.asServiceRole.entities.Medication.filter({ status: 'Active' }),
    base44.asServiceRole.entities.MedicationLog.filter({ date: today }),
    base44.asServiceRole.entities.RiskAlert.filter({ alert_type: 'medication', status: 'open' }),
  ]);

  const missedEntries = [];
  const loggedMedIds = new Set(todayLogs.map(l => `${l.medication_id}__${l.time?.slice(0,2) || ''}` ));

  for (const med of medications) {
    if (med.is_prn) continue; // PRN never triggers missed alerts
    if (!med.scheduled_times?.length) continue;

    for (const timeLabel of med.scheduled_times) {
      if (!isMissedWindow(timeLabel, nowHour)) continue;

      // Check if any log exists for this med today
      const hasLog = todayLogs.some(l => l.medication_id === med.id);
      if (hasLog) continue;

      // Check if alert already fired today for this med+time
      const alreadyAlerted = existingAlerts.some(
        a => a.data_snapshot?.medication_id === med.id &&
             a.data_snapshot?.scheduled_time === timeLabel &&
             a.data_snapshot?.alert_date === today
      );
      if (alreadyAlerted) continue;

      missedEntries.push({ med, timeLabel });
    }
  }

  const created = [];

  for (const { med, timeLabel } of missedEntries) {
    // Check for consecutive missed days pattern (3+ days)
    const past7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (i + 1));
      return d.toISOString().split('T')[0];
    });

    const recentLogs = await base44.asServiceRole.entities.MedicationLog.filter({
      medication_id: med.id,
    });

    let consecutiveMissed = 0;
    for (const day of past7Days.slice(0, 3)) {
      const dayLog = recentLogs.find(l => l.date === day);
      if (!dayLog || dayLog.status === 'Missed') {
        consecutiveMissed++;
      } else {
        break;
      }
    }

    const isPattern = consecutiveMissed >= 2; // today + 2 previous = 3 consecutive
    const severity = isPattern ? 'critical' : 'high';

    const title = isPattern
      ? `Pattern: ${med.medication_name} missed ${consecutiveMissed + 1}+ consecutive days`
      : `Missed Medication: ${med.medication_name} — ${timeLabel}`;

    const description = [
      `Client: ${med.client_name}`,
      `Medication: ${med.medication_name} ${med.dosage || ''}`,
      `Scheduled Time: ${timeLabel}`,
      `Alert Fired: ${now.toLocaleTimeString()}`,
      isPattern ? `Pattern detected: missed on ${consecutiveMissed + 1} or more consecutive days. Clinical review required.` : '',
    ].filter(Boolean).join('\n');

    const alert = await base44.asServiceRole.entities.RiskAlert.create({
      alert_type: 'medication',
      severity,
      client_id: med.client_id,
      client_name: med.client_name,
      title,
      description,
      recommended_action: 'Review eMAR for this client and document late administration, refusal, or hold. If pattern, escalate to clinical supervisor.',
      status: 'open',
      data_snapshot: {
        medication_id: med.id,
        medication_name: med.medication_name,
        dosage: med.dosage,
        scheduled_time: timeLabel,
        alert_date: today,
        alert_fired_at: now.toISOString(),
        is_pattern: isPattern,
        consecutive_missed_days: consecutiveMissed + 1,
        program: med.client_name,
      },
    });

    created.push(alert.id);
  }

  // Escalation: check open alerts older than 60 minutes that haven't been acknowledged
  const openAlerts = await base44.asServiceRole.entities.RiskAlert.filter({
    alert_type: 'medication',
    status: 'open',
  });

  let escalated = 0;
  for (const alert of openAlerts) {
    if (!alert.data_snapshot?.alert_fired_at) continue;
    if (alert.severity === 'critical') continue; // already escalated
    const firedAt = new Date(alert.data_snapshot.alert_fired_at);
    const minutesOld = (now - firedAt) / 60000;
    if (minutesOld >= 60) {
      await base44.asServiceRole.entities.RiskAlert.update(alert.id, {
        severity: 'critical',
        title: `ESCALATED — ${alert.title}`,
        description: `${alert.description}\n\n⚠️ ESCALATED: Alert not acknowledged within 60 minutes. Urgent review required by agency administrator.`,
        data_snapshot: {
          ...alert.data_snapshot,
          escalated_at: now.toISOString(),
        },
      });
      escalated++;
    }
  }

  return Response.json({
    success: true,
    missed_alerts_created: created.length,
    alerts_escalated: escalated,
    checked_at: now.toISOString(),
  });
});