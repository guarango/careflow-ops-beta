import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function BSPRevisionLog({ bsp, onUpdate, updating }) {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ summary_of_changes: "", hypothesis_confirmed: null, behaviors_discontinued: [], new_behaviors_emerging: "" });

  const revisions = bsp.revision_log || [];

  const handleAdd = () => {
    const entry = {
      version: (bsp.version || 1) + 1,
      revised_at: new Date().toISOString(),
      revised_by: "",
      ...form
    };
    onUpdate({
      ...bsp,
      version: entry.version,
      last_revised_date: new Date().toISOString().split("T")[0],
      revision_log: [...revisions, entry]
    });
    setShowDialog(false);
    setForm({ summary_of_changes: "", hypothesis_confirmed: null, behaviors_discontinued: [], new_behaviors_emerging: "" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-sm">Revision Log</p>
          <p className="text-xs text-muted-foreground">Current version: {bsp.version || 1} · {revisions.length} revision{revisions.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowDialog(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />Log Revision
        </Button>
      </div>

      {revisions.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground">
          No revisions logged yet. Every plan update should be recorded here.
        </div>
      ) : (
        <div className="space-y-3">
          {[...revisions].reverse().map((rev, i) => (
            <div key={i} className="border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Version {rev.version}</span>
                  {rev.revised_by && <span className="text-xs text-muted-foreground">— {rev.revised_by}</span>}
                </div>
                <span className="text-xs text-muted-foreground">{rev.revised_at ? format(new Date(rev.revised_at), "MMM d, yyyy 'at' h:mm a") : ""}</span>
              </div>
              <p className="text-sm text-foreground">{rev.summary_of_changes}</p>
              <div className="flex flex-wrap gap-3 mt-2">
                {rev.hypothesis_confirmed !== null && (
                  <span className={`text-xs flex items-center gap-1 ${rev.hypothesis_confirmed ? "text-emerald-700" : "text-amber-700"}`}>
                    {rev.hypothesis_confirmed ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    Hypothesis {rev.hypothesis_confirmed ? "confirmed" : "revised"}
                  </span>
                )}
                {rev.behaviors_discontinued?.length > 0 && (
                  <span className="text-xs text-emerald-700">✓ Discontinued: {rev.behaviors_discontinued.join(", ")}</span>
                )}
                {rev.new_behaviors_emerging && (
                  <span className="text-xs text-amber-700">⚠ Emerging: {rev.new_behaviors_emerging}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Plan Revision</DialogTitle>
            <p className="text-xs text-muted-foreground">Document what changed and why. This creates an auditable record.</p>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Summary of Changes *</Label>
              <Textarea value={form.summary_of_changes} onChange={e => setForm(f => ({ ...f, summary_of_changes: e.target.value }))} rows={3} placeholder="What changed and why? Be specific..." />
            </div>
            <div>
              <Label>Was the functional hypothesis confirmed or revised?</Label>
              <div className="flex gap-2 mt-1">
                {[["Yes, confirmed", true], ["No, revised", false]].map(([label, val]) => (
                  <button key={label} type="button" onClick={() => setForm(f => ({ ...f, hypothesis_confirmed: val }))}
                    className={`flex-1 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${form.hypothesis_confirmed === val ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-muted-foreground"}`}
                  >{label}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Any behaviors meeting discontinuation threshold?</Label>
              <Input value={(form.behaviors_discontinued || []).join(", ")} onChange={e => setForm(f => ({ ...f, behaviors_discontinued: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} placeholder="e.g., Property Destruction (leave blank if none)" />
            </div>
            <div>
              <Label>New behaviors emerging that need assessment?</Label>
              <Input value={form.new_behaviors_emerging} onChange={e => setForm(f => ({ ...f, new_behaviors_emerging: e.target.value }))} placeholder="Describe any new concerning behaviors..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.summary_of_changes || updating}>Save Revision</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}