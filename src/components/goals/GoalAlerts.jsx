import React from "react";
import { AlertTriangle, Clock, TrendingDown, Calendar } from "lucide-react";
import { differenceInDays, parseISO, isValid } from "date-fns";

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  if (!isValid(d)) return null;
  return differenceInDays(new Date(), d);
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  if (!isValid(d)) return null;
  return differenceInDays(d, new Date());
}

const PROMPT_ORDER = [
  "Full Physical Assist", "Hand-Over-Hand", "Physical Prompt",
  "Gestural Prompt", "Verbal Prompt", "Indirect Verbal Cue", "Independent"
];

export default function GoalAlerts({ goal }) {
  const alerts = [];
  const entries = goal.progress_entries || [];

  // 1. No data in 14 days
  if (goal.status === "Active") {
    if (entries.length === 0) {
      alerts.push({ type: "warning", icon: Clock, message: "No data has been entered for this goal yet." });
    } else {
      const lastDate = entries[entries.length - 1]?.date;
      const days = daysSince(lastDate);
      if (days !== null && days >= 14) {
        alerts.push({ type: "warning", icon: Clock, message: `No data entered in ${days} days. Last entry: ${lastDate}.` });
      }
    }
  }

  // 2. Target date within 30 days and not mastered
  if (goal.target_date && goal.status === "Active") {
    const remaining = daysUntil(goal.target_date);
    if (remaining !== null && remaining <= 30 && remaining >= 0) {
      alerts.push({ type: "urgent", icon: Calendar, message: `Target date is in ${remaining} day${remaining === 1 ? "" : "s"} and mastery has not been met.` });
    } else if (remaining !== null && remaining < 0) {
      alerts.push({ type: "urgent", icon: Calendar, message: `Target date passed ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? "" : "s"} ago and goal is still active.` });
    }
  }

  // 3. Prompt level not improved in 60 days
  if (goal.status === "Active" && entries.length > 0) {
    const promptEntries = entries.filter(e => e.prompt_level).slice(-10);
    if (promptEntries.length >= 2) {
      const oldest = promptEntries[0];
      const newest = promptEntries[promptEntries.length - 1];
      const oldIdx = PROMPT_ORDER.indexOf(oldest.prompt_level);
      const newIdx = PROMPT_ORDER.indexOf(newest.prompt_level);
      const daysDiff = daysSince(oldest.date);
      if (daysDiff !== null && daysDiff >= 60 && newIdx <= oldIdx) {
        alerts.push({ type: "info", icon: TrendingDown, message: `Prompt level has not improved in ${daysDiff} days (currently: ${newest.prompt_level}).` });
      }
    }
  }

  // 4. Auto-check mastery criteria (simple percentage check)
  if (goal.status === "Active" && goal.mastery_criteria && entries.length >= 3) {
    const recentEntries = entries.slice(-3);
    const pctMatch = goal.mastery_criteria.match(/(\d+)%/);
    if (pctMatch) {
      const targetPct = parseInt(pctMatch[1]);
      const allMeet = recentEntries.every(e => {
        const scoreMatch = e.score?.match(/(\d+)/);
        return scoreMatch && parseInt(scoreMatch[1]) >= targetPct;
      });
      if (allMeet) {
        alerts.push({ type: "success", icon: AlertTriangle, message: `Mastery criteria may have been met based on recent entries. Consider updating status to Mastered.` });
      }
    }
  }

  if (alerts.length === 0) return null;

  const colors = {
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    urgent: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  };

  return (
    <div className="space-y-1.5 mb-3">
      {alerts.map((a, i) => (
        <div key={i} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${colors[a.type]}`}>
          <a.icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{a.message}</span>
        </div>
      ))}
    </div>
  );
}