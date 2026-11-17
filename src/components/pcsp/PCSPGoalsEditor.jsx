import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export const LIFE_AREAS = [
  "Communication",
  "Activities of Daily Living",
  "Community Integration",
  "Social Skills",
  "Vocational/Employment",
  "Health & Wellness",
  "Behavioral Support",
  "Self-Advocacy",
  "Mobility & Motor Skills",
  "Leisure & Recreation",
  "Other",
];

const emptyGoal = () => ({
  goal_id: "",
  goal_text_as_written: "",
  persons_own_words: "",
  life_area: "",
  responsible_service_code_ids: [],
});

export default function PCSPGoalsEditor({ goals = [], setGoals, clientGoals = [], codes = [] }) {
  const update = (index, patch) =>
    setGoals(goals.map((goal, i) => (i === index ? { ...goal, ...patch } : goal)));

  const pickGoal = (index, goalId) => {
    const goal = clientGoals.find((g) => g.id === goalId);
    update(index, {
      goal_id: goalId,
      goal_text_as_written: goal?.goal_title || goals[index].goal_text_as_written,
      persons_own_words: goal?.persons_own_words || goals[index].persons_own_words,
      life_area: goal?.domain || goals[index].life_area,
    });
  };

  const toggleCode = (index, codeId) => {
    const current = goals[index].responsible_service_code_ids || [];
    update(index, {
      responsible_service_code_ids: current.includes(codeId)
        ? current.filter((id) => id !== codeId)
        : [...current, codeId],
    });
  };

  return (
    <div className="space-y-3">
      {goals.map((goal, i) => (
        <div key={i} className="rounded-xl border border-border p-3">
          <div className="grid gap-3">
            <div>
              <Label>Link to an existing goal (optional)</Label>
              <Select value={goal.goal_id || "none"} onValueChange={(v) => pickGoal(i, v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Write it as it appears on the PCSP" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked — type the goal below</SelectItem>
                  {clientGoals.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.goal_title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Goal as written on the PCSP *</Label>
              <Textarea
                rows={2}
                value={goal.goal_text_as_written || ""}
                onChange={(e) => update(i, { goal_text_as_written: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Person's own words</Label>
                <Textarea
                  rows={2}
                  value={goal.persons_own_words || ""}
                  onChange={(e) => update(i, { persons_own_words: e.target.value })}
                />
              </div>
              <div>
                <Label>Life area</Label>
                <Select value={goal.life_area || ""} onValueChange={(v) => update(i, { life_area: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {LIFE_AREAS.map((area) => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Service codes responsible for this goal</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {codes.map((c) => {
                  const active = (goal.responsible_service_code_ids || []).includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCode(i, c.id)}
                      className={
                        active
                          ? "rounded-full border border-primary bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground"
                          : "rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40"
                      }
                    >
                      {c.code}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setGoals(goals.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setGoals([...goals, emptyGoal()])}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add goal
      </Button>
    </div>
  );
}