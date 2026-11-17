import React from "react";
import { ShieldAlert, CalendarClock, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATUS_STYLES, reviewDaysLeft, isApproved, hasConsent } from "@/lib/rightsModifications";

function Tick({ ok, label }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium", ok ? "text-emerald-700" : "text-muted-foreground")}>
      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </span>
  );
}

export default function RightsModificationCard({ modification, onOpen, onReview, onEnd }) {
  const m = modification;
  const days = reviewDaysLeft(m);
  const live = m.status === "Active" || m.status === "Under review";

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate">{m.right_affected}{m.right_other_detail ? ` · ${m.right_other_detail}` : ""}</p>
            <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[m.status])}>{m.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {m.pcsp_label ? `${m.pcsp_label} · ` : ""}Review every {m.review_interval_days} days
            {m.next_review_date ? ` · next ${m.next_review_date}` : ""}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <Tick ok={isApproved(m)} label="Approval" />
            <Tick ok={hasConsent(m)} label="Consent" />
            {days !== null && live && (
              <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium", days < 0 ? "text-destructive" : days <= 14 ? "text-amber-700" : "text-muted-foreground")}>
                <CalendarClock className="w-3 h-3" />
                {days < 0 ? `Review ${Math.abs(days)}d overdue` : `Review in ${days}d`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 mt-2">
        {live && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReview(m)}>Review</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => onEnd(m)}>End</Button>
          </>
        )}
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onOpen(m)}>Open</Button>
      </div>
    </div>
  );
}