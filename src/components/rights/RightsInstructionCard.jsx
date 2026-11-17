import React from "react";
import { ShieldAlert, ClipboardList, CalendarClock } from "lucide-react";
import { reviewDaysLeft } from "@/lib/rightsModifications";

/** What a DSP sees: the restriction, how to carry it out, and when it is reviewed. */
export default function RightsInstructionCard({ modification }) {
  const m = modification;
  if (!m) return null;
  const days = reviewDaysLeft(m);

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-amber-900">Rights modification active</h3>
          <p className="text-xs text-amber-800 mt-0.5">{m.right_affected}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-amber-800/80">How to carry it out</p>
          <p className="text-sm text-amber-950 mt-0.5 whitespace-pre-wrap">
            {m.dsp_instruction || m.condition_description}
          </p>
        </div>

        {(m.data_method || m.data_frequency) && (
          <div className="flex items-start gap-2">
            <ClipboardList className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900">
              Record data: {[m.data_method, m.data_frequency].filter(Boolean).join(" · ")}
            </p>
          </div>
        )}

        {m.next_review_date && (
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-amber-700 shrink-0" />
            <p className="text-xs text-amber-900">
              Reviewed {m.next_review_date}{days !== null && days < 0 ? " · review overdue" : ""}
            </p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-amber-800/80 mt-3">
        Follow this exactly. Only your supervisor can change it.
      </p>
    </div>
  );
}