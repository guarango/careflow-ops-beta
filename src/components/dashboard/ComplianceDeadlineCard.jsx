import React from "react";
import { Clock, FileWarning, CalendarClock, Users, FileBarChart, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  "clock-exclamation": Clock,
  "file-alert": FileWarning,
  "calendar-due": CalendarClock,
  "users-group": Users,
  "file-chart": FileBarChart,
  "shield-alert": ShieldAlert,
};

const TONE = {
  red: { text: "text-red-600", tile: "bg-red-100 text-red-600", ring: "hover:border-red-300" },
  amber: { text: "text-amber-600", tile: "bg-amber-100 text-amber-700", ring: "hover:border-amber-300" },
  green: { text: "text-emerald-600", tile: "bg-emerald-100 text-emerald-700", ring: "hover:border-emerald-300" },
};

const COUNT_TONE = { red: "text-red-600", amber: "text-amber-700", green: "text-emerald-700" };

export default function ComplianceDeadlineCard({ card, onOpen }) {
  const tone = TONE[card.tone] || TONE.green;
  const Icon = ICONS[card.icon] || Clock;

  return (
    <button
      type="button"
      onClick={() => onOpen(card)}
      className={cn(
        "text-left rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/30",
        tone.ring
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", tone.tile)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{card.title}</h3>
            <span
              className="text-[10px] text-muted-foreground underline decoration-dotted cursor-help line-clamp-1"
              title={card.citation}
            >
              {card.citation}
            </span>
          </div>
        </div>
        <span className={cn("text-2xl font-bold tabular-nums shrink-0", tone.text)}>{card.total}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {card.submetrics.map((sm) => (
          <div key={sm.key} className="rounded-md border border-border/60 bg-muted/40 px-2 py-1 min-w-[92px]">
            <div className={cn("text-sm font-semibold tabular-nums leading-tight", COUNT_TONE[sm.tone] || "text-foreground")}>
              {sm.count}
            </div>
            <div className="text-[9px] leading-tight text-muted-foreground">{sm.label}</div>
          </div>
        ))}
      </div>
    </button>
  );
}