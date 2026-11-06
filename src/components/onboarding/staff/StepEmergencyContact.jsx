import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";

/** Step 2 — emergency contact. */
export default function StepEmergencyContact({ staff, saving, onNext, isLast, onBack }) {
  const [form, setForm] = useState({
    emergency_contact_name: staff?.emergency_contact_name || "",
    emergency_contact_relation: staff?.emergency_contact_relation || "",
    emergency_contact_phone: staff?.emergency_contact_phone || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label>Name</Label>
          <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
        </div>
        <div>
          <Label>Relationship</Label>
          <Input value={form.emergency_contact_relation} onChange={(e) => set("emergency_contact_relation", e.target.value)} placeholder="e.g. Spouse" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-between items-center pt-2">
        <p className="text-xs text-muted-foreground">Who should we contact in an emergency?</p>
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" onClick={onBack} disabled={saving}>Back</Button>
          )}
          <Button onClick={() => onNext(form)} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isLast ? "Finish" : "Continue"} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}