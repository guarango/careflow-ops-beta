import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

function lastEntry(goal) {
  const entries = goal.progress_entries || [];
  return entries.length ? entries[entries.length - 1] : null;
}

export default function ScheduledGoalDayDialog({ open, client, goals = [], dateLabel, onClose, onSelectGoal }) {
  if (!client) return null;
  const initials = `${client.first_name?.[0] || ""}${client.last_name?.[0] || ""}`.toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {client.photo_url ? (
              <img src={client.photo_url} alt={initials} className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold", getColor(client.id))}>
                {initials}
              </div>
            )}
            <div>
              <DialogTitle className="text-base">{client.first_name} {client.last_name}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {goals.length} scheduled goal{goals.length !== 1 ? "s" : ""} · {dateLabel}
              </p>
            </div>
          </div>
        </DialogHeader>

        {goals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No scheduled goals for this day.</p>
        ) : (
          <div className="space-y-2 pt-1">
            {goals.map((goal) => {
              const last = lastEntry(goal);
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => { onSelectGoal(goal); onClose(); }}
                  className="group flex w-full items-start gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{goal.goal_title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {goal.domain && <Badge variant="outline" className="h-4 py-0 text-[9px]">{goal.domain}</Badge>}
                      {goal.measurement_type && <Badge variant="outline" className="h-4 py-0 text-[9px]">{goal.measurement_type}</Badge>}
                      {goal.schedule_days?.length > 0 && (
                        <Badge variant="outline" className="h-4 py-0 text-[9px]">{goal.schedule_days.join(", ")}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {last ? `Last data: ${last.date}${last.score ? ` — ${last.score}` : ""}` : "No data charted yet"}
                      {goal.mastery_criteria ? ` · Target: ${goal.mastery_criteria}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground/50 group-hover:text-primary" />
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}