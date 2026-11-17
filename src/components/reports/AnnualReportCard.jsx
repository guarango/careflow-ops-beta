import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileBarChart, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { currentFiscalYearEndYear, daysUntil, fiscalYearBounds, loadAnnualReport } from "@/lib/annualReport";

const STATUS_STYLE = {
  "Not run": "bg-gray-100 text-gray-700",
  Run: "bg-blue-100 text-blue-700",
  Submitted: "bg-green-100 text-green-700",
};

export default function AnnualReportCard() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const fye = currentFiscalYearEndYear();
  const bounds = fiscalYearBounds(fye);
  const days = daysUntil(bounds.due);
  const status = report?.status || "Not run";

  useEffect(() => {
    let active = true;
    loadAnnualReport(fye)
      .then((data) => { if (active) setReport(data.report); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fye]);

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <FileBarChart className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-semibold text-sm">Annual DSPD report</h2>
          <Badge className={cn("text-[10px]", STATUS_STYLE[status])}>{loading ? "Loading" : status}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {bounds.label} · state Google Form due August 30, {fye}
        </p>
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold",
          days !== null && days < 0
            ? "text-red-700 bg-red-50 border border-red-200"
            : days !== null && days <= 45
              ? "text-amber-800 bg-amber-50 border border-amber-200"
              : "text-emerald-700 bg-emerald-50 border border-emerald-200"
        )}
      >
        <CalendarClock className="w-3.5 h-3.5" />
        {days === null ? "No due date" : days < 0 ? `Past due by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}` : days === 0 ? "Due today" : `${days} day${days === 1 ? "" : "s"} to Aug 30`}
      </span>
      <Button asChild size="sm" variant="outline">
        <Link to="/reports/annual">Open report</Link>
      </Button>
    </div>
  );
}