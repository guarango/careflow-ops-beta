import React, { useState } from "react";
import { AlertTriangle, FileText, Clock, Users, Map, MessageSquare, ChevronRight, CheckCircle2, Eye, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIVE_VISITS = [
  { id: "av1", dsp: "James Williams", client: "Michael Anderson", service: "Personal Care", elapsed: "1h 23m", evvStatus: "verified", startTime: "8:00 AM" },
  { id: "av2", dsp: "Maria Santos", client: "David Park", service: "Residential Hab", elapsed: "45m", evvStatus: "exception", startTime: "9:00 AM" },
  { id: "av3", dsp: "Devon Clarke", client: "Lisa Torres", service: "Day Program", elapsed: "2h 05m", evvStatus: "verified", startTime: "7:30 AM" },
];

const PENDING_NOTES = [
  { id: "pn1", dsp: "James Williams", client: "Michael Anderson", submitted: "10 min ago" },
  { id: "pn2", dsp: "Devon Clarke", client: "Lisa Torres", submitted: "Yesterday", overdue: true },
];

const OPEN_INCIDENTS = [
  { id: "oi1", dsp: "Maria Santos", client: "David Park", type: "Behavioral Incident", filed: "2 hours ago", severity: "medium" },
];

const RISK_ALERTS = [
  { id: "ra1", type: "behavioral", severity: "critical", client: "Jaylen Thomas", title: "Incident frequency spike" },
  { id: "ra2", type: "workforce", severity: "medium", staff: "Devon Clarke", title: "Documentation compliance declining" },
];

const EVV_STATUS = {
  verified: { label: "EVV OK", color: "text-green-600", dot: "bg-green-500" },
  exception: { label: "Exception", color: "text-red-600", dot: "bg-red-500" },
  pending: { label: "Pending", color: "text-amber-600", dot: "bg-amber-500" },
};

const SEVERITY_COLORS = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function MobileSupervisor({ user, onNavigate }) {
  const [coSignVisit, setCoSignVisit] = useState(null);
  const firstName = user?.full_name?.split(" ")[0] || "Supervisor";

  if (coSignVisit) {
    return <CoSignFlow note={coSignVisit} onClose={() => setCoSignVisit(null)} />;
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-sidebar px-5 pt-6 pb-6">
        <p className="text-sidebar-foreground/60 text-sm">Supervisor View</p>
        <h1 className="text-2xl font-bold text-sidebar-accent-foreground mt-1">{firstName}'s Dashboard</h1>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { value: ACTIVE_VISITS.length, label: "Active", color: "text-green-400" },
            { value: PENDING_NOTES.length, label: "Notes", color: "text-blue-400" },
            { value: OPEN_INCIDENTS.length, label: "Incidents", color: "text-red-400" },
            { value: RISK_ALERTS.length, label: "Alerts", color: "text-amber-400" },
          ].map(({ value, label, color }) => (
            <div key={label} className="bg-sidebar-accent/40 rounded-xl p-3 text-center">
              <p className={cn("text-xl font-bold", color)}>{value}</p>
              <p className="text-[10px] text-sidebar-foreground/60">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-6 mt-5">
        {/* Active Visits */}
        <Section title="Active Visits" icon={Map} count={ACTIVE_VISITS.length}>
          {ACTIVE_VISITS.map((v) => {
            const evv = EVV_STATUS[v.evvStatus];
            return (
              <div key={v.id} className="bg-card border border-border rounded-xl px-4 py-3">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{v.dsp}</p>
                    <p className="text-xs text-muted-foreground">with {v.client} · {v.service}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0", evv.dot)} />
                    <span className={cn("text-xs font-semibold", evv.color)}>{evv.label}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">Elapsed: {v.elapsed}</span>
                  <div className="flex gap-2">
                    <button className="text-xs text-primary font-semibold flex items-center gap-1"><Eye className="w-3 h-3" /> View</button>
                    <button className="text-xs text-amber-600 font-semibold flex items-center gap-1"><Flag className="w-3 h-3" /> Flag</button>
                  </div>
                </div>
              </div>
            );
          })}
        </Section>

        {/* Pending Co-Signatures */}
        <Section title="Pending Co-Signatures" icon={FileText} count={PENDING_NOTES.length}>
          {PENDING_NOTES.map((n) => (
            <button
              key={n.id}
              onClick={() => setCoSignVisit(n)}
              className={cn("w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left border transition-colors active:opacity-80",
                n.overdue ? "bg-red-50 border-red-200" : "bg-card border-border")}
            >
              <FileText className={cn("w-5 h-5 flex-shrink-0", n.overdue ? "text-red-500" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{n.dsp}</p>
                <p className="text-xs text-muted-foreground">{n.client} · {n.submitted}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </Section>

        {/* Open Incidents */}
        <Section title="Open Incidents" icon={AlertTriangle} count={OPEN_INCIDENTS.length}>
          {OPEN_INCIDENTS.map((inc) => (
            <div key={inc.id} className={cn("rounded-xl border px-4 py-3", SEVERITY_COLORS[inc.severity])}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{inc.type}</p>
                  <p className="text-xs opacity-80">{inc.client} · DSP: {inc.dsp}</p>
                  <p className="text-xs opacity-70 mt-0.5">{inc.filed}</p>
                </div>
                <button className="text-xs font-semibold underline">Review</button>
              </div>
            </div>
          ))}
        </Section>

        {/* AI Risk Alerts */}
        <Section title="AI Risk Alerts" icon={AlertTriangle} count={RISK_ALERTS.length}>
          {RISK_ALERTS.map((alert) => (
            <div key={alert.id} className={cn("rounded-xl border px-4 py-3", SEVERITY_COLORS[alert.severity])}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="text-xs opacity-80">{alert.client || alert.staff}</p>
                </div>
                <span className="text-[10px] font-bold uppercase opacity-80">{alert.severity}</span>
              </div>
            </div>
          ))}
        </Section>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: MessageSquare, label: "Message Team", color: "bg-blue-500" },
              { icon: Users, label: "View All Staff", color: "bg-purple-500" },
            ].map(({ icon: Icon, label, color }) => (
              <button
                key={label}
                className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-4 active:bg-muted transition-colors"
              >
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", color)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, count, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground flex-1">{title}</h2>
        {count > 0 && <span className="bg-muted text-muted-foreground text-xs font-semibold px-2 py-0.5 rounded-full">{count}</span>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function CoSignFlow({ note, onClose }) {
  const [step, setStep] = useState("review"); // "review" | "correct" | "done"
  const [correction, setCorrection] = useState("");

  const DEMO_NOTE = `Session completed with ${note.client}. Client was cooperative and engaged throughout the 3-hour personal care visit. Goals addressed include community navigation and meal preparation. Client demonstrated improving independence with breakfast preparation, completing 4 of 5 steps independently. No incidents to report. Client's mood was positive at start and end of visit.`;

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Note Co-Signed</h2>
        <p className="text-muted-foreground text-sm mt-2 mb-6">DSP has been notified.</p>
        <button onClick={onClose} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm">Done</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <button onClick={onClose} className="text-muted-foreground text-sm">← Back</button>
        <h1 className="text-base font-bold flex-1">Co-Signature Review</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-3">
          <p className="text-xs text-muted-foreground">DSP: {note.dsp} · Client: {note.client}</p>
          <p className="text-xs text-muted-foreground">Submitted: {note.submitted}</p>
        </div>
        {step === "review" && (
          <>
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <p className="text-sm text-foreground leading-relaxed">{DEMO_NOTE}</p>
            </div>
          </>
        )}
        {step === "correct" && (
          <div>
            <p className="text-sm font-medium mb-2">Correction note to DSP:</p>
            <textarea value={correction} onChange={(e) => setCorrection(e.target.value)} rows={4}
              placeholder="Describe what needs to be corrected…"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        )}
      </div>
      <div className="px-4 pb-6 pt-3 border-t border-border bg-card space-y-2">
        {step === "review" && (
          <>
            <button onClick={() => setStep("done")}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <CheckCircle2 className="w-4 h-4" /> Co-Sign & Approve
            </button>
            <button onClick={() => setStep("correct")}
              className="w-full bg-card border border-border text-foreground py-3.5 rounded-xl font-semibold text-sm active:scale-95 transition-transform">
              Request Correction
            </button>
          </>
        )}
        {step === "correct" && (
          <button onClick={() => setStep("done")} disabled={!correction}
            className="w-full bg-amber-500 text-white py-4 rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-95 transition-transform">
            Send Correction Request
          </button>
        )}
      </div>
    </div>
  );
}