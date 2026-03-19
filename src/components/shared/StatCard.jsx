import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ label, value, icon: Icon, trend, trendLabel, className }) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-5 flex flex-col gap-3 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {trend !== undefined && (
          <span className={cn(
            "text-xs font-medium mb-1",
            trend >= 0 ? "text-accent" : "text-destructive"
          )}>
            {trend >= 0 ? "+" : ""}{trend}% {trendLabel || ""}
          </span>
        )}
      </div>
    </div>
  );
}