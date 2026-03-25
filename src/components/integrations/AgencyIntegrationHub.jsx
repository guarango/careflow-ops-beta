import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Activity, Loader2 } from "lucide-react";
import { INTEGRATIONS, INTEGRATION_CATEGORIES } from "@/lib/integrationRegistry";
import IntegrationCard from "./IntegrationCard";
import IntegrationAuditLog from "./IntegrationAuditLog";
import { useToast } from "@/components/ui/use-toast";

const CATEGORY_TABS = [
  { key: "all", label: "All" },
  ...Object.entries(INTEGRATION_CATEGORIES).map(([key, val]) => ({ key, label: val.label })),
];

export default function AgencyIntegrationHub({ agencyId }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["integrations", agencyId],
    queryFn: () => base44.entities.Integration.filter({ agency_id: agencyId }),
    enabled: !!agencyId,
  });

  const syncMutation = useMutation({
    mutationFn: async (record) => {
      await base44.entities.IntegrationLog.create({
        agency_id: agencyId,
        integration_key: record.integration_key,
        integration_name: record.integration_name,
        direction: "bidirectional",
        record_type: "manual_sync",
        record_count: 0,
        status: "success",
        triggered_by: "manual",
        payload_summary: "Manual sync triggered from Integration Hub",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration_logs", agencyId] });
      toast({ title: "Sync triggered", description: "Manual sync initiated successfully." });
    },
  });

  // Build a map of integration records by key
  const recordMap = Object.fromEntries(records.map(r => [r.integration_key, r]));

  const filtered = INTEGRATIONS.filter(meta => {
    if (activeTab !== "all" && meta.category !== activeTab) return false;
    if (search && !meta.name.toLowerCase().includes(search.toLowerCase()) &&
        !meta.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const connectedCount = records.filter(r => r.is_active).length;
  const errorCount = records.filter(r => r.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Available", value: INTEGRATIONS.length, color: "text-primary" },
          { label: "Connected", value: connectedCount, color: "text-accent" },
          { label: "Errors", value: errorCount, color: errorCount > 0 ? "text-destructive" : "text-muted-foreground" },
          { label: "Records Synced (24h)", value: records.reduce((s, r) => s + (r.records_synced_24h || 0), 0).toLocaleString(), color: "text-foreground" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search integrations…" className="pl-9 text-sm" />
          </div>
        </div>

        <TabsList className="flex-wrap h-auto gap-1 mb-6">
          {CATEGORY_TABS.map(tab => (
            <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
              {tab.label}
              {tab.key !== "all" && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {INTEGRATIONS.filter(i => i.category === tab.key).length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No integrations match your search.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map(meta => (
                <IntegrationCard
                  key={meta.key}
                  meta={meta}
                  record={recordMap[meta.key]}
                  agencyId={agencyId}
                  onSync={syncMutation.mutate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Audit log */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Integration Audit Log</h3>
        </div>
        <IntegrationAuditLog agencyId={agencyId} limit={50} />
      </div>
    </div>
  );
}