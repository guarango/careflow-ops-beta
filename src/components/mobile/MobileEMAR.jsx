import React, { useState } from "react";
import { ChevronLeft, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOffline } from "@/hooks/useOffline";

const MEDS = [
  { id: "m1", name: "Risperidone", dose: "0.5 mg", route: "Oral", time: "8:00 AM", instructions: "Give with food.", window: "active" },
  { id: "m2", name: "Metformin", dose: "500 mg", route: "Oral", time: "8:00 AM", instructions: "Give with breakfast.", window: "active" },
  { id: "m3", name: "Levothyroxine", dose: "50 mcg", route: "Oral", time: "7:00 AM", instructions: "Give on empty stomach 30 min before food.", window: "overdue" },
  { id: "m4", name: "Melatonin", dose: "3 mg", route: "Oral", time: "9:00 PM", instructions: "Bedtime only.", window: "upcoming" },
];

const WINDOW_STYLES = {
  active: "border-blue-200 bg-blue-50",
  overdue: "border-red-200 bg-red-50",
  upcoming: "border-border bg-card",
};

const REASON_CODES = ["Client refused", "Medication unavailable", "Physician hold", "Client asleep", "Other"];

function MedCard({ med, onRecord }) {
  const [status, setStatus] = useState(null);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  function handleAction(s) {
    if (s === "administered") {
      onRecord({ medId: med.id, status: s, time: new Date().toISOString() });
      setSaved(true);
    } else {
      setStatus(s);
      setShowReason(true);
    }
  }

  function submitReason() {
    onRecord({ medId: med.id, status, reason, notes, time: new Date().toISOString() });
    setSaved(true);
    setShowReason(false);
  }

  if (saved) {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{med.name} {med.dose}</p>
          <p className="text-xs text-green-700 font-medium">Recorded</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border-2 overflow-hidden", WINDOW_STYLES[med.window])}>
      <div className="px-4 py-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="font-bold text-foreground">{med.name} {med.dose}</p>
            <p className="text-xs text-muted-foreground">{med.route} · {med.time}</p>
            <p className="text-xs text-muted-foreground mt-0.5 italic">{med.instructions}</p>
          </div>
          {med.window === "overdue" && (
            <div className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[10px] font-bold">Overdue</span>
            </div>
          )}
          {med.window === "upcoming" && (
            <div className="flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-semibold">Later</span>
            </div>
          )}
        </div>

        {!showReason && med.window !== "upcoming" && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={() => handleAction("administered")}
              className="bg-green-600 text-white py-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform">
              ✓ Administered
            </button>
            <button onClick={() => handleAction("refused")}
              className="bg-card border border-border text-foreground py-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform">
              Refused
            </button>
            <button onClick={() => handleAction("held")}
              className="bg-card border border-border text-foreground py-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform">
              Held
            </button>
            <button onClick={() => handleAction("unavailable")}
              className="bg-card border border-border text-foreground py-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform">
              Not Available
            </button>
          </div>
        )}

        {showReason && (
          <div className="mt-3 space-y-3">
            <p className="text-xs font-semibold text-foreground capitalize">Reason for {status}:</p>
            <div className="flex flex-wrap gap-2">
              {REASON_CODES.map((r) => (
                <button key={r} onClick={() => setReason(r)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    reason === r ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground")}>
                  {r}
                </button>
              ))}
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Additional notes (optional)…"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <button onClick={submitReason} disabled={!reason}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform">
              Save Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MobileEMAR({ client, onClose }) {
  const { enqueueAction, isOnline } = useOffline();

  function handleRecord(entry) {
    enqueueAction({
      type: "create",
      entity: "MedicationLog",
      data: {
        client_name: client?.client || "Client",
        medication_name: MEDS.find((m) => m.id === entry.medId)?.name,
        dose: MEDS.find((m) => m.id === entry.medId)?.dose,
        status: entry.status,
        reason: entry.reason || null,
        notes: entry.notes || null,
        administered_at: entry.time,
      },
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground">eMAR</p>
          <p className="text-sm font-bold">{client?.client || "Client"}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Current Administration Window</p>
        {MEDS.filter((m) => m.window !== "upcoming").map((med) => (
          <MedCard key={med.id} med={med} onRecord={handleRecord} />
        ))}
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mt-4">Upcoming</p>
        {MEDS.filter((m) => m.window === "upcoming").map((med) => (
          <MedCard key={med.id} med={med} onRecord={handleRecord} />
        ))}
        {!isOnline && <p className="text-xs text-amber-600 text-center">Offline — entries will sync when connected</p>}
      </div>
    </div>
  );
}