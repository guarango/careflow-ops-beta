/**
 * Which goals are scheduled on a given day, and whether they were signed off.
 * A Scheduled goal with no days listed is due every day.
 */
import { format } from "date-fns";

const parseDay = (dateStr) => new Date(`${dateStr}T12:00:00`);

export function isGoalScheduledOn(goal, dateStr) {
  if (goal?.status !== "Active") return false;
  if ((goal.charting_mode || "Scheduled") !== "Scheduled") return false;
  const days = goal.schedule_days || [];
  if (days.length === 0) return true;
  return days.includes(format(parseDay(dateStr), "EEEE"));
}

export function goalsScheduledOn(goals = [], dateStr) {
  return goals.filter((g) => isGoalScheduledOn(g, dateStr));
}

/** A Valid entry charted for this exact date counts as a sign-off. */
export function isSignedOn(goal, dateStr) {
  return (goal?.progress_entries || []).some(
    (e) => e.date === dateStr && (e.status || "Valid") === "Valid"
  );
}

export function signedEntryOn(goal, dateStr) {
  return [...(goal?.progress_entries || [])]
    .reverse()
    .find((e) => e.date === dateStr && (e.status || "Valid") === "Valid") || null;
}