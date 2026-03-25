import React from "react";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  connected: { icon: CheckCircle2, label: "Connected", class: "text-green-600 bg-green-50 border-green-200" },
  disconnected: { icon: XCircle, label: "Disconnected", class: "text-muted-foreground bg-secondary border-border" },
  error: { icon: AlertCircle, label: "Error", class: "text-destructive bg-destructive/10 border-destructive/20" },
  pending: { icon: Clock, label: "Pending", class: "text-amber-600 bg-amber-50 border-amber-200" },
};

export default function IntegrationStatusBadge({ status = "disconnected", className }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", cfg.class, className)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}