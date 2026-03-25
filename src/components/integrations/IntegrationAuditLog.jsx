import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  success: "text-green-600 bg-green-50",
  error: "text-destructive bg-destructive/10",
  partial: "text-amber-600 bg-amber-50",
};

const DIR_ICONS = { inbound: ArrowDown, outbound: ArrowUp, bidirectional: ArrowUpDown };

export default function IntegrationAuditLog({ agencyId, integrationKey, limit = 50 }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["integration_logs", agencyId, integrationKey],
    queryFn: () => {
      const filter = { agency_id: agencyId };
      if (integrationKey) filter.integration_key = integrationKey;
      return base44.entities.IntegrationLog.filter(filter, "-created_date", limit);
    },
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading audit log…</div>;
  if (!logs.length) return <div className="py-8 text-center text-muted-foreground text-sm">No sync events recorded yet.</div>;

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Timestamp</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Integration</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Direction</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Record Type</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Count</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Triggered By</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => {
            const DirIcon = DIR_ICONS[log.direction] || ArrowUpDown;
            return (
              <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {log.created_date ? format(new Date(log.created_date), "MMM d, h:mm:ss a") : "—"}
                </td>
                <td className="px-4 py-3 font-medium text-foreground text-xs">{log.integration_name}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-xs capitalize text-muted-foreground">
                    <DirIcon className="w-3 h-3" /> {log.direction}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-foreground">{log.record_type || "—"}</td>
                <td className="px-4 py-3 text-right text-xs font-mono">{log.record_count ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", STATUS_STYLES[log.status])}>
                    {log.status === "success" ? <CheckCircle2 className="w-3 h-3" />
                      : log.status === "error" ? <XCircle className="w-3 h-3" />
                      : <AlertCircle className="w-3 h-3" />}
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{log.triggered_by || "scheduler"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                  {log.error_message || log.payload_summary || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}