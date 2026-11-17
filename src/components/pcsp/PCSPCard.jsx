import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import { CheckCircle2, FileBadge, History, Pencil, Plus } from "lucide-react";
import PrivateFileLink from "@/components/shared/PrivateFileLink";
import PCSPGoalList from "./PCSPGoalList";
import PCSPFormDialog from "./PCSPFormDialog";
import PCSPVersionDrawer from "./PCSPVersionDrawer";
import {
  PCSP_STATUS_STYLES,
  activatePcsp,
  computeSupportStrategyDue,
  daysUntil,
  nextVersionNumber,
} from "@/lib/pcsp";

function DueStat({ label, date, days, warnAt, alertAt }) {
  const hasDays = typeof days === "number";
  const tone = !hasDays
    ? "text-muted-foreground"
    : days < 0 || days <= alertAt
    ? "text-red-600"
    : days <= warnAt
    ? "text-amber-600"
    : "text-foreground";
  const text = !hasDays
    ? ""
    : days < 0
    ? `${Math.abs(days)} days overdue`
    : days === 0
    ? "Due today"
    : `${days} days`;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{date || "—"}</p>
      {text && <p className={cn("text-xs font-medium", tone)}>{text}</p>}
    </div>
  );
}

export default function PCSPCard({ client }) {
  const { can } = useRole();
  const canEdit = can("ispEdit");
  const [formOpen, setFormOpen] = useState(false);
  const [formPlan, setFormPlan] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["pcsp-plans", client.id],
    queryFn: () => base44.entities.ISPlan.filter({ client_id: client.id }),
    enabled: !!client.id,
  });

  const { data: codes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });

  const activateMutation = useMutation({
    mutationFn: (plan) => activatePcsp(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pcsp-plans", client.id] });
      queryClient.invalidateQueries({ queryKey: ["isp-plans"] });
      toast({ title: "PCSP activated" });
    },
    onError: (e) =>
      toast({ title: "Could not activate PCSP", description: e?.message, variant: "destructive" }),
  });

  const sorted = [...plans].sort((a, b) => (Number(b.version) || 1) - (Number(a.version) || 1));
  const active = plans.find((p) => p.status === "Active");
  const newerDraft = sorted.find(
    (p) => p.status === "Draft" && (Number(p.version) || 1) > (Number(active?.version) || 0)
  );
  const current = newerDraft || active || sorted[0];
  const pendingRevision = !!(newerDraft && active && active.id !== newerDraft.id);

  const strategiesDue = current
    ? current.support_strategy_due_date || computeSupportStrategyDue(current.activation_date)
    : "";
  const renewalDue = current ? current.renewal_meeting_due || current.plan_year_end : "";

  const openForm = (plan) => {
    setFormPlan(plan);
    setFormOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <FileBadge className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">PCSP</CardTitle>
          {current && (
            <>
              <Badge
                variant="outline"
                className={cn("text-[10px]", PCSP_STATUS_STYLES[current.status] || "")}
              >
                {current.status}
              </Badge>
              <span className="text-[11px] text-muted-foreground">v{current.version || 1}</span>
              {current.rights_modifications_present && (
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-[10px] text-amber-800"
                >
                  Rights modifications
                </Badge>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {plans.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="mr-1 h-3.5 w-3.5" />
              Versions
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => openForm(null)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              New
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !current ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">No PCSP on file for this person.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Load the PCSP received from the support coordinator, then write Support Strategies within
              30 days of activation.
            </p>
          </div>
        ) : (
          <>
            {current.status === "Superseded" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Superseded {current.superseded_at ? `on ${current.superseded_at.slice(0, 10)}` : ""} by a
                newer PCSP. This version stays read-only.
              </div>
            )}
            {pendingRevision && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                Version {active.version || 1} stays active until version {current.version || 1} is
                activated.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <DueStat
                label="Plan year"
                date={
                  current.plan_year_start && current.plan_year_end
                    ? `${current.plan_year_start} – ${current.plan_year_end}`
                    : current.plan_year_end
                }
              />
              <DueStat
                label="Support Strategies due"
                date={strategiesDue}
                days={daysUntil(strategiesDue)}
                warnAt={7}
                alertAt={0}
              />
              <DueStat
                label="Renewal meeting due"
                date={renewalDue}
                days={daysUntil(renewalDue)}
                warnAt={60}
                alertAt={30}
              />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Support coordinator
                </p>
                <p className="text-sm">{current.support_coordinator_name || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {current.support_coordinator_agency || current.support_coordinator_phone || ""}
                </p>
                {current.activation_date && (
                  <p className="text-xs text-muted-foreground">Activated {current.activation_date}</p>
                )}
              </div>
            </div>

            <PCSPGoalList goals={current.pcsp_goals || []} codes={codes} />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <div className="flex flex-wrap items-center gap-3">
                {current.source_document && (
                  <PrivateFileLink fileUri={current.source_document} label="View PCSP PDF" />
                )}
                {current.received_date && (
                  <span className="text-xs text-muted-foreground">
                    Received {current.received_date}
                  </span>
                )}
                {!current.activation_date && (
                  <span className="text-xs font-medium text-amber-700">Awaiting activation</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && current.status === "Draft" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!current.activation_date || activateMutation.isPending}
                    onClick={() => activateMutation.mutate(current)}
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Activate
                  </Button>
                )}
                {canEdit && (
                  <Button size="sm" onClick={() => openForm(current)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    {current.status === "Active" ? "Revise" : "Edit"}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>

      <PCSPFormDialog
        client={client}
        plan={formPlan}
        nextVersion={nextVersionNumber(plans)}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
      <PCSPVersionDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        plans={sorted}
        codes={codes}
      />
    </Card>
  );
}