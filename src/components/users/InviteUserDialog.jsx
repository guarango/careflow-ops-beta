import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Info, UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { JOB_TITLES, APP_ACCESS_OPTIONS } from "@/lib/jobTitles";
import { ROLE_DESCRIPTIONS } from "@/lib/permissions";
import CheckboxPicker from "./CheckboxPicker";

const EMPTY = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  job_title: "",
  app_access: "dsp",
  hr_bundle: false,
  billing_bundle: false,
};

/**
 * The one invite form. Everything it collects is saved by manageUsers (action
 * "invite") into a Pending StaffMember, the invite email, signature requests and
 * the audit log — nothing is kept in page state.
 */
export default function InviteUserDialog({ open, onOpenChange, onInvited }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [reactivate, setReactivate] = useState(false);
  const [clientIds, setClientIds] = useState([]);
  const [houseIds, setHouseIds] = useState([]);
  const [templateIds, setTemplateIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
    enabled: open,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
    enabled: open,
  });
  const { data: houses = [] } = useQuery({
    queryKey: ["houses"],
    queryFn: () => base44.entities.House.list(),
    enabled: open,
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["signature-templates"],
    queryFn: () => base44.entities.SignatureTemplate.filter({ status: "Active" }),
    enabled: open,
  });

  const cleanEmail = form.email.trim().toLowerCase();
  const existing = useMemo(
    () => (cleanEmail ? staff.find((s) => (s.email || "").toLowerCase() === cleanEmail) : null),
    [staff, cleanEmail]
  );
  const blocked = !!existing && !reactivate;
  const needsReactivate = existing?.status === "Inactive";

  const toggle = (setter) => (id) =>
    setter((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const reset = () => {
    setForm(EMPTY);
    setReactivate(false);
    setClientIds([]);
    setHouseIds([]);
    setTemplateIds([]);
  };

  const missing = [
    !form.first_name.trim() && "first name",
    !form.last_name.trim() && "last name",
    !cleanEmail.includes("@") && "email",
    !form.phone.trim() && "phone",
    !form.job_title && "job title",
    !form.app_access && "app access",
  ].filter(Boolean);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke("manageUsers", {
        action: "invite",
        ...form,
        email: cleanEmail,
        hr_bundle: form.app_access === "admin" ? form.hr_bundle : false,
        billing_bundle: form.app_access === "admin" ? form.billing_bundle : false,
        client_ids: form.app_access === "admin" ? [] : clientIds,
        house_ids: form.app_access === "admin" ? [] : houseIds,
        signature_template_ids: templateIds,
        reactivate: !!existing && reactivate,
      });
      if (res.data?.error) throw new Error(res.data.error);
      if (res.data?.inviteError) {
        toast({ title: "Saved, but the invite email failed", description: res.data.inviteError, variant: "destructive" });
      }
      const name = `${form.first_name} ${form.last_name}`.trim();
      toast({
        title: reactivate ? "Person reactivated" : "Invitation sent",
        description: reactivate
          ? `${name} can sign in again.`
          : `${name} was saved as Pending and invited to sign in.`,
      });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["signature-requests"] });
      reset();
      onOpenChange(false);
      onInvited?.();
    } catch (err) {
      toast({ title: "Invite failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" />Invite User</DialogTitle>
          <DialogDescription>
            Creates their staff record as Pending and emails them a sign-in invitation. They become Active the first time they sign in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>First name *</Label><Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></div>
            <div><Label>Last name *</Label><Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => { set("email", e.target.value); setReactivate(false); }} placeholder="person@agency.com" /></div>
            <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 555-5555" /></div>
            <div>
              <Label>Job title *</Label>
              <Select value={form.job_title} onValueChange={(v) => set("job_title", v)}>
                <SelectTrigger><SelectValue placeholder="Select a job title" /></SelectTrigger>
                <SelectContent>{JOB_TITLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>App access *</Label>
              <Select value={form.app_access} onValueChange={(v) => set("app_access", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{APP_ACCESS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            {ROLE_DESCRIPTIONS[form.app_access]} Job title is HR information only — it never grants access.
          </p>

          {existing && (
            <div className="rounded-lg border border-chart-4/30 bg-chart-4/10 px-3 py-2.5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-chart-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                {needsReactivate ? (
                  <>
                    <p className="text-foreground">This person was deactivated.</p>
                    <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                      <Checkbox checked={reactivate} onCheckedChange={(v) => setReactivate(!!v)} />
                      <span className="text-sm">Reactivate instead</span>
                    </label>
                  </>
                ) : (
                  <p className="text-foreground">This person already has an account.</p>
                )}
              </div>
            </div>
          )}

          {form.app_access === "admin" && (
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permission bundles (optional)</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.hr_bundle} onCheckedChange={(v) => set("hr_bundle", !!v)} />
                <span className="text-sm">HR bundle — staff files, onboarding, trainings, compliance</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.billing_bundle} onCheckedChange={(v) => set("billing_bundle", !!v)} />
                <span className="text-sm">Billing bundle — rates, authorizations, payroll/billing/EVV export</span>
              </label>
            </div>
          )}

          {form.app_access !== "admin" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CheckboxPicker
                label="Assign clients (optional)"
                hint={form.app_access === "manager" ? "Clients this manager oversees." : undefined}
                items={clients.map((c) => ({ id: c.id, label: `${c.first_name || ""} ${c.last_name || ""}`.trim() }))}
                selected={clientIds}
                onToggle={toggle(setClientIds)}
              />
              <CheckboxPicker
                label="Assign houses (optional)"
                hint={form.app_access === "manager" ? "Houses this manager oversees." : undefined}
                items={houses.map((h) => ({ id: h.id, label: h.name || "House" }))}
                selected={houseIds}
                onToggle={toggle(setHouseIds)}
              />
            </div>
          )}

          <CheckboxPicker
            label="E-signature documents to send (optional)"
            items={(Array.isArray(templates) ? templates : templates?.items || []).map((t) => ({ id: t.id, label: t.name }))}
            selected={templateIds}
            onToggle={toggle(setTemplateIds)}
            emptyText="No signature templates yet — add them under HR → E-signatures."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Cancel</Button>
          <Button onClick={submit} disabled={saving || missing.length > 0 || blocked}>
            {saving ? "Saving..." : reactivate ? "Reactivate" : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}