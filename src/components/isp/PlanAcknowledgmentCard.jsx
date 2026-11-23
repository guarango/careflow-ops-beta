import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useMyStaffRecord } from "@/hooks/useMyStaffRecord";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, BookOpen, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import {
  acknowledgmentFor,
  needsAcknowledgment,
  planVersionLabel,
  recordAcknowledgment,
} from "@/lib/planAcknowledgment";

export default function PlanAcknowledgmentCard({ plan, clientName }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: staff } = useMyStaffRecord();

  const { data: acks = [] } = useQuery({
    queryKey: ["plan-acks", plan?.id],
    queryFn: () => base44.entities.PlanAcknowledgment.filter({ plan_id: plan.id }),
    enabled: !!plan?.id,
  });

  const mine = acknowledgmentFor(acks, plan, staff?.id);
  const pending = needsAcknowledgment(acks, plan, staff?.id);

  const acknowledge = useMutation({
    mutationFn: () =>
      recordAcknowledgment(base44, {
        plan,
        clientId: plan.client_id,
        clientName: clientName || plan.client_name,
        staff,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan-acks", plan.id] }),
  });

  if (!plan) return null;

  return (
    <div className="bg-white border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2">
          <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Plan acknowledgment</p>
            <p className="text-sm font-medium mt-0.5">{planVersionLabel(plan)}</p>
            <p className="text-[11px] text-muted-foreground">
              Staff record that they read this exact version before charting for {clientName || plan.client_name}.
            </p>
          </div>
        </div>
        {mine ? (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
            <CheckCircle2 className="w-3 h-3" />Acknowledged
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 gap-1">
            <AlertTriangle className="w-3 h-3" />Not acknowledged
          </Badge>
        )}
      </div>

      {mine ? (
        <p className="text-xs text-muted-foreground">
          {mine.staff_name || user?.full_name || "You"} read this version on{" "}
          {mine.acknowledged_at ? format(new Date(mine.acknowledged_at), "MMM d, yyyy 'at' h:mm a") : "recorded date"}.
        </p>
      ) : staff ? (
        <Button size="sm" onClick={() => acknowledge.mutate()} disabled={acknowledge.isPending} className="gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          {acknowledge.isPending ? "Recording…" : "I have read this plan"}
        </Button>
      ) : (
        <p className="text-xs text-amber-700">
          Your login is not linked to a staff record yet, so an acknowledgment cannot be recorded.
        </p>
      )}

      {acks.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
            Acknowledged by ({acks.length})
          </p>
          <div className="space-y-1">
            {acks
              .slice()
              .sort((a, b) => String(b.acknowledged_at || "").localeCompare(String(a.acknowledged_at || "")))
              .slice(0, 8)
              .map((a) => (
                <p key={a.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{a.staff_name || a.staff_email || "Staff"}</span>
                  {" · "}
                  {a.acknowledged_at ? format(new Date(a.acknowledged_at), "MMM d, yyyy h:mm a") : "—"}
                </p>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}