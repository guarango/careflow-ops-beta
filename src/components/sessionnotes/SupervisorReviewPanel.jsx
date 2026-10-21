import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Undo2, AlertTriangle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function NoteReviewCard({ note, onAction, loading }) {
  const [expanded, setExpanded] = useState(false);
  const [action, setAction] = useState("");
  const [comment, setComment] = useState("");

  const flags = note.health_safety_flags || {};
  const hasFlags = Object.values(flags).some(v => v === true);
  const goalData = note.goal_data || [];
  const completedGoals = goalData.filter(g => !g.skipped && (g.trials_total || g.narrative)).length;

  const handleConfirm = () => {
    onAction(note, action, comment);
    setAction("");
    setComment("");
  };

  return (
    <Card className={cn("mb-3 border-l-4", hasFlags ? "border-l-red-400" : "border-l-primary")}>
      <div className="px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{note.client_name}</span>
              <StatusBadge status={note.status} />
              {note.is_late && (
                <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-bold">
                  <Clock className="w-3 h-3" />LATE
                </span>
              )}
              {hasFlags && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠ Health/Safety</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              {note.date} · {note.staff_name || "Unknown"} · {note.service_code || "No code"} · {note.location || "—"} · {completedGoals}/{goalData.length} goals
            </p>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        </div>
      </div>

      {expanded && (
        <CardContent className="pt-0 pb-4 border-t border-border/40">
          {/* Summary */}
          {note.summary && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Summary</p>
              <p className="text-xs bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">{note.summary}</p>
            </div>
          )}

          {/* Returned comment */}
          {note.status === "Returned" && note.returned_comment && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
              <p className="text-xs font-bold text-amber-700 mb-1">Returned by {note.returned_by}:</p>
              <p className="text-xs text-amber-800">{note.returned_comment}</p>
            </div>
          )}

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

          {/* Manager Action */}
          {note.status === "Submitted" && (
            <div className="border-t border-border/40 pt-3 mt-3">
              <p className="text-xs font-semibold mb-2">Your Action</p>
              <div className="flex gap-2 flex-wrap mb-2">
                <button type="button"
                  onClick={() => setAction("Approved")}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-2", action === "Approved" ? "bg-emerald-500 text-white border-emerald-500" : "border-border bg-white text-muted-foreground hover:border-emerald-300")}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Approve
                </button>
                <button type="button"
                  onClick={() => setAction("Returned")}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-2", action === "Returned" ? "bg-amber-500 text-white border-amber-500" : "border-border bg-white text-muted-foreground hover:border-amber-300")}
                >
                  <Undo2 className="w-3.5 h-3.5 inline mr-1" />Return with Comment
                </button>
              </div>
              {action === "Returned" && (
                <Textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Explain what needs to be corrected. The DSP will see this comment."
                  rows={3}
                  className="text-sm mb-2"
                />
              )}
              {action && (
                <Button size="sm" onClick={handleConfirm} disabled={loading || (action === "Returned" && !comment)} className="text-xs gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />Confirm
                </Button>
              )}
            </div>
          )}

          {/* Already reviewed */}
          {note.supervisor_action && note.status !== "Submitted" && (
            <div className="border-t border-border/40 pt-3 mt-3 text-xs text-muted-foreground">
              <span className="font-medium">{note.supervisor_action}</span>
              {note.supervisor_note && <p className="mt-1 italic bg-amber-50 border border-amber-200 rounded px-2 py-1 text-amber-800">💬 {note.supervisor_note}</p>}
              {note.supervisor_reviewed_by && <p className="mt-1">— {note.supervisor_reviewed_by}</p>}
            </div>
          )}

          {/* Addenda */}
          {note.addenda && note.addenda.length > 0 && (
            <div className="border-t border-border/40 pt-3 mt-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">Addenda ({note.addenda.length})</p>
              {note.addenda.map((a, i) => (
                <div key={i} className="text-xs bg-blue-50 rounded-lg px-2 py-1 mb-1">
                  {a.text} <span className="text-blue-600">— {a.added_by}, {a.added_at ? format(new Date(a.added_at), "MM/dd/yyyy") : ""}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function SupervisorReviewPanel({ notes, onAction, loading }) {
  const pending = notes.filter(n => n.status === "Submitted");
  const returned = notes.filter(n => n.status === "Returned");
  const flagged = notes.filter(n => n.status === "Flagged for Review");
  const reviewed = notes.filter(n => n.status === "Approved");

  return (
    <div>
      {flagged.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-sm font-bold text-red-700">Flagged for Review ({flagged.length})</p>
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

      {returned.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Undo2 className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-bold">Returned for Revision ({returned.length})</p>
          </div>
          {returned.map(n => <NoteReviewCard key={n.id} note={n} onAction={onAction} loading={loading} />)}
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recently Approved ({reviewed.length})</p>
          {reviewed.slice(0, 5).map(n => <NoteReviewCard key={n.id} note={n} onAction={onAction} loading={loading} />)}
        </div>
      )}
    </div>
  );
}