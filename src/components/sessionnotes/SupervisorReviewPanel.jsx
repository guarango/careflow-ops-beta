import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, MessageSquare, AlertTriangle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const ACTION_OPTIONS = [
  { value: "Approved", label: "✓ Approve", color: "bg-emerald-500 hover:bg-emerald-600 text-white" },
  { value: "Coaching Note Added", label: "💬 Add Coaching Note", color: "bg-amber-500 hover:bg-amber-600 text-white" },
  { value: "Flagged for Clinical Review", label: "🚩 Flag for Clinical Review", color: "bg-red-500 hover:bg-red-600 text-white" },
];

function NoteReviewCard({ note, onAction, loading }) {
  const [expanded, setExpanded] = useState(false);
  const [action, setAction] = useState("");
  const [coachingNote, setCoachingNote] = useState("");

  const flags = note.health_safety_flags || {};
  const hasFlags = Object.values(flags).some(v => v === true);
  const goalData = note.goal_data || [];
  const completedGoals = goalData.filter(g => !g.skipped && (g.trials_total || g.narrative)).length;

  return (
    <Card className={cn("mb-3 border-l-4", hasFlags ? "border-l-red-400" : "border-l-primary")}>
      <div className="px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{note.client_name}</span>
              <StatusBadge status={note.status} />
              {hasFlags && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠ Health/Safety Flag</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              {note.date} · {note.staff_name || "Unknown staff"} · {note.location || "—"} · {completedGoals}/{goalData.length} goals
            </p>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        </div>
      </div>

      {expanded && (
        <CardContent className="pt-0 pb-4 border-t border-border/40">
          {/* Flags */}
          {hasFlags && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-xs font-bold text-red-700 mb-1.5">⚠ Health & Safety Flags</p>
              {flags.fall_or_injury && <p className="text-xs text-red-700 mb-1"><strong>Fall/Injury:</strong> {flags.fall_detail}</p>}
              {flags.medication_refusal && <p className="text-xs text-red-700 mb-1"><strong>Med Refusal:</strong> {flags.medication_refusal_detail}</p>}
              {flags.behavioral_escalation && <p className="text-xs text-red-700 mb-1"><strong>Behavioral:</strong> {flags.behavioral_detail}</p>}
              {flags.health_concern && <p className="text-xs text-red-700 mb-1"><strong>Health:</strong> {flags.health_detail}</p>}
              {flags.restrictive_procedure && <p className="text-xs text-red-700 mb-1 font-bold"><strong>🚨 Restrictive Procedure:</strong> {flags.restrictive_detail}</p>}
            </div>
          )}

          {/* Goal Data Summary */}
          {goalData.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Goal Data</p>
              <div className="space-y-2">
                {goalData.map((g, i) => (
                  <div key={i} className={cn("text-xs rounded-lg px-3 py-2", g.skipped ? "bg-muted/40 text-muted-foreground" : "bg-slate-50")}>
                    {g.skipped ? (
                      <span className="line-through">{g.goal_title} <em>— {g.skip_reason}</em></span>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{g.goal_title}</span>
                          {g.percentage !== null && g.percentage !== undefined && (
                            <span className={cn("font-bold", g.percentage >= 80 ? "text-emerald-600" : g.percentage >= 60 ? "text-amber-600" : "text-red-600")}>{g.percentage}%</span>
                          )}
                          {g.trials_total && <span className="text-muted-foreground">{g.trials_correct}/{g.trials_total} trials</span>}
                          {g.prompt_level && <span className="bg-muted px-1.5 py-0.5 rounded">{g.prompt_level}</span>}
                          {g.mastery_met && <span className={cn("px-1.5 py-0.5 rounded font-medium", g.mastery_met === "Yes" ? "bg-emerald-100 text-emerald-700" : g.mastery_met === "No" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>{g.mastery_met}</span>}
                          {g.engagement && <span className="text-muted-foreground">{g.engagement}</span>}
                        </div>
                        {g.narrative && <p className="text-muted-foreground mt-1 italic">{g.narrative}</p>}
                        {g.session_highlight && <p className="text-emerald-700 mt-1">🌟 {g.session_highlight}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {note.session_overall_notes && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Overall Notes</p>
              <p className="text-xs bg-muted/40 rounded-lg px-3 py-2">{note.session_overall_notes}</p>
            </div>
          )}

          {/* Supervisor Action */}
          {note.status === "Submitted" && (
            <div className="border-t border-border/40 pt-3 mt-3">
              <p className="text-xs font-semibold mb-2">Your Action</p>
              <div className="flex gap-2 flex-wrap mb-2">
                {ACTION_OPTIONS.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setAction(opt.value)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-2", action === opt.value ? `${opt.color} border-current` : "border-border bg-white text-muted-foreground hover:border-primary/30")}
                  >{opt.label}</button>
                ))}
              </div>
              {(action === "Coaching Note Added" || action === "Flagged for Clinical Review") && (
                <Textarea
                  value={coachingNote}
                  onChange={e => setCoachingNote(e.target.value)}
                  placeholder={action === "Coaching Note Added" ? "Write a supportive coaching note for the DSP..." : "Describe what needs clinical attention..."}
                  rows={2}
                  className="text-sm mb-2"
                />
              )}
              {action && (
                <Button size="sm" onClick={() => onAction(note, action, coachingNote)} disabled={loading || ((action === "Coaching Note Added" || action === "Flagged for Clinical Review") && !coachingNote)} className="text-xs gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />Confirm
                </Button>
              )}
            </div>
          )}

          {/* Already reviewed */}
          {note.supervisor_action && (
            <div className="border-t border-border/40 pt-3 mt-3 text-xs text-muted-foreground">
              <span className="font-medium">{note.supervisor_action}</span>
              {note.supervisor_note && <p className="mt-1 italic bg-amber-50 border border-amber-200 rounded px-2 py-1 text-amber-800">💬 {note.supervisor_note}</p>}
              {note.supervisor_reviewed_by && <p className="mt-1">— {note.supervisor_reviewed_by}</p>}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function SupervisorReviewPanel({ notes, onAction, loading }) {
  const pending = notes.filter(n => n.status === "Submitted");
  const reviewed = notes.filter(n => n.status === "Approved" || n.supervisor_action);
  const flagged = notes.filter(n => n.status === "Flagged for Review" || n.status === "Flagged for Clinical Review");

  return (
    <div>
      {flagged.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-sm font-bold text-red-700">Flagged for Clinical Review ({flagged.length})</p>
          </div>
          {flagged.map(n => <NoteReviewCard key={n.id} note={n} onAction={onAction} loading={loading} />)}
        </div>
      )}

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <p className="text-sm font-bold">Pending Review ({pending.length})</p>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
            ✓ All submitted notes have been reviewed.
          </p>
        ) : (
          pending.map(n => <NoteReviewCard key={n.id} note={n} onAction={onAction} loading={loading} />)
        )}
      </div>

      {reviewed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recently Reviewed ({reviewed.length})</p>
          {reviewed.slice(0, 5).map(n => <NoteReviewCard key={n.id} note={n} onAction={onAction} loading={loading} />)}
        </div>
      )}
    </div>
  );
}