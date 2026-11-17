import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, FileText, Upload } from "lucide-react";
import PCSPGoalsEditor from "./PCSPGoalsEditor";
import PCSPServicesEditor from "./PCSPServicesEditor";
import PrivateFileLink from "@/components/shared/PrivateFileLink";
import { useToast } from "@/components/ui/use-toast";
import {
  activatePcsp,
  computePlanYearEnd,
  computeSupportStrategyDue,
  isBackdated,
  savePcsp,
} from "@/lib/pcsp";
import { todayISO } from "@/lib/dateUtils";

const blankForm = (client) => ({
  client_id: client.id,
  client_name: `${client.first_name || ""} ${client.last_name || ""}`.trim(),
  plan_year_start: todayISO(),
  plan_year_end: computePlanYearEnd(todayISO()),
  activation_date: "",
  received_date: todayISO(),
  support_coordinator_name: "",
  support_coordinator_agency: "",
  support_coordinator_email: "",
  support_coordinator_phone: "",
  services_on_plan: [],
  pcsp_goals: [],
  important_to: "",
  important_for: "",
  rights_modifications_present: false,
  source_document: "",
  source_document_name: "",
  status: "Draft",
});

export default function PCSPFormDialog({ client, plan, nextVersion, open, onOpenChange }) {
  const [form, setForm] = useState(() => blankForm(client));
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setError("");
    setReason("");
    setForm(
      plan
        ? {
            ...blankForm(client),
            ...plan,
            services_on_plan: plan.services_on_plan || [],
            pcsp_goals: plan.pcsp_goals || [],
          }
        : blankForm(client)
    );
  }, [open, plan, client]);

  const { data: codes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
    enabled: open,
  });
  const { data: clientGoals = [] } = useQuery({
    queryKey: ["pcsp-client-goals", client.id],
    queryFn: () => base44.entities.ClientGoal.filter({ client_id: client.id }),
    enabled: open,
  });
  const { data: authorizations = [] } = useQuery({
    queryKey: ["pcsp-client-auths", client.id],
    queryFn: () => base44.entities.Authorization.filter({ client_id: client.id }),
    enabled: open,
  });

  const strategiesDue = computeSupportStrategyDue(form.activation_date);
  const backdated = isBackdated(form.activation_date, form.received_date);
  const revisingActive = plan?.status === "Active";

  const uploadDocument = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file }); // stored privately
      setForm((f) => ({ ...f, source_document: file_uri, source_document_name: file.name }));
    } catch {
      setError("Could not upload the PCSP document. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (activate) => {
    setError("");
    if (!form.plan_year_start || !form.plan_year_end) {
      return setError("Enter the PCSP plan year start and end dates.");
    }
    if (activate && !form.activation_date) {
      return setError("Enter the activation date before activating this PCSP.");
    }
    if (backdated && !reason.trim()) {
      return setError("Activation is before the received date — add a manager's reason to back-date.");
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        support_strategy_due_date: strategiesDue,
        renewal_meeting_due: form.plan_year_end,
        services_on_plan: (form.services_on_plan || [])
          .filter((s) => s.service_code_id)
          .map((s) => ({
            ...s,
            units_authorized:
              s.units_authorized === "" || s.units_authorized === null || s.units_authorized === undefined
                ? null
                : Number(s.units_authorized),
          })),
        pcsp_goals: (form.pcsp_goals || []).filter((g) => (g.goal_text_as_written || "").trim()),
      };
      const saved = await savePcsp({ plan, payload, reason: reason.trim() });
      if (activate) await activatePcsp(saved);
      await queryClient.invalidateQueries({ queryKey: ["pcsp-plans", client.id] });
      await queryClient.invalidateQueries({ queryKey: ["isp-plans"] });
      toast({
        title: activate
          ? "PCSP activated"
          : revisingActive
          ? `Version ${nextVersion} saved as a draft`
          : "PCSP saved",
      });
      onOpenChange(false);
    } catch (e) {
      setError(e?.message || "Could not save the PCSP.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {plan ? `PCSP — ${plan.client_name}` : `New PCSP — ${form.client_name}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {revisingActive && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
              This PCSP is active. Saving creates version {nextVersion} as a new draft; version{" "}
              {plan.version || 1} stays unchanged and viewable.
            </div>
          )}

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Plan year &amp; dates
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Plan year start *</Label>
                <Input
                  type="date"
                  value={form.plan_year_start || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      plan_year_start: e.target.value,
                      plan_year_end: computePlanYearEnd(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Plan year end *</Label>
                <Input
                  type="date"
                  value={form.plan_year_end || ""}
                  onChange={(e) => setForm({ ...form, plan_year_end: e.target.value })}
                />
              </div>
              <div>
                <Label>Received from support coordinator</Label>
                <Input
                  type="date"
                  value={form.received_date || ""}
                  onChange={(e) => setForm({ ...form, received_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Activation date</Label>
                <Input
                  type="date"
                  value={form.activation_date || ""}
                  onChange={(e) => setForm({ ...form, activation_date: e.target.value })}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Support Strategies due{" "}
              <span className="font-medium text-foreground">{strategiesDue || "—"}</span> (30 days after
              activation) · Renewal meeting due {form.plan_year_end || "—"}
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Support coordinator (contact only — not an app user)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.support_coordinator_name || ""}
                  onChange={(e) => setForm({ ...form, support_coordinator_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Agency</Label>
                <Input
                  value={form.support_coordinator_agency || ""}
                  onChange={(e) => setForm({ ...form, support_coordinator_agency: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.support_coordinator_email || ""}
                  onChange={(e) => setForm({ ...form, support_coordinator_email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.support_coordinator_phone || ""}
                  onChange={(e) => setForm({ ...form, support_coordinator_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Services on the PCSP
            </p>
            <PCSPServicesEditor
              rows={form.services_on_plan || []}
              setRows={(rows) => setForm({ ...form, services_on_plan: rows })}
              codes={codes}
              authorizations={authorizations}
            />
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Goals on the PCSP
            </p>
            <PCSPGoalsEditor
              goals={form.pcsp_goals || []}
              setGoals={(goals) => setForm({ ...form, pcsp_goals: goals })}
              clientGoals={clientGoals}
              codes={codes}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Important TO the person</Label>
              <Textarea
                rows={4}
                value={form.important_to || ""}
                onChange={(e) => setForm({ ...form, important_to: e.target.value })}
              />
            </div>
            <div>
              <Label>Important FOR the person (health &amp; safety)</Label>
              <Textarea
                rows={4}
                value={form.important_for || ""}
                onChange={(e) => setForm({ ...form, important_for: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="rights-modifications"
              checked={!!form.rights_modifications_present}
              onCheckedChange={(v) => setForm({ ...form, rights_modifications_present: !!v })}
            />
            <Label htmlFor="rights-modifications" className="text-sm font-normal">
              The PCSP documents rights modifications
            </Label>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              PCSP document
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : form.source_document ? "Replace PDF" : "Upload PCSP PDF"}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => uploadDocument(e.target.files?.[0])}
                />
              </label>
              {form.source_document && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  {form.source_document_name || "PCSP document"}
                  <PrivateFileLink fileUri={form.source_document} label="View" />
                </span>
              )}
            </div>
          </div>

          <div>
            <Label>Reason (required when back-dating or correcting an active PCSP)</Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              placeholder="Why is this date or change being made? (written to the audit log)"
            />
            {backdated && (
              <p className="mt-1 text-xs text-amber-700">
                Activation {form.activation_date} is before the received date {form.received_date} — a
                manager's reason is required.
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving || uploading}>
            {saving ? "Saving…" : revisingActive ? "Save new version" : "Save draft"}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving || uploading}>
            Save &amp; activate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}