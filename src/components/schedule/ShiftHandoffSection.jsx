import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, ClipboardList } from "lucide-react";
import { shiftMissingDocs } from "@/lib/shiftCloseout";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";

export default function ShiftHandoffSection({ shift, notes = [], medLogs = [], medications = [], canEdit, onUpdate, saving }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState(shift?.handoff_summary || "");
  const missing = shiftMissingDocs({ shift, notes, medLogs, medications });
  const completed = shift?.status === "Completed";
  const canComplete = missing.length === 0 && summary.trim().length > 0;

  const completeShift = () => {
    const now = new Date().toISOString();
    onUpdate({
      handoff_summary: summary.trim(),
      handoff_by: user?.id || "",
      handoff_by_name: user?.full_name || user?.email || "Staff",
      handoff_at: now,
      closeout_missing: [],
      closeout_checked_at: now,
      status: "Completed",
    });
  };

  return (
    <div className="border-t pt-3 space-y-3">
      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
        <ClipboardList className="w-3.5 h-3.5" />
        Shift handoff &amp; close-out
      </p>

      {missing.length > 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
          <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Documentation missing ({missing.length})
          </p>
          {missing.map((m) => (
            <p key={m.key} className="text-[11px] text-red-700">• {m.label}</p>
          ))}
          <p className="text-[11px] text-red-600 pt-1">This shift cannot be completed until these are recorded.</p>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <p className="text-[11px] text-emerald-700">Clock-in, session note and medication outcome are all on file.</p>
        </div>
      )}

      <div>
        <Label className="text-xs">End-of-shift summary *</Label>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          disabled={!canEdit || completed}
          placeholder="What the next staff member needs to know about this shift…"
          className="text-sm"
        />
      </div>

      {completed ? (
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          <p>
            Handed off by <span className="font-medium text-foreground">{shift.handoff_by_name || "—"}</span>
            {shift.handoff_at ? ` · ${format(new Date(shift.handoff_at), "MMM d, yyyy h:mm a")}` : ""}
          </p>
        </div>
      ) : (
        canEdit && (
          <Button
            size="sm"
            className="w-full gap-1.5"
            onClick={completeShift}
            disabled={!canComplete || saving}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Save handoff & complete shift"}
          </Button>
        )
      )}
    </div>
  );
}