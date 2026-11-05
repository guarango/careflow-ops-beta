import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, ShieldCheck } from "lucide-react";

const STATUS_STYLES = {
  "Pending Submission": "bg-muted text-muted-foreground",
  Submitted: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Approved: "bg-accent/15 text-accent border-accent/20",
  Denied: "bg-destructive/10 text-destructive border-destructive/20",
  Expired: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  "Pending Appeal": "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

const UNIT_TYPES = ["Hours", "Visits", "Days", "Units"];
const STATUSES = Object.keys(STATUS_STYLES);
const FUNDING = ["Medicaid", "Medicaid Waiver", "State", "Private", "Other"];

const emptyFor = (client) => ({
  client_id: client.id,
  client_name: `${client.first_name || ""} ${client.last_name || ""}`.trim(),
  service_code_id: "",
  service_code: "",
  service_type: "",
  funding_source: "Medicaid Waiver",
  auth_number: "",
  payer: "",
  authorized_units: 0,
  used_units: 0,
  unit_type: "Hours",
  start_date: "",
  end_date: "",
  status: "Pending Submission",
  notes: "",
});

/**
 * "Authorizations & units" section on a client profile.
 * Visible when the viewer can track units; add/edit needs the manage code.
 */
export default function ClientAuthorizations({ client }) {
  const { can } = useRole();
  const canView = can("viewUnitTracking");
  const canManage = can("authorizationsManage");
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);

  const { data: auths = [] } = useQuery({
    queryKey: ["client-authorizations", client?.id],
    queryFn: () => base44.entities.Authorization.filter({ client_id: client.id }),
    enabled: !!client?.id && canView,
  });

  const { data: serviceCodes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
    enabled: canView && canManage,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["client-authorizations", client?.id] });
    queryClient.invalidateQueries({ queryKey: ["authorizations"] });
  };

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const payload = {
        ...data,
        remaining_units: (data.authorized_units || 0) - (data.used_units || 0),
      };
      return id
        ? base44.entities.Authorization.update(id, payload)
        : base44.entities.Authorization.create(payload);
    },
    onSuccess: () => { invalidate(); closeDialog(); },
  });

  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(null); };
  const openNew = () => { setForm(emptyFor(client)); setEditing(null); setShowDialog(true); };
  const openEdit = (a) => { setForm({ ...emptyFor(client), ...a }); setEditing(a); setShowDialog(true); };

  const pickServiceCode = (id) => {
    const sc = serviceCodes.find((x) => x.id === id);
    setForm((f) => ({ ...f, service_code_id: id, service_code: sc?.code || "", service_type: sc?.service_type || f.service_type }));
  };

  if (!canView) return null;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Authorizations & units</CardTitle>
        </div>
        {canManage && (
          <Button size="sm" variant="outline" onClick={openNew} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />Add authorization
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {auths.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No authorizations on file.</p>
        ) : (
          auths.map((a) => {
            const pct = a.authorized_units > 0 ? Math.round(((a.used_units || 0) / a.authorized_units) * 100) : 0;
            const remaining = a.remaining_units !== undefined && a.remaining_units !== null
              ? a.remaining_units
              : (a.authorized_units || 0) - (a.used_units || 0);
            return (
              <div
                key={a.id}
                className={`rounded-lg border border-border p-3 space-y-2 ${canManage ? "cursor-pointer hover:bg-muted/40" : ""}`}
                onClick={canManage ? () => openEdit(a) : undefined}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-primary">{a.service_code || "—"}</span>
                  <Badge variant="outline" className={STATUS_STYLES[a.status] || "bg-muted text-muted-foreground"}>
                    {a.status || "—"}
                  </Badge>
                  {a.auth_number && <span className="text-xs text-muted-foreground">Auth #{a.auth_number}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {a.start_date || "—"} → {a.end_date || "—"}
                  </span>
                </div>
                <Progress value={Math.min(pct, 100)} className="h-1.5" />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{a.used_units || 0} of {a.authorized_units || 0} {a.unit_type || "units"} used ({pct}%)</span>
                  <span className={remaining <= 0 ? "text-destructive font-medium" : ""}>{remaining} remaining</span>
                  {a.payer && <span>{a.payer}</span>}
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      {canManage && form && (
        <Dialog open={showDialog} onOpenChange={(o) => (o ? null : closeDialog())}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Authorization" : "Add Authorization"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Service code</Label>
                  <Select value={form.service_code_id || ""} onValueChange={pickServiceCode}>
                    <SelectTrigger><SelectValue placeholder="Select code" /></SelectTrigger>
                    <SelectContent>
                      {serviceCodes.map((sc) => (
                        <SelectItem key={sc.id} value={sc.id}>{sc.code} — {sc.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Auth number</Label>
                  <Input value={form.auth_number || ""} onChange={(e) => setForm({ ...form, auth_number: e.target.value })} />
                </div>
                <div>
                  <Label>Payer</Label>
                  <Input value={form.payer || ""} onChange={(e) => setForm({ ...form, payer: e.target.value })} />
                </div>
                <div>
                  <Label>Funding source</Label>
                  <Select value={form.funding_source || "Medicaid Waiver"} onValueChange={(v) => setForm({ ...form, funding_source: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FUNDING.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Authorized units</Label>
                  <Input type="number" value={form.authorized_units ?? 0} onChange={(e) => setForm({ ...form, authorized_units: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Used units</Label>
                  <Input type="number" value={form.used_units ?? 0} onChange={(e) => setForm({ ...form, used_units: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Unit type</Label>
                  <Select value={form.unit_type || "Hours"} onValueChange={(v) => setForm({ ...form, unit_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIT_TYPES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status || "Pending Submission"} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start date</Label>
                  <Input type="date" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>End date</Label>
                  <Input type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button
                onClick={() => saveMutation.mutate({ id: editing?.id, data: form })}
                disabled={!form.service_code || saveMutation.isPending}
              >
                {editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}