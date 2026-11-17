import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** One numbered card of the guided quarterly editor, with a green check when complete. */
export default function QuarterlySectionCard({ number, title, detail, complete, action, children }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5",
              complete ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            )}
          >
            {complete ? <CheckCircle2 className="w-4 h-4" /> : number}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Element {number}</p>
            <CardTitle className="text-base leading-tight">{title}</CardTitle>
            {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}