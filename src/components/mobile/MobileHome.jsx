import React, { useState } from "react";
import { format } from "date-fns";
import { Bell, CheckCircle2, Clock, AlertTriangle, ChevronRight, Play, FileText, Target, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileVisitCard from "./MobileVisitCard";
import MobileSessionNote from "./MobileSessionNote";
import MobileGoalData from "./MobileGoalData";
import MobileIncidentReport from "./MobileIncidentReport";
import MobileEMAR from "./MobileEMAR";

const DEMO_VISITS = [
  {
    id: "v1", client: "Michael Anderson", service: "Personal Care", serviceCode: "T2031",
    start: "8:00 AM", end: "11:00 AM", address: "123 Oak Street, Salt Lake City, UT",
    status: "upcoming", initials: "MA", color: "bg-blue-500",
  },
  {
    id: "v2", client: "Lisa Torres", service: "Day Program Support", serviceCode: "T2021",
    start: "2:00 PM", end: "4:00 PM", address: "88 Elm Avenue, Murray, UT",
    status: "upcoming", initials: "LT", color: "bg-teal-500",
  },
];

const ALERTS = [
  { type: "error", icon: AlertTriangle, text: "Session note overdue — Lisa Torres (Mar 20)" },
  { type: "warning", icon: Clock, text: "CPR certification expires in 12 days" },
  { type: "info", icon: Bell, text: "Supervisor message: schedule change Fri" },
];

export default function MobileHome({ user, onNavigate }) {
  const firstName = user?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = format(new Date(), "EEEE, MMMM d");

  const [activeFlow, setActiveFlow] = useState(null); // "note" | "goal" | "incident" | "emar" | null
  const [flowContext, setFlowContext] = useState(null);

  const completed = DEMO_VISITS.filter((v) => v.status === "completed").length;

  if (activeFlow === "note") return <MobileSessionNote client={flowContext} onClose={() => setActiveFlow(null)} />;
  if (activeFlow === "goal") return <MobileGoalData client={flowContext} onClose={() => setActiveFlow(null)} />;
  if (activeFlow === "incident") return <MobileIncidentReport onClose={() => setActiveFlow(null)} />;
  if (activeFlow === "emar") return <MobileEMAR client={flowContext} onClose={() => setActiveFlow(null)} />;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-sidebar px-5 pt-6 pb-8">
        <p className="text-sidebar-foreground/60 text-sm">{today}</p>
        <h1 className="text-2xl font-bold text-sidebar-accent-foreground mt-1">
          {greeting}, {firstName}
        </h1>
        <p className="text-sidebar-foreground/70 text-sm mt-1">You have {DEMO_VISITS.length} visits today</p>

        {/* Summary pills */}
        <div className="flex gap-2 mt-4">
          <span className="bg-sidebar-accent/60 text-sidebar-accent-foreground text-xs px-3 py-1.5 rounded-full font-medium">
            {completed}/{DEMO_VISITS.length} visits done
          </span>
          <span className="bg-sidebar-accent/60 text-sidebar-accent-foreground text-xs px-3 py-1.5 rounded-full font-medium">
            1 note due
          </span>
        </div>
      </div>

      {/* Alert strip */}
      <div className="mx-4 -mt-4 rounded-2xl overflow-hidden shadow-lg">
        {ALERTS.map((a, i) => {
          const Icon = a.icon;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 px-4 py-3 border-b border-black/10 last:border-0",
                a.type === "error" ? "bg-red-600" : a.type === "warning" ? "bg-amber-500" : "bg-blue-600"
              )}
            >
              <Icon className="w-4 h-4 text-white flex-shrink-0" />
              <p className="text-white text-xs font-medium flex-1">{a.text}</p>
              <ChevronRight className="w-4 h-4 text-white/60 flex-shrink-0" />
            </div>
          );
        })}
      </div>

      {/* Today's visits */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Today's Schedule</h2>
        <div className="space-y-3">
          {DEMO_VISITS.map((visit) => (
            <MobileVisitCard
              key={visit.id}
              visit={visit}
              onStartNote={() => { setFlowContext(visit); setActiveFlow("note"); }}
              onGoalData={() => { setFlowContext(visit); setActiveFlow("goal"); }}
            />
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Play, label: "Start Visit", color: "bg-green-500", action: "clock" },
            { icon: AlertTriangle, label: "File Incident", color: "bg-red-500", action: "incident" },
            { icon: Target, label: "Goal Data", color: "bg-purple-500", action: "goal" },
            { icon: Pill, label: "Give Meds", color: "bg-blue-500", action: "emar" },
          ].map(({ icon: Icon, label, color, action }) => (
            <button
              key={label}
              onClick={() => {
                if (action === "incident") setActiveFlow("incident");
                else if (action === "goal") { setFlowContext(DEMO_VISITS[0]); setActiveFlow("goal"); }
                else if (action === "emar") { setFlowContext(DEMO_VISITS[0]); setActiveFlow("emar"); }
                else onNavigate?.(action);
              }}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border active:scale-95 transition-transform"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-foreground text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Note status */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Recent Notes</h2>
        <div className="space-y-2">
          {[
            { client: "Michael Anderson", date: "Today", status: "Draft", color: "text-amber-500" },
            { client: "Lisa Torres", date: "Mar 20", status: "Overdue", color: "text-red-500" },
            { client: "David Park", date: "Mar 22", status: "Finalized", color: "text-green-500" },
          ].map((n, i) => (
            <button
              key={i}
              onClick={() => { setFlowContext({ client: n.client }); setActiveFlow("note"); }}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 active:bg-muted transition-colors"
            >
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{n.client}</p>
                <p className="text-xs text-muted-foreground">{n.date}</p>
              </div>
              <span className={cn("text-xs font-semibold flex-shrink-0", n.color)}>{n.status}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}