import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/auditLog";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import ServiceCodeComplianceFields from "@/components/servicecodes/ServiceCodeComplianceFields";
import { COMPLIANCE_FIELDS, FIELD_LABELS } from "@/lib/serviceCompliance";

const rateTypes = ["Hourly", "Daily", "Per Unit", "Monthly"];
const unitTypes = ["15-minute", "Hourly", "Daily"];
const fundingSources = ["Medicaid", "Medicaid Waiver", "State", "Private", "Other"];
const serviceTypes = ["Residential", "Day Program", "Community Living", "Respite", "Supported Employment", "Behavioral Support", "Nursing", "Other"];

const emptyCode = {
  code: "",
  description: "",
  rate_type: "Hourly",
  unit_type: "Hourly",
  rate: 0,
  unit_minutes: 15,
  funding_source: "Medicaid Waiver",
  service_type: "",
  active: true,
  is_evv_required: false,
  summary_cadence: "Quarterly",
  support_strategy_required: true,
  support_strategy_type: "Standard",
  goal_progress_required_in_summary: true,
  daily_note_required: true,
  annual_report_required: false,
  state: "UT",
  rule_source: "DHHS91172 SOW 1.25",
  rule_confirmed: false,
  source_reference: "",
  compliance_rules: [],
  notes: "",
};

const normalize = (v) => {
  if (v === null || v === undefined) return "";
  return typeof v === "object" ? JSON.stringify(v) : v;
};

export default function ServiceCodeEditDialog({ code, open, onOpenChange, readOnly }) {
  const [form, setForm] = useState(emptyCode);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setError("");
    setReason("");
    setForm(code ? { ...emptyCode, ...code, support_strategy_type: code.support_strategy_type || "" } : { ...emptyCode });
  }, [open, code]);

  const changedFields = code ? COMPLIANCE_FIELDS.filter((f) => normalize(form[f]) !== normalize(code[f])) : [];

  const mutation = useMutation({
    mutationFn: async ({ payload, changed }) => {
      if (code) {
        await base44.entities.ServiceCode.update(code.id, payload);
        for (const field of changed) {
          await logAudit({
            action: "Service code compliance updated",
            target_type: "ServiceCode",
            target_id: code.id,
            target_name: payload.code,
            field: FIELD_LABELS[field] || field,
            old_value: code[field],
            new_value: payload[field],
            details: `Reason: ${reason.trim()}`,
          });
        }
      } else {
        await base44.entities.ServiceCode.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-codes"] });
      toast({ title: code ? "Service code updated" : "Service code added" });
      onOpenChange(false);
    },
  });

  const handleSave = () => {
    if (!form.code?.trim()) return setError("Code is required.");
    if (!form.description?.trim()) return setError("Description is required.");
    if (!form.summary_cadence) return setError("Summary cadence is required.");
    if (changedFields.length > 0 && !reason.trim()) {
      return setError("Add a reason before changing compliance settings.");
    }
    const payload = {
      ...form,
      rate: Number(form.rate) || 0,
      support_strategy_type: form.support_strategy_required ? form.support_strategy_type || null : null,
    };
    mutation.mutate({ payload, changed: changedFields });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{code ? `${code.code} — Service code` : "Add service code"}</DialogTitle>
        </DialogHeader>

        <fieldset disabled={readOnly} className="space-y-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billing</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Code *</Label>
                <Input className="font-mono" value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. TFB" />
              </div>
              <div>
                <Label>Description *</Label>
                <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Rate ($)</Label>
                <Input type="number" step="0.01" value={form.rate ?? 0} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
              </div>
              <div>
                <Label>Rate type</Label>
                <Select value={form.rate_type} onValueChange={(v) => setForm({ ...form, rate_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{rateTypes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit type</Label>
                <Select value={form.unit_type} onValueChange={(v) => setForm({ ...form, unit_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{unitTypes.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service type</Label>
                <Select value={form.service_type || ""} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{serviceTypes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Funding source</Label>
                <Select value={form.funding_source} onValueChange={(v) => setForm({ ...form, funding_source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{fundingSources.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Compliance documentation
            </p>
            <ServiceCodeComplianceFields form={form} setForm={setForm} />
          </div>

          {!readOnly && (
            <div className="border-t border-border pt-4">
              <Label>Reason for change {changedFields.length > 0 && <span className="text-destructive">*</span>}</Label>
              <Textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError(""); }}
                rows={2}
                placeholder="Why is this state rule changing? (written to the audit log)"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {changedFields.length > 0
                  ? `Required for: ${changedFields.map((f) => FIELD_LABELS[f]).join(", ")}.`
                  : "Only needed when a compliance setting changes."}
              </p>
            </div>
          )}
        </fieldset>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{readOnly ? "Close" : "Cancel"}</Button>
          {!readOnly && (
            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : code ? "Save changes" : "Create code"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}