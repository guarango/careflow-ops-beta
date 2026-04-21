import { startOfWeek, endOfWeek, parseISO, format } from "date-fns";

/**
 * Given a list of timecards, compute per-employee weekly overtime.
 * Returns a Map: timecardId -> { isOT: bool, weekKey: string, weekTotal: number, regularHours: number, overtimeHours: number }
 */
export function computeOvertimeMap(timecards) {
  // Group by staff_id + ISO week key (Mon-Sun)
  const weekGroups = {}; // key: `${staffId}_${weekKey}` -> [timecard]

  for (const tc of timecards) {
    if (!tc.date || !tc.staff_id) continue;
    const d = parseISO(tc.date);
    const weekStart = startOfWeek(d, { weekStartsOn: 1 }); // Monday
    const weekKey = format(weekStart, "yyyy-MM-dd");
    const groupKey = `${tc.staff_id}_${weekKey}`;
    if (!weekGroups[groupKey]) weekGroups[groupKey] = [];
    weekGroups[groupKey].push(tc);
  }

  const result = {};

  for (const [groupKey, tcs] of Object.entries(weekGroups)) {
    const staffId = groupKey.split("_")[0];
    const weekKey = groupKey.split("_").slice(1).join("_");

    // Sort by date ascending
    const sorted = [...tcs].sort((a, b) => a.date.localeCompare(b.date));
    const weekTotal = sorted.reduce((sum, tc) => sum + (tc.total_hours || 0), 0);
    const OT_THRESHOLD = 40;
    const weekRegular = Math.min(weekTotal, OT_THRESHOLD);
    const weekOT = Math.max(0, weekTotal - OT_THRESHOLD);

    // Distribute OT across timecards (last ones spill into OT)
    let runningHours = 0;
    for (const tc of sorted) {
      const hours = tc.total_hours || 0;
      const before = runningHours;
      runningHours += hours;

      let tcRegular = hours;
      let tcOT = 0;

      if (runningHours > OT_THRESHOLD) {
        const overBy = runningHours - OT_THRESHOLD;
        tcOT = Math.min(hours, overBy);
        tcRegular = hours - tcOT;
      }

      const weekStart = parseISO(weekKey);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

      result[tc.id] = {
        isOT: runningHours > OT_THRESHOLD && tcOT > 0,
        weekKey,
        weekLabel: `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`,
        weekTotal,
        weekOT,
        tcRegular,
        tcOT,
        staffId,
      };
    }
  }

  return result;
}

/**
 * Generate pay periods for a given frequency, returning the 6 most recent completed ones.
 */
export function generatePayPeriods(frequency) {
  const today = new Date();
  const periods = [];

  if (frequency === "semi-monthly") {
    // 1st–15th and 16th–end of month
    let year = today.getFullYear();
    let month = today.getMonth(); // 0-indexed

    for (let i = 0; i < 6; i++) {
      // Second half of month: 16th – last day
      const endOfMonth = new Date(year, month + 1, 0);
      const start2 = new Date(year, month, 16);
      const end2 = endOfMonth;

      // First half of month: 1st – 15th
      const start1 = new Date(year, month, 1);
      const end1 = new Date(year, month, 15);

      // Only add completed periods (before today)
      if (end2 < today) {
        periods.push({ start: formatDate(start2), end: formatDate(end2), label: `${formatLabel(start2)} – ${formatLabel(end2)}` });
      }
      if (periods.length < 6 && end1 < today) {
        periods.push({ start: formatDate(start1), end: formatDate(end1), label: `${formatLabel(start1)} – ${formatLabel(end1)}` });
      }

      month--;
      if (month < 0) { month = 11; year--; }
      if (periods.length >= 6) break;
    }
  } else if (frequency === "weekly") {
    let d = new Date(today);
    // Go back to last completed Sunday
    d.setDate(d.getDate() - d.getDay()); // last Sunday
    for (let i = 0; i < 6; i++) {
      const end = new Date(d);
      end.setDate(end.getDate() - 1); // Saturday before
      const start = new Date(end);
      start.setDate(start.getDate() - 6); // Monday
      periods.push({ start: formatDate(start), end: formatDate(end), label: `${formatLabel(start)} – ${formatLabel(end)}` });
      d.setDate(d.getDate() - 7);
    }
  } else if (frequency === "bi-weekly") {
    let d = new Date(today);
    d.setDate(d.getDate() - d.getDay()); // back to last Sunday
    for (let i = 0; i < 6; i++) {
      const end = new Date(d);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 13);
      periods.push({ start: formatDate(start), end: formatDate(end), label: `${formatLabel(start)} – ${formatLabel(end)}` });
      d.setDate(d.getDate() - 14);
    }
  } else if (frequency === "monthly") {
    let year = today.getFullYear();
    let month = today.getMonth();

    for (let i = 0; i < 6; i++) {
      month--;
      if (month < 0) { month = 11; year--; }
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      periods.push({ start: formatDate(start), end: formatDate(end), label: `${formatLabel(start)} – ${formatLabel(end)}` });
    }
  }

  return periods.slice(0, 6);
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatLabel(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Filter timecards to a date range
 */
export function filterByPeriod(timecards, startDate, endDate) {
  return timecards.filter(tc => tc.date >= startDate && tc.date <= endDate);
}

/**
 * Build payroll summary per employee for a set of timecards
 */
export function buildPayrollSummary(timecards, otMap) {
  const byStaff = {};

  for (const tc of timecards) {
    if (!byStaff[tc.staff_id]) {
      byStaff[tc.staff_id] = {
        staff_id: tc.staff_id,
        staff_name: tc.staff_name || "Unknown",
        entries: [],
        totalHours: 0,
        totalRegular: 0,
        totalOT: 0,
        hasOT: false,
      };
    }
    const emp = byStaff[tc.staff_id];
    const otInfo = otMap[tc.id] || { tcRegular: tc.total_hours || 0, tcOT: 0, isOT: false, weekLabel: "" };
    emp.entries.push({ ...tc, tcRegular: otInfo.tcRegular, tcOT: otInfo.tcOT, isOT: otInfo.isOT, weekLabel: otInfo.weekLabel });
    emp.totalHours += tc.total_hours || 0;
    emp.totalRegular += otInfo.tcRegular;
    emp.totalOT += otInfo.tcOT;
    if (otInfo.isOT) emp.hasOT = true;
  }

  // Sort by last name
  return Object.values(byStaff).sort((a, b) => {
    const aLast = (a.staff_name || "").split(" ").pop();
    const bLast = (b.staff_name || "").split(" ").pop();
    return aLast.localeCompare(bLast);
  });
}