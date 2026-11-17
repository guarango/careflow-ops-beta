import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { format } from "date-fns";

/** Prior drafts and manual edits kept when the summary is regenerated. */
export default function SummaryVersionHistory({ current, history = [] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          Version history
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Version {current || 1} is current. Earlier drafts and manual edits are kept, never overwritten.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="border rounded-md p-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Version {current || 1}</span>
            <Badge variant="secondary" className="text-[11px]">current</Badge>
          </div>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">No earlier versions yet.</p>
        ) : (
          history.map((h, i) => (
            <div key={i} className="border rounded-md p-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Version {h.version || i + 1}</span>
                <Badge variant="outline" className="text-[11px]">
                  {h.source === "ai_draft" ? "AI draft" : h.source === "manual_edit" ? "Manual edits" : "Prior draft"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {h.saved_at ? format(new Date(h.saved_at), "MMM d, yyyy h:mm a") : ""}
                {h.saved_by ? ` · ${h.saved_by}` : ""}
              </p>
              {h.how_month_went && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{h.how_month_went}</p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}