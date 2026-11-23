import React, { useState } from "react";
import { format, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ScheduledGoalDayDialog from "@/components/goals/ScheduledGoalDayDialog";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700", "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700", "bg-rose-100 text-rose-700",
];
function getColor(id = "") {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const parseDay = (dateStr) => new Date(`${dateStr}T12:00:00`);

/** Active, scheduled goals due on the given local date (no schedule days = every day). */
export function isGoalScheduledOn(goal, dateStr) {
  if (goal.status !== "Active") return false;
  if ((goal.charting_mode || "Scheduled") !== "Scheduled") return false;
  const days = goal.schedule_days || [];
  if (days.length === 0) return true;
  return days.includes(format(parseDay(dateStr), "EEEE"));
}

function ClientGoalsCard({ client, goals, dayLabel, onOpen, onSelectGoal }) {
  const initials = `${client.first_name?.[0] || ""}${client.last_name?.[0] || ""}`.toUpperCase();
  const colorClass = getColor(client.id);
  const program = client.service_enrollments?.[0]?.service_type || null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative flex-shrink-0">
        {client.photo_url ? (
          <img src={client.photo_url} alt={initials} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold", colorClass)}>
            {initials}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{client.first_name} {client.last_name}</p>
        {program && <p className="mt-0.5 text-xs text-muted-foreground">{program}</p>}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {goals.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelectGoal(g); }}
              className="max-w-[220px] truncate rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              title={g.goal_title}
            >
              {g.goal_title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col items-center gap-1">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow">
          <span className="text-xl font-bold text-primary-foreground">{goals.length}</span>
        </div>
        <span className="text-center text-[10px] font-medium leading-tight text-muted-foreground">{dayLabel}</span>
      </div>

      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
    </div>
  );
}

export default function GoalsScheduledView({ goals = [], clients = [], onSelectGoal }) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [openClient, setOpenClient] = useState(null);

  const dayGoals = goals.filter((g) => isGoalScheduledOn(g, date));
  const byClient = {};
  for (const g of dayGoals) {
    if (!byClient[g.client_id]) byClient[g.client_id] = [];
    byClient[g.client_id].push(g);
  }
  const entries = Object.entries(byClient)
    .map(([clientId, list]) => ({ client: clients.find((c) => c.id === clientId), goals: list }))
    .filter((e) => e.client)
    .sort((a, b) =>
      `${a.client.first_name} ${a.client.last_name}`.localeCompare(`${b.client.first_name} ${b.client.last_name}`)
    );

  const weekday = format(parseDay(date), "EEEE");
  const displayDate = format(parseDay(date), "EEEE, MMMM d, yyyy");
  const shiftDay = (delta) => setDate(format(addDays(parseDay(date), delta), "yyyy-MM-dd"));

  const openEntry = entries.find((e) => e.client.id === openClient?.id) || null;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftDay(-1)} aria-label="Previous day">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="h-8 w-40 text-xs"
        />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftDay(1)} aria-label="Next day">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDate(format(new Date(), "yyyy-MM-dd"))}>
          Today
        </Button>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {entries.length} client{entries.length !== 1 ? "s" : ""} · {dayGoals.length} goal{dayGoals.length !== 1 ? "s" : ""} scheduled
        </span>
      </div>

      {/* Day band */}
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-lg bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground shadow-sm">{weekday}</div>
        <div className="text-xs font-medium text-muted-foreground">{displayDate}</div>
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{entries.length} client{entries.length !== 1 ? "s" : ""}</span>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No active scheduled goals on {displayDate}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {entries.map(({ client, goals: clientGoals }) => (
            <ClientGoalsCard
              key={client.id}
              client={client}
              goals={clientGoals}
              dayLabel={weekday}
              onOpen={() => setOpenClient(client)}
              onSelectGoal={onSelectGoal}
            />
          ))}
        </div>
      )}

      <ScheduledGoalDayDialog
        open={!!openClient}
        client={openClient}
        goals={openEntry?.goals || []}
        dateLabel={displayDate}
        onClose={() => setOpenClient(null)}
        onSelectGoal={onSelectGoal}
      />
    </div>
  );
}