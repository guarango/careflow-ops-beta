import React from "react";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CAREGIVER_RELATIONSHIPS, FAMILY_CARE_CODES } from "@/lib/supportedLivingValidations";

export default function SupportedLivingChecks({ form, setForm, client, isLocked, code, warnings = [] }) {
  const familyCare = FAMILY_CARE_CODES.includes(String(code || "").toUpperCase());

  return (
    <div className="space-y-3">
      <div className="bg-white border border-border rounded-xl p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
          Supported Living — {code} (Article 35)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">Caregiver relationship to {client.first_name} *</Label>
            <Select
              value={form.caregiver_relationship || ""}
              disabled={isLocked}
              onValueChange={(v) => setForm((f) => ({ ...f, caregiver_relationship: v }))}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="How is the staff member related?" /></SelectTrigger>
              <SelectContent>
                {CAREGIVER_RELATIONSHIPS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              SLN when the staff is not family; CMP for a parent, step-parent or legal guardian; CMS for a spouse (§35.6).
            </p>
          </div>
          <div>
            <Label className="text-xs">Time asleep (minutes)</Label>
            <Input
              type="number"
              min="0"
              value={form.asleep_minutes ?? ""}
              disabled={isLocked}
              onChange={(e) => setForm((f) => ({ ...f, asleep_minutes: e.target.value === "" ? "" : Number(e.target.value) }))}
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Time the Person was asleep is not billable (§35.4).</p>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Documented need {familyCare && <span className="text-destructive">*</span>}</Label>
            <Textarea
              value={form.documented_need || ""}
              disabled={isLocked}
              onChange={(e) => setForm((f) => ({ ...f, documented_need: e.target.value }))}
              rows={2}
              placeholder="What need exceeds what a parent, step-parent, guardian or spouse would typically do for a person without a disability of the same age?"
              className="text-sm resize-none"
            />
            <p className="text-[11px] text-muted-foreground mt-1">§35.4(5) · also documents the need when overnight respite falls in the same 24 hours (§35.4(3)).</p>
          </div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-800">
                  {w.rule} <span className="font-normal text-amber-600">{w.citation}</span>
                </p>
                <p className="text-xs text-amber-800 leading-snug">{w.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}