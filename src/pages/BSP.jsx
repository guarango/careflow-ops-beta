import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Search, AlertTriangle, Heart, CheckCircle2, Clock } from "lucide-react";
import BSPPlanEditor from "@/components/bsp/BSPPlanEditor";
import BSPDetailView from "@/components/bsp/BSPDetailView";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

export default function BSP() {
  const [view, setView] = useState("list"); // "list" | "editor" | "detail"
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["bsp-plans"],
    queryFn: () => base44.entities.BehaviorSupportPlan.list("-updated_date"),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });
  const { data: allIncidents = [] } = useQuery({
    queryKey: ["behavior-incidents-all"],
    queryFn: () => base44.entities.BehaviorIncident.list("-date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BehaviorSupportPlan.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["bsp-plans"] });
      setSelectedPlan(result);
      setView("detail");
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BehaviorSupportPlan.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["bsp-plans"] });
      setSelectedPlan(result);
      setView("detail");
    },
  });

  const handleSave = (formData) => {
    if (selectedPlan?.id) {
      updateMutation.mutate({ id: selectedPlan.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filtered = plans.filter(p =>
    `${p.client_name} ${p.bsp_author} ${p.status}`.toLowerCase().includes(search.toLowerCase())
  );

  const getReviewStatus = (plan) => {
    if (!plan.next_review_date) return null;
    const days = differenceInDays(new Date(plan.next_review_date), new Date());
    if (days < 0) return { label: "Overdue", color: "bg-red-100 text-red-700" };
    if (days <= 30) return { label: `Due in ${days}d`, color: "bg-amber-100 text-amber-700" };
    return null;
  };

  const getRecentIncidents = (planId) => {
    const week = new Date(); week.setDate(week.getDate() - 7);
    return allIncidents.filter(i => i.bsp_id === planId && new Date(i.date) >= week).length;
  };

  // ── EDITOR ──
  if (view === "editor") {
    return (
      <BSPPlanEditor
        plan={selectedPlan}
        clients={clients}
        onSave={handleSave}
        onCancel={() => { setView(selectedPlan?.id ? "detail" : "list"); }}
        saving={createMutation.isPending || updateMutation.isPending}
      />
    );
  }

  // ── DETAIL ──
  if (view === "detail" && selectedPlan) {
    return (
      <BSPDetailView
        bsp={selectedPlan}
        onEdit={() => setView("editor")}
        onBack={() => { setView("list"); setSelectedPlan(null); }}
      />
    );
  }

  // ── LIST ──
  const pendingApproval = plans.filter(p => p.status === "Pending Approval");
  const activePlans = plans.filter(p => p.status === "Active");

  return (
    <div>
      <PageHeader
        title="Behavior Support Plans"
        subtitle={`${activePlans.length} active plan${activePlans.length !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => { setSelectedPlan(null); setView("editor"); }} className="gap-1.5">
            <Plus className="w-4 h-4" />New BSP
          </Button>
        }
      />

      {/* Philosophy banner */}
      <div className="mb-5 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <Heart className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-700 leading-relaxed">
          <strong>Every behavior is communication.</strong> Behavior Support Plans exist to help us understand, not to control. These plans are living documents — updated by data, driven by relationship, and always centered on the dignity and growth of the person we serve.
        </p>
      </div>

      {/* Pending approval alert */}
      {pendingApproval.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{pendingApproval.length} plan{pendingApproval.length !== 1 ? "s" : ""}</strong> pending administrator approval for restrictive procedures.
          </p>
        </div>
      )}

      {/* Search */}
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
          icon={Shield}
          title="No Behavior Support Plans"
          description="Create a BSP to document proactive strategies, replacement behaviors, and staff response protocols."
          action={<Button onClick={() => { setSelectedPlan(null); setView("editor"); }} size="sm"><Plus className="w-4 h-4 mr-1" />Create BSP</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(plan => {
            const reviewStatus = getReviewStatus(plan);
            const recentCount = getRecentIncidents(plan.id);
            const hasRestrictive = plan.includes_restrictive_procedures;
            const behaviorCount = (plan.target_behaviors || []).length;
            const ackCount = (plan.staff_training?.acknowledgments || []).filter(a => a.quiz_passed).length;

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => { setSelectedPlan(plan); setView("detail"); }}
                className={cn(
                  "text-left border-2 rounded-xl p-4 bg-white hover:border-primary/40 hover:shadow-sm transition-all",
                  plan.status === "Pending Approval" ? "border-amber-300" : plan.status === "Active" ? "border-emerald-200" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-sm">{plan.client_name}</p>
                    <p className="text-xs text-muted-foreground">{plan.bsp_author} · {plan.bsp_author_credential}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={plan.status} />
                    {hasRestrictive && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />Restrictive</span>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    {behaviorCount} behavior{behaviorCount !== 1 ? "s" : ""}
                  </span>
                  {recentCount > 0 && (
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", recentCount >= 5 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                      {recentCount} incident{recentCount !== 1 ? "s" : ""} this week
                    </span>
                  )}
                  {ackCount > 0 && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" />{ackCount} cleared
                    </span>
                  )}
                  {reviewStatus && (
                    <span className={cn("text-xs px-2 py-0.5 rounded-full flex items-center gap-0.5", reviewStatus.color)}>
                      <Clock className="w-3 h-3" />{reviewStatus.label}
                    </span>
                  )}
                </div>

                {plan.regulatory_framework && (
                  <p className="text-[10px] text-muted-foreground mt-2">{plan.regulatory_framework}</p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}