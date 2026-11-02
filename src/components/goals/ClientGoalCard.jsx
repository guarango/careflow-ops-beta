import React from "react";
import { cn } from "@/lib/utils";
import EntityCard from "@/components/shared/EntityCard";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700",
];

function getColorForClient(clientId) {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getProgramType(client) {
  const enrollments = client.service_enrollments || [];
  if (enrollments.length > 0) return enrollments[0].service_type || null;
  return null;
}

function getGoalDot(goal) {
  const entries = goal.progress_entries || [];
  if (entries.length === 0) return "yellow";

  const last = entries[entries.length - 1];
  const lastDate = new Date(last.date);
  const daysSince = (new Date() - lastDate) / (1000 * 60 * 60 * 24);

  // Red: no data in 14+ days
  if (daysSince > 14) return "red";

  // Detect regression: compare last 2 entries to the 2 before them (if enough data)
  if (entries.length >= 4) {
    const recent = entries.slice(-2);
    const prior = entries.slice(-4, -2);
    const parseScore = (s) => {
      if (!s) return null;
      const fracMatch = s.match(/(\d+)\s*\/\s*(\d+)/);
      if (fracMatch) return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
      const pctMatch = s.match(/([\d.]+)%/);
      if (pctMatch) return parseFloat(pctMatch[1]) / 100;
      const numMatch = s.match(/^[\d.]+/);
      if (numMatch) return parseFloat(numMatch[0]);
      if (s.toLowerCase() === "yes") return 1;
      if (s.toLowerCase() === "no") return 0;
      return null;
    };
    const avgRecent = recent.map(e => parseScore(e.score)).filter(v => v !== null);
    const avgPrior = prior.map(e => parseScore(e.score)).filter(v => v !== null);
    if (avgRecent.length && avgPrior.length) {
      const recentAvg = avgRecent.reduce((a, b) => a + b, 0) / avgRecent.length;
      const priorAvg = avgPrior.reduce((a, b) => a + b, 0) / avgPrior.length;
      // Red if significant regression (>25% drop)
      if (priorAvg > 0 && recentAvg < priorAvg * 0.75) return "red";
      // Yellow if mild decline or stagnant at low performance
      if (recentAvg < priorAvg * 0.95) return "yellow";
    }
  }

  // Yellow: no data in 7+ days
  if (daysSince > 7) return "yellow";

  return "green";
}

export default function ClientGoalCard({ client, goals, onClick }) {
  const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase();
  const colorClass = getColorForClient(client.id);
  const programType = getProgramType(client);
  const activeGoals = goals.filter(g => g.status === "Active");
  const dots = activeGoals.map(getGoalDot);

  return (
    <EntityCard
      onClick={onClick}
      initials={initials}
      photoUrl={client.photo_url}
      colorClass={colorClass}
      title={`${client.first_name} ${client.last_name}`}
      subtitle={
        activeGoals.length === 0
          ? "No active goals"
          : `${activeGoals.length} active goal${activeGoals.length !== 1 ? "s" : ""}`
      }
      badge={programType && (
        <span className="inline-flex max-w-full truncate rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {programType}
        </span>
      )}
      footer={
        <div className="flex flex-wrap gap-1">
          {dots.map((color, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 w-2.5 flex-shrink-0 rounded-full",
                color === "green" && "bg-green-500",
                color === "yellow" && "bg-yellow-400",
                color === "red" && "bg-red-500"
              )}
            />
          ))}
        </div>
      }
    />
  );
}