import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, RefreshCw, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import IntegrationStatusBadge from "./IntegrationStatusBadge";
import IntegrationConfigPanel from "./IntegrationConfigPanel";
import { INTEGRATION_CATEGORIES } from "@/lib/integrationRegistry";
import { format } from "date-fns";

const TIER_LABELS = {
  all: null,
  professional_enterprise: { label: "Pro+", class: "bg-blue-100 text-blue-700" },
  enterprise_only: { label: "Enterprise", class: "bg-purple-100 text-purple-700" },
};

const DIR_ICONS = {
  inbound: ArrowDown,
  outbound: ArrowUp,
  bidirectional: ArrowUpDown,
};

export default function IntegrationCard({ meta, record, agencyId, onSync }) {
  const [configOpen, setConfigOpen] = useState(false);
  const catCfg = INTEGRATION_CATEGORIES[meta.category] || INTEGRATION_CATEGORIES.other;
  const tierCfg = TIER_LABELS[meta.tier || "all"];

  const dirLabel = meta.directions.length === 2 &&
    meta.directions.includes("inbound") && meta.directions.includes("outbound")
    ? "Bidirectional" : meta.directions.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ");
  const DirIcon = meta.directions.length === 2 ? DIR_ICONS.bidirectional
    : meta.directions[0] === "inbound" ? DIR_ICONS.inbound : DIR_ICONS.outbound;

  return (
    <>
      <Card className="border border-border hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground text-sm">{meta.name}</h3>
                {tierCfg && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tierCfg.class}`}>{tierCfg.label}</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{meta.description}</p>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catCfg.color}`}>{catCfg.label}</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <DirIcon className="w-3 h-3" /> {dirLabel}
                </span>
                {meta.requiresBaa && (
                  <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">BAA Required</span>
                )}
              </div>

              {record?.is_active && (
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {record.last_sync_at && (
                    <span>Last sync: {format(new Date(record.last_sync_at), "MMM d, h:mm a")}</span>
                  )}
                  {record.records_synced_24h > 0 && (
                    <span>{record.records_synced_24h.toLocaleString()} records (24h)</span>
                  )}
                  {record.error_count_24h > 0 && (
                    <span className="text-destructive">{record.error_count_24h} errors</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <IntegrationStatusBadge status={record?.status || "disconnected"} />
              <div className="flex gap-1">
                {record?.is_active && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Sync now" onClick={() => onSync?.(record)}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Configure" onClick={() => setConfigOpen(true)}>
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure {meta.name}</DialogTitle>
          </DialogHeader>
          <IntegrationConfigPanel
            integrationRecord={record}
            agencyId={agencyId}
            onClose={() => setConfigOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}