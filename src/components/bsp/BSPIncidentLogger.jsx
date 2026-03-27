import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, AlertTriangle, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const ANTECEDENTS = ["Transition", "Demand/Request", "Denied Access", "Peer Interaction", "Unstructured Time", "Sensory Trigger", "Health/Pain", "Unknown", "Other"];
const OUTCOMES = ["Behavior Resolved", "Required Backup", "Required Physical Intervention", "Required Medical Attention", "Required Incident Report"];
const SEVERITY_COLORS = { Mild: "bg-amber-100 text-amber-700", Moderate: "bg-orange-100 text-orange-700", Severe: "bg-red-100 text-red-700" };

const emptyIncident = {
  date: new Date().toISOString().split("T")[0],
  start_time: "", end_time: "", location: "", severity_tier: "",
  antecedent: "", antecedent_other: "", staff_present: "",
  replacement_prompted: null, intervention_used: "",
  outcome: "", restrictive_procedure_used: false, restrictive_procedure_detail: "",
  staff_observations: ""
};

export default function BSPIncidentLogger({ bsp, incidents, onLog, logging }) {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyIncident);
  const [targetBehaviorId, setTargetBehaviorId] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const behaviors = bsp?.target_behaviors || [];
  const selectedBehavior = behaviors.find(b => b.id === targetBehaviorId);

  const handleLog = () => {
    const dur = (form.start_time && form.end_time) ? calcDuration(form.start_time, form.end_time) : null;
    onLog({
      ...form,
      bsp_id: bsp.id,
      client_id: bsp.client_id,
      client_name: bsp.client_name,
      target_behavior_id: targetBehaviorId,
      target_behavior_name: selectedBehavior?.name || "",
      duration_minutes: dur,
      supervisor_notified: form.restrictive_procedure_used,
    });
    setShowDialog(false);
    setForm(emptyIncident);
    setTargetBehaviorId("");
  };

  const calcDuration = (start, end) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  };

  const isValid = targetBehaviorId && form.severity_tier && form.date && form.antecedent && form.outcome;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-sm">Behavior Incident Log</p>
          <p className="text-xs text-muted-foreground">{incidents.length} incidents logged</p>
        </div>
        <Button size="sm" onClick={() => setShowDialog(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />Log Incident
        </Button>
      </div>

      {/* Compassion reminder */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 flex items-start gap-2 mb-4">
        <Heart className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-700">Each entry helps the team understand {bsp.client_name}'s patterns and improve support. Thank you for documenting carefully.</p>
      </div>

      {incidents.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground">
          No incidents logged yet.<br />
          <span className="text-xs">Accurate data helps build better plans.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Time</TableHead>
                <TableHead>Behavior</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="hidden md:table-cell">Antecedent</TableHead>
                <TableHead className="hidden md:table-cell">Duration</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="hidden md:table-cell">Staff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map(inc => (
                <TableRow key={inc.id} className={inc.restrictive_procedure_used ? "bg-red-50" : ""}>
                  <TableCell className="text-xs">{inc.date} {inc.start_time && <span className="text-muted-foreground">{inc.start_time}</span>}</TableCell>
                  <TableCell className="text-sm font-medium">
                    <div className="flex items-center gap-1">
                      {inc.restrictive_procedure_used && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                      {inc.target_behavior_name || "—"}
                    </div>
                  </TableCell>
                  <TableCell><Badge className={cn("text-xs", SEVERITY_COLORS[inc.severity_tier])} variant="outline">{inc.severity_tier}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{inc.antecedent}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{inc.duration_minutes != null ? `${inc.duration_minutes} min` : "—"}</TableCell>
                  <TableCell className="text-xs">{inc.outcome}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{inc.staff_present || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Log Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Behavioral Incident</DialogTitle>
            <p className="text-xs text-muted-foreground">{bsp.client_name} — This log helps identify patterns to better support them.</p>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Target Behavior *</Label>
              <Select value={targetBehaviorId} onValueChange={setTargetBehaviorId}>
                <SelectTrigger><SelectValue placeholder="Which behavior occurred?" /></SelectTrigger>
                <SelectContent>{behaviors.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {selectedBehavior && (
              <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
                {selectedBehavior.severity_mild && <p><strong>Mild:</strong> {selectedBehavior.severity_mild}</p>}
                {selectedBehavior.severity_moderate && <p><strong>Moderate:</strong> {selectedBehavior.severity_moderate}</p>}
                {selectedBehavior.severity_severe && <p><strong>Severe:</strong> {selectedBehavior.severity_severe}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Where?" />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={form.start_time} onChange={e => set("start_time", e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={form.end_time} onChange={e => set("end_time", e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Severity *</Label>
              <div className="flex gap-2 mt-1">
                {["Mild", "Moderate", "Severe"].map(s => (
                  <button key={s} type="button" onClick={() => set("severity_tier", s)}
                    className={cn("flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all",
                      form.severity_tier === s
                        ? s === "Mild" ? "border-amber-400 bg-amber-50 text-amber-700" : s === "Moderate" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-red-400 bg-red-50 text-red-700"
                        : "border-border bg-white text-muted-foreground"
                    )}
                  >{s}</button>
                ))}
              </div>
            </div>

            <div>
              <Label>What happened right before? *</Label>
              <Select value={form.antecedent} onValueChange={v => set("antecedent", v)}>
                <SelectTrigger><SelectValue placeholder="Select antecedent" /></SelectTrigger>
                <SelectContent>{ANTECEDENTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              {form.antecedent === "Other" && (
                <Input value={form.antecedent_other} onChange={e => set("antecedent_other", e.target.value)} placeholder="Describe..." className="mt-2" />
              )}
            </div>

            <div>
              <Label>Staff Present</Label>
              <Input value={form.staff_present} onChange={e => set("staff_present", e.target.value)} placeholder="Your name" />
            </div>

            <div>
              <Label>Was replacement behavior prompted before escalation?</Label>
              <div className="flex gap-2 mt-1">
                {["Yes", "No"].map(v => (
                  <button key={v} type="button" onClick={() => set("replacement_prompted", v === "Yes")}
                    className={cn("flex-1 py-1.5 rounded-xl border-2 text-sm font-medium transition-all",
                      (form.replacement_prompted === true && v === "Yes") || (form.replacement_prompted === false && v === "No")
                        ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-muted-foreground"
                    )}>{v}</button>
                ))}
              </div>
            </div>

            <div>
              <Label>Intervention Used</Label>
              <Input value={form.intervention_used} onChange={e => set("intervention_used", e.target.value)} placeholder="Which reactive strategy did you use?" />
            </div>

            <div>
              <Label>Outcome *</Label>
              <Select value={form.outcome} onValueChange={v => set("outcome", v)}>
                <SelectTrigger><SelectValue placeholder="How did it resolve?" /></SelectTrigger>
                <SelectContent>{OUTCOMES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.restrictive_procedure_used} onChange={e => set("restrictive_procedure_used", e.target.checked)} />
                <span className="text-sm font-medium text-red-700">A restrictive procedure was used</span>
              </label>
              {form.restrictive_procedure_used && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-700 mb-1.5">⚠ Supervisor will be auto-notified. Describe the procedure used:</p>
                  <Textarea value={form.restrictive_procedure_detail} onChange={e => set("restrictive_procedure_detail", e.target.value)} rows={2} placeholder="Describe the procedure, duration, staff involved..." className="text-sm" />
                </div>
              )}
            </div>

            <div>
              <Label>Staff Observations</Label>
              <Textarea value={form.staff_observations} onChange={e => set("staff_observations", e.target.value)} rows={3} placeholder="What did you notice? What might have helped? Any important context..." className="text-sm" />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleLog} disabled={!isValid || logging}>{logging ? "Logging..." : "Submit Log"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}