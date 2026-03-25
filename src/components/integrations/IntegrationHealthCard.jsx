import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function IntegrationHealthCard({ record, meta }) {
  const statusColor = {
    connected: "border-l-green-500",
    error: "border-l-destructive",
    pending: "border-l-amber-400",
    disconnected: "border-l-border",
  }[record.status] || "border-l-border";

  const successRate = record.total_records_synced > 0
    ? Math.round(((record.total_records_synced - (record.error_count_24h || 0)) / record.total_records_synced) * 100)
    : 100;

  return (
    <Card className={cn("border-l-4", statusColor)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">{meta?.icon || "🔌"}</span>
            <div>
              <p className="text-sm font-bold text-foreground">{record.integration_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{record.category}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {record.status === "connected" && <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />}
            {record.status === "error" && <XCircle className="w-4 h-4 text-destructive ml-auto" />}
            {record.status === "pending" && <Clock className="w-4 h-4 text-amber-500 ml-auto" />}
            {record.status === "disconnected" && <AlertCircle className="w-4 h-4 text-muted-foreground ml-auto" />}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <p className="text-[10px] text-muted-foreground font-medium">Records (24h)</p>
            <p className="text-lg font-bold text-foreground">{(record.records_synced_24h || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium">Errors (24h)</p>
            <p className={cn("text-lg font-bold", record.error_count_24h > 0 ? "text-destructive" : "text-foreground")}>
              {record.error_count_24h || 0}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-medium">Success Rate</p>
            <p className={cn("text-lg font-bold", successRate >= 99 ? "text-green-600" : successRate >= 95 ? "text-amber-600" : "text-destructive")}>
              {successRate}%
            </p>
          </div>
        </div>

        {record.last_sync_at && (
          <p className="text-[10px] text-muted-foreground mt-2">
            Last sync: {format(new Date(record.last_sync_at), "MMM d, h:mm a")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}