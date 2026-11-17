import React from "react";
import { Badge } from "@/components/ui/badge";

/** Goals as written on the PCSP, each showing which service codes own it. */
export default function PCSPGoalList({ goals = [], codes = [] }) {
  const codeFor = (id) => codes.find((c) => c.id === id);

  if (!goals.length) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No goals on this PCSP yet.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {goals.map((goal, i) => {
        const owners = (goal.responsible_service_code_ids || []).map(codeFor).filter(Boolean);
        return (
          <div key={goal.goal_id || i} className="rounded-xl border border-border bg-white p-3">
            <p className="text-sm font-medium leading-snug">{goal.goal_text_as_written || "Goal"}</p>
            {goal.persons_own_words && (
              <p className="mt-1 text-xs italic text-violet-700">“{goal.persons_own_words}”</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {goal.life_area && <Badge variant="outline" className="text-[10px]">{goal.life_area}</Badge>}
              {owners.map((c) => (
                <Badge key={c.id} variant="outline" className="border-sky-200 bg-sky-50 text-[10px] text-sky-700">
                  {c.code}
                </Badge>
              ))}
              {owners.length === 0 && (
                <span className="text-[10px] font-medium text-amber-700">No service code owns this goal yet</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}