import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const QUESTIONS_MAP = {
  seeing_at_home: "What they're seeing at home or in the community",
  what_is_going_well: "What is going well",
  needs_different_approach: "What needs more attention or a different approach",
  priorities_coming_year: "Priorities for the coming year",
  good_life_perspective: "What a good life looks like (their perspective)",
  items_for_meeting: "Items to raise at the planning meeting",
  what_team_is_missing: "What the team might be missing",
};

function InputItem({ item, onMarkReviewed }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(item.cm_notes || "");

  return (
    <Card className="border-0 shadow-sm">
      <button className="w-full text-left" onClick={() => setExpanded(e => !e)}>
        <div className="p-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium">{item.portal_user_name}</p>
              <span className="text-xs text-slate-400">·</span>
              <p className="text-xs text-slate-500">{item.client_name}</p>
              <Badge className={item.status === "Submitted" ? "bg-amber-100 text-amber-700" : item.status === "Reviewed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                {item.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">{item.isp_cycle_year} ISP cycle · Submitted {item.submitted_date ? format(new Date(item.submitted_date), "MMM d, yyyy") : ""}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t pt-4 space-y-4">
          {Object.entries(QUESTIONS_MAP).map(([key, label]) => item[key] ? (
            <div key={key}>
              <p className="text-xs font-semibold text-slate-500 mb-1">{label}:</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{item[key]}</p>
            </div>
          ) : null)}
          {item.will_attend_meeting !== undefined && (
            <p className="text-xs text-slate-500">
              Attendance: {item.will_attend_meeting ? `Yes — ${item.attendance_method}` : "Written input only"}
            </p>
          )}
          <div>
            <Label className="text-xs">Case Manager Notes (internal)</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 text-sm" placeholder="Notes on how this input will be incorporated..." />
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />Where this family member's priorities differ from what the person themselves has said they want, that difference must be named at the planning meeting — not resolved quietly. The person's own priorities take precedence.
          </div>
          <Button size="sm" onClick={() => onMarkReviewed(item.id, notes)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />Mark as Reviewed
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function FamilyInputReview() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("Submitted");

  const { data: inputs = [] } = useQuery({
    queryKey: ["family-inputs-all"],
    queryFn: () => base44.entities.FamilyInputForm.list("-submitted_date"),
  });

  const markReviewed = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.FamilyInputForm.update(id, {
      status: "Reviewed",
      cm_notes: notes,
      reviewed_date: new Date().toISOString().split("T")[0],
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-inputs-all"] }),
  });

  const pending = inputs.filter(i => i.status === "Submitted");
  const displayed = filter === "Submitted" ? pending : inputs;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-violet-500" />Family ISP Input Forms
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Family perspectives submitted for ISP planning — review before each planning meeting</p>
        </div>
        <div className="flex gap-1.5">
          {["Submitted", "All"].map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="h-7 text-xs">{f} {f === "Submitted" && pending.length > 0 && `(${pending.length})`}</Button>
          ))}
        </div>
      </div>

      {pending.length > 0 && filter === "Submitted" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
          {pending.length} family input form{pending.length !== 1 ? "s" : ""} awaiting review before the next planning meeting.
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="border-dashed border-2 border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400">
          No {filter === "Submitted" ? "pending" : ""} family input forms.
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(item => (
            <InputItem key={item.id} item={item} onMarkReviewed={(id, notes) => markReviewed.mutate({ id, notes })} />
          ))}
        </div>
      )}
    </div>
  );
}