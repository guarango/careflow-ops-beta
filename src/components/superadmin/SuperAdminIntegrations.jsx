import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart3, Globe, TrendingUp, CheckCircle2, XCircle, AlertCircle,
  Plug, Store, Activity, Users, Loader2, Edit, Search
} from "lucide-react";
import { INTEGRATIONS, INTEGRATION_CATEGORIES } from "@/lib/integrationRegistry";
import { useToast } from "@/components/ui/use-toast";
import IntegrationAuditLog from "@/components/integrations/IntegrationAuditLog";
import { useQuery as useRQ } from "@tanstack/react-query";

const TIER_OPTIONS = [
  { value: "all", label: "All Tiers" },
  { value: "professional_enterprise", label: "Pro + Enterprise" },
  { value: "enterprise_only", label: "Enterprise Only" },
];

function MarketplaceEditor({ meta, existing, onSave, onClose }) {
  const [tier, setTier] = useState(existing?.tier_access || meta.tier || "all");
  const [published, setPublished] = useState(existing?.is_published ?? true);
  const [beta, setBeta] = useState(existing?.is_beta ?? false);
  const [sortOrder, setSortOrder] = useState(existing?.sort_order ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{meta.icon}</span>
        <div>
          <p className="font-bold text-foreground">{meta.name}</p>
          <p className="text-xs text-muted-foreground">{meta.vendor}</p>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Tier Access</label>
        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Published</p>
          <p className="text-xs text-muted-foreground">Visible to agency admins in the marketplace</p>
        </div>
        <Switch checked={published} onCheckedChange={setPublished} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Beta</p>
          <p className="text-xs text-muted-foreground">Shows a beta badge on the marketplace card</p>
        </div>
        <Switch checked={beta} onCheckedChange={setBeta} />
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Sort Order</label>
        <Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className="text-sm w-24" />
      </div>

      <Button onClick={() => onSave({ tier_access: tier, is_published: published, is_beta: beta, sort_order: sortOrder })} className="w-full">
        Save
      </Button>
    </div>
  );
}

export default function SuperAdminIntegrations({ agencies = [] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("marketplace");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState(null);

  const { data: marketplaceItems = [] } = useQuery({
    queryKey: ["marketplace_items"],
    queryFn: () => base44.entities.IntegrationMarketplaceItem.list("-sort_order", 200),
  });

  const { data: allIntegrationRecords = [] } = useQuery({
    queryKey: ["all_integrations"],
    queryFn: () => base44.entities.Integration.list("-created_date", 500),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const existing = marketplaceItems.find(m => m.integration_key === data.integration_key);
      return existing
        ? base44.entities.IntegrationMarketplaceItem.update(existing.id, data)
        : base44.entities.IntegrationMarketplaceItem.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace_items"] });
      setEditTarget(null);
      toast({ title: "Saved" });
    },
  });

  const marketplaceMap = Object.fromEntries(marketplaceItems.map(m => [m.integration_key, m]));

  // Platform-wide health stats
  const totalActive = allIntegrationRecords.filter(r => r.is_active).length;
  const totalErrors = allIntegrationRecords.filter(r => r.status === "error").length;
  const totalRecords24h = allIntegrationRecords.reduce((s, r) => s + (r.records_synced_24h || 0), 0);

  // Per-integration adoption
  const adoptionByKey = allIntegrationRecords.reduce((acc, r) => {
    if (r.is_active) acc[r.integration_key] = (acc[r.integration_key] || 0) + 1;
    return acc;
  }, {});

  const filteredIntegrations = INTEGRATIONS.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Platform KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Published Integrations", value: INTEGRATIONS.length, color: "text-primary" },
          { label: "Active Connections (all tenants)", value: totalActive, color: "text-accent" },
          { label: "Error Connections", value: totalErrors, color: totalErrors > 0 ? "text-destructive" : "text-muted-foreground" },
          { label: "Records Synced (24h)", value: totalRecords24h.toLocaleString(), color: "text-foreground" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="marketplace" className="gap-2"><Store className="w-4 h-4" /> Marketplace</TabsTrigger>
          <TabsTrigger value="adoption" className="gap-2"><TrendingUp className="w-4 h-4" /> Adoption</TabsTrigger>
          <TabsTrigger value="health" className="gap-2"><Activity className="w-4 h-4" /> Platform Health</TabsTrigger>
        </TabsList>

        {/* Marketplace management */}
        <TabsContent value="marketplace" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search integrations…" className="pl-9 text-sm" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Integration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Tier</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Published</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Beta</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Adoption</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredIntegrations.map(meta => {
                  const item = marketplaceMap[meta.key];
                  const isPublished = item?.is_published ?? true;
                  const isBeta = item?.is_beta ?? false;
                  const tierAccess = item?.tier_access || meta.tier || "all";
                  const adoption = adoptionByKey[meta.key] || 0;
                  return (
                    <tr key={meta.key} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{meta.icon}</span>
                          <div>
                            <p className="font-semibold text-foreground text-xs">{meta.name}</p>
                            <p className="text-[10px] text-muted-foreground">{meta.vendor}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${INTEGRATION_CATEGORIES[meta.category]?.color}`}>
                          {INTEGRATION_CATEGORIES[meta.category]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                        {tierAccess === "all" ? "All tiers" : tierAccess === "professional_enterprise" ? "Pro+" : "Enterprise"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isPublished
                          ? <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                          : <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isBeta && <Badge variant="secondary" className="text-[10px] mx-auto">Beta</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-foreground">{adoption}</span>
                        <span className="text-xs text-muted-foreground"> / {agencies.length}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" className="gap-1 text-xs h-7"
                          onClick={() => setEditTarget(meta)}>
                          <Edit className="w-3 h-3" /> Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Adoption */}
        <TabsContent value="adoption" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INTEGRATIONS
              .map(meta => ({ meta, count: adoptionByKey[meta.key] || 0 }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 20)
              .map(({ meta, count }) => (
                <div key={meta.key} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                  <span className="text-xl">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{meta.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: agencies.length > 0 ? `${(count / agencies.length) * 100}%` : "0%" }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {count} / {agencies.length} agencies
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>

        {/* Health */}
        <TabsContent value="health" className="space-y-4 mt-4">
          <div className="space-y-3">
            {allIntegrationRecords.filter(r => r.status === "error").length === 0 ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700 font-medium">All active integrations across all tenants are healthy.</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive font-medium">
                  {allIntegrationRecords.filter(r => r.status === "error").length} integration connections are reporting errors across tenants.
                </p>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Agency</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Integration</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Records (24h)</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Errors (24h)</th>
                  </tr>
                </thead>
                <tbody>
                  {allIntegrationRecords.filter(r => r.is_active).map(record => {
                    const agency = agencies.find(a => a.id === record.agency_id);
                    return (
                      <tr key={record.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{agency?.name || record.agency_id}</td>
                        <td className="px-4 py-3 text-xs font-medium text-foreground">{record.integration_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            record.status === "connected" ? "bg-green-100 text-green-700"
                            : record.status === "error" ? "bg-destructive/10 text-destructive"
                            : "bg-secondary text-muted-foreground"
                          }`}>{record.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono">{record.records_synced_24h || 0}</td>
                        <td className={`px-4 py-3 text-right text-xs font-mono ${record.error_count_24h > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                          {record.error_count_24h || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Marketplace Listing</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <MarketplaceEditor
              meta={editTarget}
              existing={marketplaceMap[editTarget.key]}
              onSave={data => saveMutation.mutate({ ...data, integration_key: editTarget.key, name: editTarget.name, category: editTarget.category, vendor: editTarget.vendor })}
              onClose={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}