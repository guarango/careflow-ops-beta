import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Search, AlertTriangle, CheckCircle2, Clock, Pen, Users } from "lucide-react";
import ISPEditor from "@/components/isp/ISPEditor";
import ISPDetailView from "@/components/isp/ISPDetailView";
import { cn } from "@/lib/utils";
import { differenceInDays, format } from "date-fns";

const STATUS_COLORS = {
  "Draft": "bg-slate-100 text-slate-600",
  "In Review": "bg-blue-100 text-blue-700",
  "Pending Signatures": "bg-amber-100 text-amber-700",
  "Active": "bg-emerald-100 text-emerald-700",
  "Archived": "bg-slate-100 text-slate-500",
  "Amended": "bg-purple-100 text-purple-700",
};

export default function ISP() {
  const [view, setView] = useState("list");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["isp-plans"],
    queryFn: () => base44.entities.ISPlan.list("-updated_date"),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ISPlan.create(data),
    onSuccess: (result) => { qc.invalidateQueries({ queryKey: ["isp-plans"] }); setSelectedPlan(result); setView("detail"); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ISPlan.update(id, data),
    onSuccess: (result) => { qc.invalidateQueries({ queryKey: ["isp-plans"] }); setSelectedPlan(result); setView("detail"); },
  });

  const handleSave = (formData) => {
    if (selectedPlan?.id) updateMutation.mutate({ id: selectedPlan.id, data: formData });
    else createMutation.mutate(formData);
  };

  const filtered = plans.filter(p =>
    `${p.client_name} ${p.status} ${p.plan_type}`.toLowerCase().includes(search.toLowerCase())
  );

  const getSignatureStatus = (plan) => {
    const sigs = plan.signatures || [];
    if (!sigs.length) return null;
    const signed = sigs.filter(s => s.status === "Signed").length;
    return { signed, total: sigs.length };
  };

  const pendingSigs = plans.filter(p => p.status === "Pending Signatures");
  const active = plans.filter(p => p.status === "Active");

  if (view === "editor") {
    return (
      <ISPEditor
        plan={selectedPlan}
        clients={clients}
        onSave={handleSave}
        onCancel={() => setView(selectedPlan?.id ? "detail" : "list")}
        saving={createMutation.isPending || updateMutation.isPending}
      />
    );
  }

  if (view === "detail" && selectedPlan) {
    return (
      <ISPDetailView
        plan={selectedPlan}
        onEdit={() => setView("editor")}
        onBack={() => { setView("list"); setSelectedPlan(null); }}
        onUpdate={(data) => updateMutation.mutate({ id: selectedPlan.id, data })}
        updating={updateMutation.isPending}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="ISP / Person-Centered Plan Builder"
        subtitle={`${active.length} active plan${active.length !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => { setSelectedPlan(null); setView("editor"); }} className="gap-1.5">
            <Plus className="w-4 h-4" />New ISP
          </Button>
        }
      />

      <div className="mb-5 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-xs text-sky-800 leading-relaxed">
        <strong>Auto-Assembly</strong> pulls live data from goals, health records, session notes, and BSPs into a pre-filled draft — eliminating the 8–12 hour manual retyping process. The person's voice section always appears first.
      </div>

      {pendingSigs.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-2">
          <Pen className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800"><strong>{pendingSigs.length} plan{pendingSigs.length !== 1 ? "s" : ""}</strong> awaiting signatures.</p>
        </div>
      )}

      <Card className="mb-5">
        <CardContent className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search plans..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Individual Support Plans"
          description="Create an ISP to auto-assemble a person-centered plan from live system data."
          action={<Button onClick={() => { setSelectedPlan(null); setView("editor"); }} size="sm"><Plus className="w-4 h-4 mr-1" />Create ISP</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(plan => {
            const sigStatus = getSignatureStatus(plan);
            const flags = plan.assembly_flags || [];
            const domainCount = (plan.life_domains || []).length;
            const serviceCount = (plan.service_grid || []).length;
            const underutilized = (plan.service_grid || []).filter(s => s.underutilized && !s.underutilization_explanation).length;

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => { setSelectedPlan(plan); setView("detail"); }}
                className={cn(
                  "text-left border-2 rounded-xl p-4 bg-white hover:border-primary/40 hover:shadow-sm transition-all",
                  plan.status === "Pending Signatures" ? "border-amber-300" : plan.status === "Active" ? "border-emerald-200" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-sm">{plan.client_name}</p>
                    <p className="text-xs text-muted-foreground">{plan.plan_type} · {plan.plan_year_start && format(new Date(plan.plan_year_start), "yyyy")}</p>
                  </div>
                  <Badge className={cn("text-xs shrink-0", STATUS_COLORS[plan.status])} variant="outline">{plan.status}</Badge>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {domainCount > 0 && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{domainCount} domains</span>}
                  {serviceCount > 0 && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{serviceCount} services</span>}
                  {sigStatus && (
                    <span className={cn("text-xs px-2 py-0.5 rounded-full flex items-center gap-0.5",
                      sigStatus.signed === sigStatus.total ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                      <Pen className="w-3 h-3" />{sigStatus.signed}/{sigStatus.total} signed
                    </span>
                  )}
                  {underutilized > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" />{underutilized} underutilized
                    </span>
                  )}
                  {flags.length > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" />{flags.length} flag{flags.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {plan.service_coordinator_name && <p className="text-[10px] text-muted-foreground mt-2">SC: {plan.service_coordinator_name}</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}