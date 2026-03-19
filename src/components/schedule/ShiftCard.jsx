import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Clock, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";

const statusColors = {
  Scheduled: "bg-primary/10 border-primary/30 text-primary",
  "In Progress": "bg-chart-4/10 border-chart-4/30 text-chart-4",
  Completed: "bg-accent/10 border-accent/30 text-accent",
  Cancelled: "bg-muted border-border text-muted-foreground",
  "No Show": "bg-destructive/10 border-destructive/30 text-destructive",
};

const statusIcons = {
  Completed: CheckCircle,
  Cancelled: XCircle,
  "No Show": UserX,
  "In Progress": Clock,
};

export default function ShiftCard({ shift, onStatusChange }) {
  const colorClass = statusColors[shift.status] || statusColors.Scheduled;
  const Icon = statusIcons[shift.status];

  return (
    <div className={cn("rounded-lg border px-2.5 py-2 text-xs transition-all", colorClass)}>
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{shift.client_name}</p>
          <p className="opacity-80 truncate">{shift.staff_name}</p>
          <p className="opacity-70">{shift.start_time} – {shift.end_time || "?"}</p>
          {shift.service_code && <p className="opacity-60 font-mono">{shift.service_code}</p>}
        </div>
        {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
      </div>
      {shift.status === "Scheduled" && onStatusChange && (
        <div className="flex gap-1 mt-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] px-1.5 text-accent hover:text-accent hover:bg-accent/10"
            onClick={() => onStatusChange(shift, "Completed")}
          >
            Complete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] px-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onStatusChange(shift, "Cancelled")}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}