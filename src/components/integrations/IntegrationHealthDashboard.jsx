import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, CheckCircle2, Activity, Loader2 } from "lucide-react";
import { getIntegration } from "@/lib/integrationRegistry";
import IntegrationHealthCard from "./IntegrationHealthCard";
import IntegrationAuditLog from "./IntegrationAuditLog";
import { useToast } from "@/components/ui/use-toast";

export default function IntegrationHealthDashboard({ agencyId }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["integrations", agencyId],
    queryFn: () => base44.entities.Integration.filter({ agency_id: agencyId, is_active: true }),
    enabled: !!agencyId,
    refetchInterval: 30000,
  });

  const syncMutation = useMutation({
    mutationFn: async (record) => {
      await base44.entities.IntegrationLog.create({
        agency_id: agencyId,
        integration_key: record.integration_key,
        integration_name: record.integration_name,
        direction: "bidirectional",
        record_type: "manual_resync",
        record_count: 0,
        status: "success",
        triggered_by: "manual",
        payload_summary: "Manual re-sync triggered from health dashboard",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["integration_logs", agencyId] });
      toast({ title: "Sync triggered" });
    },
  });

  if (isLoading) return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const errorCount = records.filter(r => r.status === "error").length;
  const totalSynced24h = records.reduce((s, r) => s + (r.records_synced_24h || 0), 0);
  const totalErrors24h = records.reduce((s, r) => s + (r.error_count_24h || 0), 0);

  return (
    <div className="space-y-6">
      {/* Alert strip */}
      {errorCount > 0 && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive font-medium">
            {errorCount} integration{errorCount > 1 ? "s are" : " is"} reporting errors. Review the cards below and trigger a re-sync or update credentials.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Integrations", value: records.length, color: "text-primary" },
          { label: "Errors", value: errorCount, color: errorCount > 0 ? "text-destructive" : "text-muted-foreground" },
          { label: "Records (24h)", value: totalSynced24h.toLocaleString(), color: "text-foreground" },
          { label: "Error Events (24h)", value: totalErrors24h, color: totalErrors24h > 0 ? "text-destructive" : "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Health cards */}
      {records.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          No active integrations. Configure integrations in the Integration Hub tab.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map(record => (
            <div key={record.id} className="relative">
              <IntegrationHealthCard record={record} meta={getIntegration(record.integration_key)} />
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() => syncMutation.mutate(record)}
                title="Re-sync"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Recent log */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Recent Sync Events</h3>
        </div>
        <IntegrationAuditLog agencyId={agencyId} limit={25} />
      </div>
    </div>
  );
}