import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, RefreshCw, MapPin, FileText, ExternalLink, Shield } from "lucide-react";
import IntegrationStatusBadge from "./IntegrationStatusBadge";
import IntegrationConfigPanel from "./IntegrationConfigPanel";
import { INTEGRATION_CATEGORIES } from "@/lib/integrationRegistry";
import { format } from "date-fns";

export default function IntegrationCard({ meta, record, agencyId, onSync }) {
  const [configOpen, setConfigOpen] = useState(false);
  const catCfg = INTEGRATION_CATEGORIES[meta.category] || INTEGRATION_CATEGORIES.custom;

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
                {meta.state && meta.state !== "CUSTOM" && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    <MapPin className="w-3 h-3" /> {meta.state_name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{meta.description}</p>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catCfg.color}`}>{catCfg.label}</span>
                {meta.submission_methods?.map(m => (
                  <span key={m.method} className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    {m.label}
                  </span>
                ))}
                {meta.requiresBaa && (
                  <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Shield className="w-3 h-3" /> BAA Required
                  </span>
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
                  {record.test_mode && (
                    <span className="text-amber-600 font-semibold">Test Mode</span>
                  )}
                </div>
              )}

              {/* Documentation links */}
              {meta.documentation_url && (
                <a href={meta.documentation_url} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-2">
                  <ExternalLink className="w-3 h-3" /> State EVV Documentation
                </a>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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