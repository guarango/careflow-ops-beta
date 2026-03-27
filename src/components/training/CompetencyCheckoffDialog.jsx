import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Default skill items per training type
const DEFAULT_ITEMS = {
  "med-admin": [
    "Verified correct person (right person)",
    "Verified correct medication (right drug)",
    "Verified correct dose (right dose)",
    "Verified correct time (right time)",
    "Verified correct route (right route)",
    "Verified correct documentation (right documentation)",
    "Verified right to refuse — handled refusal protocol correctly",
    "Documented administration correctly in MAR",
  ],
  "crisis-prevention": [
    "Correctly identified escalation warning signs",
    "Applied antecedent strategies before escalation",
    "Used approved verbal de-escalation techniques",
    "Maintained safe physical positioning",
    "Correctly executed approved reactive strategy",
    "Documented incident per policy",
    "Sought supervisor debrief within required timeframe",
  ],
  "bsp-implementation": [
    "Correctly implemented antecedent modification strategies",
    "Prompted replacement behavior appropriately",
    "Provided reinforcement per plan schedule",
    "Collected ABC data accurately",
    "Executed mild reactive strategy correctly",
    "Demonstrated knowledge of phrases to avoid",
    "Knew escalation criteria and who to call",
  ],
  "personal-care": [
    "Obtained consent and explained each step",
    "Maintained dignity and privacy throughout",
    "Used correct techniques per ISP documentation",
    "Responded appropriately to person's preferences",
    "Completed safe transfer technique (if applicable)",
    "Documented any deviations or concerns",
  ],
};

export default function CompetencyCheckoffDialog({ record, onSave, onClose }) {
  const defaultItems = (DEFAULT_ITEMS[record.training_id] || ["Skill demonstration — describe in detail"]).map(s => ({ skill: s, demonstrated: false, notes: "" }));
  const existingItems = record.competency_checkoff?.items;
  const [items, setItems] = useState(existingItems?.length ? existingItems : defaultItems);
  const [observer, setObserver] = useState(record.competency_checkoff?.observer || "");
  const [credential, setCredential] = useState(record.competency_checkoff?.observer_credential || "");
  const [observedDate, setObservedDate] = useState(record.competency_checkoff?.observed_date || new Date().toISOString().split("T")[0]);
  const [setting, setSetting] = useState(record.competency_checkoff?.setting || "");
  const [personFeedback, setPersonFeedback] = useState(record.competency_checkoff?.person_feedback || "");

  const allPassed = items.every(item => item.demonstrated);
  const passedCount = items.filter(i => i.demonstrated).length;

  const handleSave = () => {
    onSave({
      ...record,
      competency_checkoff: {
        items,
        observer,
        observer_credential: credential,
        observed_date: observedDate,
        setting,
        person_feedback: personFeedback,
        passed: allPassed,
      },
    });
  };

  const isValid = observer && observedDate && items.length > 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Competency Check-off</DialogTitle>
          <p className="text-xs text-muted-foreground">{record.training_title} — observed skill verification</p>
        </DialogHeader>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800 mb-2">
          <strong>Important:</strong> This competency check-off must be completed by the verifying supervisor or clinician — not by the staff member themselves.
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Label>Observer Name *</Label>
            <Input value={observer} onChange={e => setObserver(e.target.value)} placeholder="Supervisor / Clinician name" />
          </div>
          <div>
            <Label>Observer Credential</Label>
            <Input value={credential} onChange={e => setCredential(e.target.value)} placeholder="e.g. RN, BCBA, Program Director" />
          </div>
          <div>
            <Label>Observation Date *</Label>
            <Input type="date" value={observedDate} onChange={e => setObservedDate(e.target.value)} />
          </div>
          <div>
            <Label>Setting</Label>
            <Input value={setting} onChange={e => setSetting(e.target.value)} placeholder="e.g. Day program, simulation" />
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Skill Items — check each that was demonstrated correctly</p>
          {items.map((item, i) => (
            <div key={i} className={cn("border rounded-xl p-3", item.demonstrated ? "border-emerald-200 bg-emerald-50" : "border-border")}>
              <div className="flex items-start gap-2">
                <button type="button" onClick={() => {
                  const arr = [...items]; arr[i] = { ...arr[i], demonstrated: !arr[i].demonstrated }; setItems(arr);
                }} className="mt-0.5 shrink-0">
                  {item.demonstrated ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-slate-300 hover:text-slate-400" />}
                </button>
                <div className="flex-1">
                  <p className="text-sm">{item.skill}</p>
                  <Input value={item.notes || ""} onChange={e => {
                    const arr = [...items]; arr[i] = { ...arr[i], notes: e.target.value }; setItems(arr);
                  }} placeholder="Optional observer notes..." className="text-xs h-6 mt-1 border-0 bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <Label>Person's Feedback (if able to provide)</Label>
          <Textarea rows={2} value={personFeedback} onChange={e => setPersonFeedback(e.target.value)} placeholder="How did the person experience this staff member's support? Their perspective matters." className="text-sm" />
        </div>

        <div className={cn("rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2",
          allPassed ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-amber-50 border border-amber-200 text-amber-800")}>
          {allPassed ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {passedCount}/{items.length} skills demonstrated — {allPassed ? "PASSES competency check-off" : "DOES NOT PASS — remediation required"}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid}>Save Check-off</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}