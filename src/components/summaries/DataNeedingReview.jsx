import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  Flagged: "bg-amber-100 text-amber-800 border-amber-200",
  Excluded: "bg-slate-200 text-slate-600 border-slate-300",
  "Awaiting note approval": "bg-blue-100 text-blue-700 border-blue-200",
  "No session note linked": "bg-rose-100 text-rose-700 border-rose-200",
};

/** Flagged or excluded goal entries — shown for review, never reported as progress. */
export default function DataNeedingReview({ items = [] }) {
  if (!items.length) return null;
  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Data needing review ({items.length})
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Flagged or excluded entries are not evidence of progress and are never counted in the summary.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="border rounded-md p-2.5 text-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-medium text-xs">{item.goal_title}</span>
              <Badge variant="outline" className={cn("text-[11px]", STATUS_STYLES[item.status] || "")}>
                {item.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {item.date ? `${item.date} · ` : ""}
              {item.recorded ? `recorded ${item.recorded} · ` : ""}
              {item.reason}
              {item.staff_name ? ` · ${item.staff_name}` : ""}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}