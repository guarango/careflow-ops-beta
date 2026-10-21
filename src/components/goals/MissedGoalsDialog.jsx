import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const REASONS = ["Client refused", "Client not home", "Client ill", "Other"];

/**
 * MissedGoalsDialog — prompts for reason codes when scheduled goals
 * haven't been charted at clock-out.
 *
 * Props:
 *   goals: array of uncharted scheduled goals
 *   onSave: (reasons) => void — reasons = [{ goal_id, reason, comment }]
 *   onClose
 */
export default function MissedGoalsDialog({ goals = [], onSave, onClose }) {
  const [reasons, setReasons] = useState({});

  const setReason = (goalId, field, val) => {
    setReasons(prev => ({ ...prev, [goalId]: { ...prev[goalId], [field]: val } }));
  };

  const allSet = goals.every(g => reasons[g.id]?.reason);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Missed Scheduled Goals
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-3">
          The following scheduled goals were not charted during this shift. Please provide a reason for each.
        </p>

        <div className="space-y-4">
          {goals.map(g => (
            <div key={g.id} className="border border-border rounded-lg p-3 bg-muted/30">
              <p className="text-sm font-medium mb-2">{g.goal_title}</p>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {REASONS.map(r => (
                  <button key={r} type="button"
                    onClick={() => setReason(g.id, "reason", r)}
                    className={cn("px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
                      reasons[g.id]?.reason === r ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-muted-foreground hover:border-primary/30")}>
                    {r}
                  </button>
                ))}
              </div>
              {reasons[g.id]?.reason === "Other" && (
                <Textarea
                  value={reasons[g.id]?.comment || ""}
                  onChange={e => setReason(g.id, "comment", e.target.value)}
                  placeholder="Explain..."
                  rows={2}
                  className="text-sm"
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Skip</Button>
          <Button onClick={() => onSave(goals.map(g => ({ goal_id: g.id, reason: reasons[g.id]?.reason || "Other", comment: reasons[g.id]?.comment || "" })))} disabled={!allSet}>
            Save & Clock Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}