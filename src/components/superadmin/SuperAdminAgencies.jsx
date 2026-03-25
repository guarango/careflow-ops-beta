import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Search, Eye, Ban, CheckCircle2, UserCheck, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_COLORS = {
  active: "bg-accent/10 text-accent border-accent/20",
  trial: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  churned: "bg-muted text-muted-foreground",
  onboarding: "bg-primary/10 text-primary border-primary/20",
};

export default function SuperAdminAgencies({ agencies }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type, agency }

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agency.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      toast({ title: "Agency updated" });
      setConfirmAction(null);
    },
  });

  const logImpersonation = (agency) => {
    base44.entities.AuditLog.create({
      agency_id: agency.id,
      actor_name: "Platform Owner",
      action: "impersonate_agency",
      target_type: "Agency",
      target_id: agency.id,
      target_name: agency.name,
      details: `Impersonated agency admin for ${agency.name}`,
      timestamp: new Date().toISOString(),
    });
    toast({ title: "Impersonation session started", description: `Viewing ${agency.name} as admin. Session logged.` });
    setSelected(null);
  };

  const filtered = agencies.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.subdomain?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search agencies..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} agencies</span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Agency</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Plan</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Users</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Clients</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell">MRR</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted-foreground py-10">No agencies found</td></tr>
            )}
            {filtered.map(agency => (
              <tr key={agency.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{agency.name}</p>
                  <p className="text-xs text-muted-foreground">{agency.subdomain}.careops.com</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="capitalize text-muted-foreground">{agency.plan || "starter"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${STATUS_COLORS[agency.status] || STATUS_COLORS.active}`}>
                    {agency.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{agency.user_count || 0}</td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{agency.client_count || 0}</td>
                <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">${agency.mrr || 0}/mo</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost" onClick={() => setSelected(agency)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Agency detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Status", <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>],
                  ["Plan", selected.plan],
                  ["State", selected.state || "—"],
                  ["NPI", selected.npi || "—"],
                  ["Users", selected.user_count || 0],
                  ["Clients", selected.client_count || 0],
                  ["MRR", `$${selected.mrr || 0}/mo`],
                  ["Payment", selected.payment_status || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <div className="font-medium text-foreground mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" className="gap-2" onClick={() => logImpersonation(selected)}>
                  <UserCheck className="w-4 h-4" /> Impersonate Admin
                </Button>
                {selected.status === "active" ? (
                  <Button size="sm" variant="destructive" className="gap-2" onClick={() => setConfirmAction({ type: "suspend", agency: selected })}>
                    <Ban className="w-4 h-4" /> Suspend Agency
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="gap-2 text-accent border-accent/30" onClick={() => setConfirmAction({ type: "activate", agency: selected })}>
                    <CheckCircle2 className="w-4 h-4" /> Reactivate
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm destructive action */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {confirmAction?.type === "suspend" ? "Suspend Agency" : "Reactivate Agency"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmAction?.type === "suspend"
              ? `This will immediately suspend all access for ${confirmAction?.agency?.name}. All users will be locked out.`
              : `This will restore full access for ${confirmAction?.agency?.name}.`
            }
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              variant={confirmAction?.type === "suspend" ? "destructive" : "default"}
              onClick={() => {
                updateMutation.mutate({
                  id: confirmAction.agency.id,
                  data: { status: confirmAction.type === "suspend" ? "suspended" : "active" }
                });
                base44.entities.AuditLog.create({
                  agency_id: confirmAction.agency.id,
                  actor_name: "Platform Owner",
                  action: confirmAction.type === "suspend" ? "suspend_agency" : "activate_agency",
                  target_type: "Agency",
                  target_id: confirmAction.agency.id,
                  target_name: confirmAction.agency.name,
                  timestamp: new Date().toISOString(),
                });
                setSelected(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}