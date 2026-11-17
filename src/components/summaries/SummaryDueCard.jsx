import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Sparkles, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays, parseISO } from "date-fns";

const STATUS_STYLES = {
  Draft: "bg-gray-100 text-gray-700",
  "Pending Review": "bg-amber-100 text-amber-700",
  Signed: "bg-green-100 text-green-700",
  Returned: "bg-red-100 text-red-700",
};

function dueChip(days) {
  if (days === null) return { text: "No due date", tone: "text-muted-foreground bg-muted" };
  if (days < 0) return { text: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`, tone: "text-red-700 bg-red-50 border border-red-200" };
  if (days === 0) return { text: "Due today", tone: "text-amber-800 bg-amber-50 border border-amber-200" };
  return { text: `${days} day${days === 1 ? "" : "s"} left`, tone: days <= 3 ? "text-amber-800 bg-amber-50 border border-amber-200" : "text-emerald-700 bg-emerald-50 border border-emerald-200" };
}

export default function SummaryDueCard({ summary }) {
  const internal = summary.deliverable === false;
  const days = summary.due_date ? differenceInCalendarDays(parseISO(summary.due_date), new Date()) : null;
  const chip = dueChip(days);
  const codes = summary.service_codes?.length ? summary.service_codes : summary.service_code_ids || [];

  return (
    <Link
      to={`/summaries/monthly/${summary.id}`}
      className={cn(
        "block rounded-xl border bg-card p-3.5 hover:bg-accent/40 transition-colors border-l-4",
        internal ? "border-l-slate-300" : days !== null && days < 0 ? "border-l-red-400" : "border-l-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-sm truncate">{summary.client_name}</span>
            <Badge className={cn("text-[9px]", STATUS_STYLES[summary.status] || "bg-gray-100")}>{summary.status}</Badge>
            {summary.ai_generated && <Badge variant="outline" className="text-[9px] gap-0.5"><Sparkles className="w-2.5 h-2.5" />AI</Badge>}
            {summary.is_placeholder && <Badge variant="outline" className="text-[9px]">Statement task</Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {internal ? "Monthly progress note (internal)" : "Summary due to the support coordinator"}
            {summary.month_year ? ` · ${summary.month_year}` : ""}
          </p>
        </div>
        {!internal && (
          <span className={cn("shrink-0 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold", chip.tone)}>
            <CalendarClock className="w-3 h-3" />
            {chip.text}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-2">
        {codes.length === 0 && <span className="text-[10px] text-muted-foreground">No service codes recorded</span>}
        {codes.map((code) => (
          <span key={code} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-foreground">{code}</span>
        ))}
        {summary.period_start && summary.period_end && (
          <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
            <FileText className="w-3 h-3" />{summary.period_start} → {summary.period_end}
          </span>
        )}
      </div>

      {!internal && summary.due_date && (
        <p className="text-[10px] text-muted-foreground mt-1">Due {summary.due_date}</p>
      )}
    </Link>
  );
}