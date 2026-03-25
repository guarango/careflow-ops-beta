import React, { useState } from "react";
import { MapPin, Clock, CheckCircle2, Play, Square, FileText, Target, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOffline } from "@/hooks/useOffline";

const STATUS_CONFIG = {
  upcoming: { label: "Upcoming", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-400", text: "text-blue-700" },
  in_progress: { label: "In Progress", bg: "bg-green-50 border-green-200", dot: "bg-green-500", text: "text-green-700" },
  completed: { label: "Completed", bg: "bg-slate-50 border-slate-200", dot: "bg-slate-400", text: "text-slate-600" },
  missed: { label: "Missed", bg: "bg-red-50 border-red-200", dot: "bg-red-400", text: "text-red-700" },
};

export default function MobileVisitCard({ visit, onStartNote, onGoalData }) {
  const [status, setStatus] = useState(visit.status);
  const [expanded, setExpanded] = useState(false);
  const [clockedInAt, setClockedInAt] = useState(null);
  const { enqueueAction, isOnline } = useOffline();

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;

  function handleClockIn() {
    const ts = new Date().toISOString();
    setClockedInAt(ts);
    setStatus("in_progress");
    const payload = {
      type: "create",
      entity: "EVVLog",
      data: {
        client_id: visit.client_id || "demo",
        client_name: visit.client,
        shift_id: visit.id,
        clock_in_time: ts,
        clock_in_lat: null,
        clock_in_lng: null,
        status: "In Progress",
      },
    };
    enqueueAction(payload);
  }

  function handleClockOut() {
    setStatus("completed");
    const ts = new Date().toISOString();
    enqueueAction({
      type: "update",
      entity: "EVVLog",
      recordId: "pending",
      data: { clock_out_time: ts, status: "Completed" },
    });
    onStartNote?.();
  }

  return (
    <div className={cn("rounded-2xl border-2 overflow-hidden transition-all", cfg.bg)}>
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0", visit.color || "bg-primary")}>
          {visit.initials}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="font-semibold text-foreground text-sm">{visit.client}</p>
          <p className="text-xs text-muted-foreground">{visit.service} · {visit.start}–{visit.end}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dot)} />
            <span className={cn("text-xs font-semibold", cfg.text)}>{cfg.label}</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-black/5 pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{visit.address}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{visit.start} – {visit.end} · Service code {visit.serviceCode}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {status === "upcoming" && (
              <button
                onClick={handleClockIn}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-3 text-sm font-semibold active:scale-95 transition-transform"
              >
                <Play className="w-4 h-4" />
                Clock In
              </button>
            )}
            {status === "in_progress" && (
              <>
                <button
                  onClick={handleClockOut}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white rounded-xl py-3 text-sm font-semibold active:scale-95 transition-transform"
                >
                  <Square className="w-4 h-4" />
                  Clock Out
                </button>
                <button
                  onClick={onGoalData}
                  className="flex items-center justify-center gap-2 bg-purple-600 text-white rounded-xl py-3 px-4 text-sm font-semibold active:scale-95 transition-transform"
                >
                  <Target className="w-4 h-4" />
                </button>
              </>
            )}
            {status === "completed" && (
              <button
                onClick={onStartNote}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold active:scale-95 transition-transform"
              >
                <FileText className="w-4 h-4" />
                Complete Note
              </button>
            )}
          </div>
          {!isOnline && (
            <p className="text-[10px] text-amber-600 text-center">Offline — action will sync when connected</p>
          )}
        </div>
      )}
    </div>
  );
}