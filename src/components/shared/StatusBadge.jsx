import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  Active: "bg-accent/15 text-accent border-accent/20",
  Inactive: "bg-muted text-muted-foreground border-border",
  "On Leave": "bg-chart-4/15 text-chart-4 border-chart-4/20",
  Discharged: "bg-muted text-muted-foreground border-border",
  Current: "bg-accent/15 text-accent border-accent/20",
  "Expiring Soon": "bg-chart-4/15 text-chart-4 border-chart-4/20",
  Expired: "bg-destructive/15 text-destructive border-destructive/20",
  "Pending Review": "bg-chart-3/15 text-chart-3 border-chart-3/20",
  Open: "bg-chart-4/15 text-chart-4 border-chart-4/20",
  "Under Review": "bg-primary/15 text-primary border-primary/20",
  Resolved: "bg-accent/15 text-accent border-accent/20",
  Closed: "bg-muted text-muted-foreground border-border",
  Draft: "bg-muted text-muted-foreground border-border",
  Submitted: "bg-primary/15 text-primary border-primary/20",
  Approved: "bg-accent/15 text-accent border-accent/20",
  "Needs Revision": "bg-chart-4/15 text-chart-4 border-chart-4/20",
  Pending: "bg-chart-4/15 text-chart-4 border-chart-4/20",
  Rejected: "bg-destructive/15 text-destructive border-destructive/20",
  Paid: "bg-accent/15 text-accent border-accent/20",
  Denied: "bg-destructive/15 text-destructive border-destructive/20",
  Appealed: "bg-chart-3/15 text-chart-3 border-chart-3/20",
  Administered: "bg-accent/15 text-accent border-accent/20",
  Refused: "bg-chart-4/15 text-chart-4 border-chart-4/20",
  Held: "bg-muted text-muted-foreground border-border",
  "Not Available": "bg-muted text-muted-foreground border-border",
  Missed: "bg-destructive/15 text-destructive border-destructive/20",
  Locked: "bg-slate-500/15 text-slate-600 border-slate-400/30",
  Low: "bg-accent/15 text-accent border-accent/20",
  Medium: "bg-chart-4/15 text-chart-4 border-chart-4/20",
  High: "bg-destructive/15 text-destructive border-destructive/20",
  Critical: "bg-destructive/20 text-destructive border-destructive/30 font-semibold",
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("text-[11px] border", style)}>
      {status}
    </Badge>
  );
}