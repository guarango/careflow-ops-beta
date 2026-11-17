import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PrivateFileLink from "@/components/shared/PrivateFileLink";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, ShieldAlert } from "lucide-react";
import {
  RIGHT_OPTIONS, ELEMENTS, activationBlockers, nextReviewDate, todayISO,
} from "@/lib/rightsModifications";

const EMPTY = {
  right_affected: "", right_other_detail: "",
  assessed_need: "", positive_interventions: "", less_intrusive_methods: "", condition_description: "",
  data_collection_review: "", review_time_limits: "", informed_consent: "", no_harm_assurance: "",
  approved_by: "", approval_body: "", approval_date: "",
  consent_by: "", consent_date: "", consent_document: "", consent_document_name: "",
  data_method: "", data_frequency: "", data_goal_id: "", data_goal_title: "",
  review_interval_days: 90, next_review_date: "", dsp_instruction: "",
};

export default function RightsModificationDialog({ open, onOpenChange, client, plans, goals, modification, canApprove, actorName, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(modification
      ? { ...EMPTY, ...modification }
      : {
          ...EMPTY,
          client_id: client.id,
          client_name: `${client.first_name || ""} ${client.last_name || ""}`.trim(),
          pcsp_id: plans[0]?.id || "",
        });
  }, [open, modification, client, plans]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const blockers = activationBlockers(form);
  const plannedNext = form.next_review_date || nextReviewDate(todayISO(), form.review_interval_days);
  const planLabel = (plan) => `v${plan.version || 1} · ${plan.plan_year_start || "—"} to ${plan.plan_year_end || "—"}`;

  const uploadConsent = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setForm((prev) => ({ ...prev, consent_document: file_uri, consent_document_name: file.name }));
    } catch (e) {
      setError(e?.message || "The consent document could not be uploaded.");
    } finally {
      setUploading(false);
    }
  };

  const persist = async () => {
    if (!form.pcsp_id) throw new Error("Link this modification to the person's PCSP.");
    if (!form.right_affected) throw new Error("Choose the right being modified.");
    const missing = ELEMENTS.filter((e) => !String(form[e.field] || "").trim());
    if (missing.length) throw new Error(`Element${missing.length > 1 ? "s" : ""} ${missing.map((e) => e.n).join(", ")} must be documented before saving.`);

    const plan = plans.find((p) => p.id === form.pcsp_id);
    const goal = goals.find((g) => g.id === form.data_goal_id);
    const payload = {
      ...form,
      pcsp_label: plan ? planLabel(plan) : form.pcsp_label || "",
      data_goal_title: goal?.goal_title || form.data_goal_title || "",
      review_interval_days: Number(form.review_interval_days) || 90,
    };
    delete payload.id;
    delete payload.created_date;
    delete payload.updated_date;
    delete payload.created_by_id;

    if (modification) return await base44.entities.RightsModification.update(modification.id, payload);
    return await base44.entities.RightsModification.create({ ...payload, created_by_name: actorName || "" });
  };

  const saveDraft = async () => {
    setSaving(true);
    setError("");
    try {
      const saved = await persist();
      onSaved?.(saved);
      toast({ title: "Rights modification saved" });
      onOpenChange(false);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action) => {
    setSaving(true);
    setError("");
    try {
      const saved = await persist();
      const res = await base44.functions.invoke("manageRightsModification", { action, id: saved.id });
      onSaved?.(res.data?.record || saved);
      toast({ title: action === "approve" ? "Modification approved" : "Modification activated" });
      onOpenChange(false);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "The action could not be completed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            Rights modification
          </DialogTitle>
          <DialogDescription>
            {form.client_name} · 42 CFR 441.301(c)(4)(vi)(F). Every element below is required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>PCSP this is documented in *</Label>
              <Select value={form.pcsp_id} onValueChange={(v) => set("pcsp_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select the active PCSP" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => <SelectItem key={p.id} value={p.id}>{planLabel(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Right affected *</Label>
              <Select value={form.right_affected} onValueChange={(v) => set("right_affected", v)}>
                <SelectTrigger><SelectValue placeholder="Select the right" /></SelectTrigger>
                <SelectContent>
                  {RIGHT_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.right_affected === "Other" && (
              <div className="sm:col-span-2">
                <Label>Which right?</Label>
                <Input value={form.right_other_detail || ""} onChange={(e) => set("right_other_detail", e.target.value)} />
              </div>
            )}
          </div>

          <div className="space-y-3">
            {ELEMENTS.map((el) => (
              <div key={el.field}>
                <Label>{el.n}. {el.label} *</Label>
                <Textarea
                  rows={2}
                  value={form[el.field] || ""}
                  onChange={(e) => set(el.field, e.target.value)}
                  placeholder="Documented in the person's own terms wherever possible"
                />
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Approval</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              <div><Label>Approved by *</Label><Input value={form.approved_by || ""} onChange={(e) => set("approved_by", e.target.value)} /></div>
              <div><Label>Approval body</Label><Input placeholder="Human Rights Committee" value={form.approval_body || ""} onChange={(e) => set("approval_body", e.target.value)} /></div>
              <div><Label>Approval date *</Label><Input type="date" value={form.approval_date || ""} onChange={(e) => set("approval_date", e.target.value)} /></div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Consent</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              <div><Label>Consent by (person or guardian) *</Label><Input value={form.consent_by || ""} onChange={(e) => set("consent_by", e.target.value)} /></div>
              <div><Label>Consent date *</Label><Input type="date" value={form.consent_date || ""} onChange={(e) => set("consent_date", e.target.value)} /></div>
              <div>
                <Label>Consent document</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Button type="button" size="sm" variant="outline" asChild disabled={uploading}>
                    <label className="cursor-pointer">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                      Upload
                      <input type="file" className="hidden" onChange={uploadConsent} disabled={uploading} />
                    </label>
                  </Button>
                  {form.consent_document ? (
                    <PrivateFileLink fileUri={form.consent_document} label={form.consent_document_name || "View consent"} />
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Data and review</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><Label>Data method</Label><Input placeholder="e.g. goal trials recorded in session notes" value={form.data_method || ""} onChange={(e) => set("data_method", e.target.value)} /></div>
              <div><Label>Data frequency</Label><Input placeholder="e.g. every session" value={form.data_frequency || ""} onChange={(e) => set("data_frequency", e.target.value)} /></div>
              <div className="sm:col-span-2">
                <Label>Goal used to track it</Label>
                <Select value={form.data_goal_id || ""} onValueChange={(v) => set("data_goal_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Link a goal" /></SelectTrigger>
                  <SelectContent>
                    {goals.map((g) => <SelectItem key={g.id} value={g.id}>{g.goal_title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Review interval (days) *</Label>
                <Input type="number" min={1} value={form.review_interval_days ?? ""} onChange={(e) => set("review_interval_days", e.target.value)} />
              </div>
              <div>
                <Label>Next review date</Label>
                <p className="text-sm text-muted-foreground mt-2">{form.status === "Draft" ? `Set on activation · ${plannedNext}` : plannedNext}</p>
              </div>
              <div className="sm:col-span-2">
                <Label>How DSPs carry it out</Label>
                <Textarea rows={2} value={form.dsp_instruction || ""} onChange={(e) => set("dsp_instruction", e.target.value)} placeholder="The exact steps staff follow" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs font-semibold text-amber-900">Cannot go Active until</p>
            <ul className="text-xs text-amber-800 list-disc pl-4 mt-1 space-y-0.5">
              {blockers.length ? blockers.map((b) => <li key={b}>{b}</li>) : <li>Nothing — all requirements are met.</li>}
            </ul>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="outline" onClick={saveDraft} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Save
          </Button>
          {canApprove && (form.status === "Draft" || form.status === "Approved") && (
            <Button variant="secondary" onClick={() => runAction("approve")} disabled={saving}>Approve</Button>
          )}
          {form.status === "Approved" && blockers.length === 0 && (
            <Button onClick={() => runAction("activate")} disabled={saving}>Activate</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}