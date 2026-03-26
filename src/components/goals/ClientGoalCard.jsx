import React from "react";
import { cn } from "@/lib/utils";

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
  // Check if last entry is recent (within 14 days)
  const lastDate = new Date(last.date);
  const daysSince = (new Date() - lastDate) / (1000 * 60 * 60 * 24);
  if (daysSince > 14) return "yellow";
  if (goal.status === "Active") return "green";
  return "yellow";
}

export default function ClientGoalCard({ client, goals, onClick }) {
  const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase();
  const colorClass = getColorForClient(client.id);
  const programType = getProgramType(client);
  const activeGoals = goals.filter(g => g.status === "Active");
  const dots = activeGoals.map(getGoalDot);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-sm",
        "hover:border-primary/50 hover:shadow-md transition-all duration-200 text-left w-full"
      )}
    >
      {/* Avatar Area */}
      <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden flex items-center justify-center">
        {client.photo_url ? (
          <img
            src={client.photo_url}
            alt={`${client.first_name} ${client.last_name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn("w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold", colorClass)}>
            {initials}
          </div>
        )}
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
          <span className="text-xs font-semibold text-primary bg-white/90 px-3 py-1 rounded-full shadow">
            View goals
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-3 gap-1.5">
        <p className="font-semibold text-sm text-foreground leading-tight">
          {client.first_name} {client.last_name}
        </p>

        {programType && (
          <span className="inline-flex w-fit text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {programType}
          </span>
        )}

        <p className="text-xs text-muted-foreground">
          {activeGoals.length === 0 ? "No active goals" : `${activeGoals.length} active goal${activeGoals.length !== 1 ? "s" : ""}`}
        </p>

        {/* Goal status dots */}
        {dots.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-0.5">
            {dots.map((color, i) => (
              <span
                key={i}
                className={cn(
                  "w-2.5 h-2.5 rounded-full flex-shrink-0",
                  color === "green" && "bg-green-500",
                  color === "yellow" && "bg-yellow-400",
                  color === "red" && "bg-red-500"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}