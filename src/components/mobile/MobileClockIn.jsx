import React, { useState, useEffect } from "react";
import { Play, Square, MapPin, Clock, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useOffline } from "@/hooks/useOffline";

const VISITS = [
  { id: "v1", client: "Michael Anderson", service: "Personal Care", code: "T2031", date: "Today", start: "8:00 AM", end: "11:00 AM", evvStatus: "verified", noteStatus: "Draft" },
  { id: "v2", client: "Lisa Torres", service: "Day Program Support", code: "T2021", date: "Today", start: "2:00 PM", end: "4:00 PM", evvStatus: "pending", noteStatus: "Not Started" },
  { id: "v3", client: "Michael Anderson", service: "Personal Care", code: "T2031", date: "Mar 22", start: "8:00 AM", end: "11:00 AM", evvStatus: "verified", noteStatus: "Finalized" },
  { id: "v4", client: "Lisa Torres", service: "Day Program Support", code: "T2021", date: "Mar 20", start: "2:00 PM", end: "4:00 PM", evvStatus: "exception", noteStatus: "Overdue" },
];

const EVV_BADGES = {
  verified: { label: "EVV Verified", color: "bg-green-100 text-green-700" },
  pending: { label: "Not Started", color: "bg-slate-100 text-slate-600" },
  exception: { label: "EVV Exception", color: "bg-red-100 text-red-700" },
};

const NOTE_BADGES = {
  "Draft": "text-amber-600",
  "Not Started": "text-muted-foreground",
  "Finalized": "text-green-600",
  "Overdue": "text-red-600",
};

function ActiveVisitTimer({ clockedInAt }) {
  const [elapsed, setElapsed] = useState("0:00:00");
  useEffect(() => {
    const iv = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(clockedInAt)) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(iv);
  }, [clockedInAt]);
  return <span className="font-mono text-2xl font-bold text-green-600">{elapsed}</span>;
}

export default function MobileClockIn({ isSupervisor }) {
  const [activeVisit, setActiveVisit] = useState(null);
  const [clockedInAt, setClockedInAt] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null);
  const { enqueueAction, isOnline } = useOffline();

  function handleClockIn(visit) {
    const ts = new Date().toISOString();
    setClockedInAt(ts);
    setActiveVisit(visit);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationStatus({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude });
          enqueueAction({ type: "create", entity: "EVVLog", data: {
            shift_id: visit.id, client_name: visit.client,
            clock_in_time: ts, clock_in_lat: pos.coords.latitude, clock_in_lng: pos.coords.longitude, status: "In Progress",
          }});
        },
        () => {
          setLocationStatus({ ok: false });
          enqueueAction({ type: "create", entity: "EVVLog", data: {
            shift_id: visit.id, client_name: visit.client, clock_in_time: ts, status: "In Progress", gps_unavailable: true,
          }});
        }
      );
    }
  }

  function handleClockOut() {
    enqueueAction({ type: "update", entity: "EVVLog", recordId: "pending", data: {
      clock_out_time: new Date().toISOString(), status: "Completed",
    }});
    setActiveVisit(null);
    setClockedInAt(null);
    setLocationStatus(null);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-4 pt-6 pb-4 bg-card border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Visits & Clock In/Out</h1>
      </div>

      {/* Active visit banner */}
      {activeVisit && (
        <div className="mx-4 mt-4 rounded-2xl bg-green-600 text-white overflow-hidden">
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-green-100 text-xs font-semibold uppercase tracking-wide">In Progress</span>
              <span className="flex items-center gap-1 text-green-100 text-xs">
                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-lg font-bold">{activeVisit.client}</p>
            <p className="text-green-100 text-sm">{activeVisit.service}</p>
            <ActiveVisitTimer clockedInAt={clockedInAt} />

            {locationStatus && (
              <div className={cn("flex items-center gap-1.5 mt-2 text-xs", locationStatus.ok ? "text-green-100" : "text-yellow-200")}>
                {locationStatus.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {locationStatus.ok ? "Location verified" : "GPS unavailable — flagged for review"}
              </div>
            )}

            <button
              onClick={handleClockOut}
              className="mt-4 w-full bg-white text-green-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Square className="w-4 h-4" />
              Clock Out
            </button>
          </div>
        </div>
      )}

      {/* Today's schedule */}
      <div className="px-4 mt-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Today's Schedule</h2>
        <div className="space-y-3">
          {VISITS.filter((v) => v.date === "Today").map((visit) => {
            const evv = EVV_BADGES[visit.evvStatus];
            const isActive = activeVisit?.id === visit.id;
            return (
              <div key={visit.id} className={cn("bg-card border rounded-2xl overflow-hidden", isActive ? "border-green-500 border-2" : "border-border")}>
                <div className="px-4 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{visit.client}</p>
                      <p className="text-xs text-muted-foreground">{visit.service} · {visit.start}–{visit.end}</p>
                    </div>
                    <span className={cn("text-[10px] px-2 py-1 rounded-full font-semibold", evv.color)}>{evv.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-semibold", NOTE_BADGES[visit.noteStatus])}>Note: {visit.noteStatus}</span>
                    {!activeVisit && !isActive && (
                      <button
                        onClick={() => handleClockIn(visit)}
                        className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-transform"
                      >
                        <Play className="w-3 h-3" />
                        Clock In
                      </button>
                    )}
                    {isActive && <span className="text-xs text-green-600 font-semibold">Active</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visit history */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Recent Visit History</h2>
        <div className="space-y-2">
          {VISITS.filter((v) => v.date !== "Today").map((visit) => {
            const evv = EVV_BADGES[visit.evvStatus];
            return (
              <div key={visit.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{visit.client}</p>
                  <p className="text-xs text-muted-foreground">{visit.date} · {visit.start}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", evv.color)}>{evv.label}</span>
                  <span className={cn("text-[10px] font-semibold", NOTE_BADGES[visit.noteStatus])}>{visit.noteStatus}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}