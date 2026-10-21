import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { shift_id } = body;
    if (!shift_id) return Response.json({ error: 'shift_id required' }, { status: 400 });

    // Load settings
    const { items: settingsList } = await base44.asServiceRole.entities.RecognitionSettings.filter({});
    const settings = settingsList[0];
    if (!settings || !settings.enabled) {
      return Response.json({ skipped: true, reason: 'recognition_disabled' });
    }
    const pv = settings.point_values || {};

    // Load shift
    const shift = await base44.asServiceRole.entities.ShiftSchedule.get(shift_id);
    if (!shift) return Response.json({ error: 'shift not found' }, { status: 404 });
    if (shift.status !== 'Completed') return Response.json({ skipped: true, reason: 'shift_not_completed' });

    // Dedup: skip if points already awarded for this shift
    const { items: existing } = await base44.asServiceRole.entities.RecognitionPoint.filter({ shift_id, staff_id: shift.staff_id });
    if (existing.length > 0) return Response.json({ skipped: true, reason: 'already_awarded' });

    const shiftDate = shift.date;

    // Load related data in parallel
    const [notesRes, medLogsRes, goalsRes, evvLogsRes] = await Promise.all([
      base44.asServiceRole.entities.SessionNote.filter({ shift_id }),
      base44.asServiceRole.entities.MedicationLog.filter({ client_id: shift.client_id, date: shiftDate }),
      base44.asServiceRole.entities.ClientGoal.filter({ client_id: shift.client_id }),
      base44.asServiceRole.entities.EVVLog.filter({ shift_id }),
    ]);

    const note = notesRes.items[0];
    const medLogs = medLogsRes.items;
    const goals = goalsRes.items;
    const evvLogs = evvLogsRes.items;

    // Helper: parse "HH:mm" to minutes
    const toMin = (t) => {
      if (!t || typeof t !== 'string') return null;
      const parts = t.split(':');
      if (parts.length < 2) return null;
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    };

    const pointsToAward = [];

    // 1. On-time clock in (within 5 min grace)
    const clockInMin = toMin(shift.evv_clock_in);
    const startMin = toMin(shift.start_time);
    if (clockInMin !== null && startMin !== null && clockInMin <= startMin + 5) {
      pointsToAward.push({ action: 'clock_in_on_time', points: pv.clock_in_on_time ?? 5 });
    }

    // 2. On-time clock out (within 5 min grace)
    const clockOutMin = toMin(shift.evv_clock_out);
    const endMin = toMin(shift.end_time);
    if (clockOutMin !== null && endMin !== null && clockOutMin <= endMin + 5) {
      pointsToAward.push({ action: 'clock_out_on_time', points: pv.clock_out_on_time ?? 5 });
    }

    // 3. Note submitted on time (approved status counts)
    if (note && (note.status === 'Approved' || note.status === 'Pending Review' || note.status === 'Signed')) {
      pointsToAward.push({ action: 'note_on_time', points: pv.note_on_time ?? 10 });
      // 4. Same-shift bonus: note submitted before clock-out
      if (shift.evv_clock_out) {
        pointsToAward.push({ action: 'note_same_shift_bonus', points: pv.note_same_shift_bonus ?? 5 });
      }
    }

    // 5. Med pass on time with no errors
    if (medLogs.length > 0) {
      const allClean = medLogs.every(m => m.status === 'Administered' && !m.is_late);
      if (allClean) {
        pointsToAward.push({ action: 'med_pass_on_time_clean', points: pv.med_pass_on_time_clean ?? 10 });
      }
    }

    // 6. Goal data collected (at least one progress entry for this shift)
    const goalEntries = goals.flatMap(g => (g.progress_entries || []).filter(e => e.date === shiftDate && (e.shift_id === shift_id || !e.shift_id)));
    if (goalEntries.length > 0) {
      pointsToAward.push({ action: 'goal_data_collected', points: pv.goal_data_collected ?? 5 });
    }

    // 7. Shift streak — qualifies if: note submitted by clock-out, all scheduled meds charted or have reason, no open EVV exception
    const streakQualifies = note &&
      medLogs.every(m => m.status !== 'Missed') &&
      evvLogs.every(e => e.status !== 'Exception' && e.status !== 'Open');

    if (streakQualifies) {
      pointsToAward.push({ action: 'shift_streak', points: pv.shift_streak_base ?? 5 });

      // Update streak
      const { items: streakRecords } = await base44.asServiceRole.entities.StaffStreak.filter({ staff_id: shift.staff_id });
      let streak = streakRecords[0];

      if (!streak) {
        await base44.asServiceRole.entities.StaffStreak.create({
          staff_id: shift.staff_id,
          staff_name: shift.staff_name,
          current_streak: 1,
          longest_streak: 1,
          last_streak_date: shiftDate,
          opted_into_leaderboard: settings.leaderboard_opt_in_default || false
        });
      } else {
        const lastDate = new Date(streak.last_streak_date);
        const today = new Date(shiftDate);
        const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));

        let newStreak;
        if (diffDays === 1) {
          newStreak = (streak.current_streak || 0) + 1;
        } else if (diffDays === 0) {
          newStreak = streak.current_streak || 1;
        } else {
          newStreak = 1;
        }

        await base44.asServiceRole.entities.StaffStreak.update(streak.id, {
          current_streak: newStreak,
          longest_streak: Math.max(streak.longest_streak || 0, newStreak),
          last_streak_date: shiftDate
        });
      }
    }

    // Create point records
    if (pointsToAward.length > 0) {
      const records = pointsToAward.map(p => ({
        staff_id: shift.staff_id,
        staff_name: shift.staff_name,
        action: p.action,
        points: p.points,
        date: shiftDate,
        shift_id: shift_id,
        reason: p.action.replace(/_/g, ' ')
      }));
      await base44.asServiceRole.entities.RecognitionPoint.bulkCreate(records);
    }

    return Response.json({
      awarded: pointsToAward.length,
      total_points: pointsToAward.reduce((sum, p) => sum + p.points, 0),
      details: pointsToAward,
      streak: streakQualifies
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}