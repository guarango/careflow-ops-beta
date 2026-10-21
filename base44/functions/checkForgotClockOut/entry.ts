import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Called by scheduled workflow every 5 minutes
// Checks shifts where the scheduled end time has passed with no clock-out:
//   - 15 min after end → notify the DSP
//   - 60 min after end → escalate to their manager

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const nowMs = now.getTime();
    const todayStr = now.toISOString().split('T')[0];

    // Get all shifts for today that are In Progress (clocked in, not clocked out)
    const shiftsPage = await base44.asServiceRole.entities.ShiftSchedule.filter({
      status: 'In Progress',
      date: todayStr,
    }, { limit: 500 });
    const shifts = shiftsPage?.items || [];

    if (shifts.length === 0) {
      return Response.json({ success: true, checkedAt: now.toISOString(), notificationsSent: 0 });
    }

    // Also check yesterday's shifts (in case a shift ended late at night and was never clocked out)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayShiftsPage = await base44.asServiceRole.entities.ShiftSchedule.filter({
      status: 'In Progress',
      date: yesterdayStr,
    }, { limit: 500 }).catch(() => ({ items: [] }));
    const yesterdayShifts = yesterdayShiftsPage?.items || [];

    const allShifts = [...shifts, ...yesterdayShifts];

    // Get existing notifications to dedupe
    const existingNotifs = await base44.asServiceRole.entities.AppNotification
      .filter({ related_record_type: 'timecard' })
      .catch(() => []);

    const notifiedKeys = new Set(
      (existingNotifs || [])
        .filter(n => n.status !== 'dismissed')
        .map(n => `${n.related_record_id}__${n.trigger_stage}__${n.recipient_user_id}`)
    );

    // Build staff lookup map for user_id resolution
    const staffIds = [...new Set(allShifts.map(s => s.staff_id).filter(Boolean))];
    const staffRecordsPage = staffIds.length > 0
      ? await base44.asServiceRole.entities.StaffMember.filter({ id: { $in: staffIds } }, { limit: 500 }).catch(() => ({ items: [] }))
      : { items: [] };
    const staffRecords = staffRecordsPage?.items || [];
    const staffMap = {};
    for (const s of staffRecords) {
      staffMap[s.id] = s;
    }

    // Build manager lookup: StaffMembers with role Supervisor/Admin who have house in assigned_house_ids
    const houseIds = [...new Set(allShifts.map(s => s.house_id).filter(Boolean))];
    const managersPage = houseIds.length > 0
      ? await base44.asServiceRole.entities.StaffMember.filter({
          role: { $in: ['Supervisor', 'Admin'] },
        }, { limit: 500 }).catch(() => ({ items: [] }))
      : { items: [] };
    const managers = managersPage?.items || [];
    const managersByHouse = {};
    for (const m of managers) {
      const assignedHouses = m.assigned_house_ids || [];
      for (const hid of assignedHouses) {
        if (!managersByHouse[hid]) managersByHouse[hid] = [];
        managersByHouse[hid].push(m);
      }
    }

    let notificationsSent = 0;

    for (const shift of allShifts) {
      if (!shift.end_time || !shift.date) continue;
      if (shift.evv_clock_out) continue; // already clocked out

      // Compute scheduled end datetime
      const endDateTimeStr = `${shift.date}T${shift.end_time}:00`;
      const endMs = new Date(endDateTimeStr).getTime();
      if (isNaN(endMs)) continue;

      const minutesSinceEnd = (nowMs - endMs) / (1000 * 60);
      if (minutesSinceEnd < 15) continue; // not yet 15 min past end

      const staff = staffMap[shift.staff_id];
      if (!staff || !staff.user_id) continue; // staff not linked to user yet

      const shiftId = shift.id;

      // 15-60 min: notify DSP
      if (minutesSinceEnd >= 15 && minutesSinceEnd < 60) {
        const stage = 'forgot_clockout_15min';
        const key = `${shiftId}__${stage}__${staff.user_id}`;
        if (notifiedKeys.has(key)) continue;

        const message = `Your shift ended at ${shift.end_time} but you haven't clocked out. Please clock out now.`;

        await base44.asServiceRole.entities.AppNotification.create({
          type: 'timecard_reminder',
          recipient_user_id: staff.user_id,
          recipient_email: staff.email || '',
          recipient_role: 'staff',
          staff_id: shift.staff_id,
          staff_name: shift.staff_name,
          related_record_id: shiftId,
          related_record_type: 'timecard',
          message,
          trigger_stage: stage,
          status: 'unread',
          email_sent: false,
        }).catch(() => {});

        notifiedKeys.add(key);
        notificationsSent++;
      }

      // 60+ min: escalate to manager
      if (minutesSinceEnd >= 60) {
        const stage = 'forgot_clockout_1hr';
        const houseManagers = managersByHouse[shift.house_id] || [];

        // Also notify the DSP if not already
        const dspKey = `${shiftId}__forgot_clockout_15min__${staff.user_id}`;
        if (!notifiedKeys.has(dspKey)) {
          const message = `Your shift ended at ${shift.end_time} but you haven't clocked out. Please clock out now.`;
          await base44.asServiceRole.entities.AppNotification.create({
            type: 'timecard_reminder',
            recipient_user_id: staff.user_id,
            recipient_email: staff.email || '',
            recipient_role: 'staff',
            staff_id: shift.staff_id,
            staff_name: shift.staff_name,
            related_record_id: shiftId,
            related_record_type: 'timecard',
            message,
            trigger_stage: 'forgot_clockout_15min',
            status: 'unread',
            email_sent: false,
          }).catch(() => {});
          notifiedKeys.add(dspKey);
          notificationsSent++;
        }

        for (const mgr of houseManagers) {
          if (!mgr.user_id) continue;
          const mgrKey = `${shiftId}__${stage}__${mgr.user_id}`;
          if (notifiedKeys.has(mgrKey)) continue;

          const message = `${shift.staff_name || 'Staff'} has not clocked out for a shift that ended at ${shift.end_time} (over 1 hour ago).`;

          await base44.asServiceRole.entities.AppNotification.create({
            type: 'timecard_escalation',
            recipient_user_id: mgr.user_id,
            recipient_email: mgr.email || '',
            recipient_role: 'admin',
            staff_id: shift.staff_id,
            staff_name: shift.staff_name,
            related_record_id: shiftId,
            related_record_type: 'timecard',
            message,
            trigger_stage: stage,
            status: 'unread',
            email_sent: false,
          }).catch(() => {});

          notifiedKeys.add(mgrKey);
          notificationsSent++;
        }
      }
    }

    return Response.json({
      success: true,
      checkedAt: now.toISOString(),
      notificationsSent,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}