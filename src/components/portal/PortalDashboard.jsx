import React, { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PortalContext } from "@/pages/Portal";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Target, FileText, AlertTriangle, Pill, Bell,
  MessageSquare, CheckCircle, Clock, ChevronRight, TrendingUp, Shield
} from "lucide-react";
import { format, parseISO, isAfter } from "date-fns";

const today = new Date().toISOString().split("T")[0];

function NotifDot({ type }) {
  const colors = {
    session_note: "bg-blue-500", incident: "bg-red-500", goal_update: "bg-emerald-500",
    document: "bg-violet-500", visit_clockin: "bg-sky-500", message: "bg-amber-500", auth_alert: "bg-orange-500"
  };
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${colors[type] || "bg-slate-400"}`} />;
}

export default function PortalDashboard() {
  const { portalUser } = useContext(PortalContext);
  const clientId = portalUser?.client_id;

  const { data: schedules = [] } = useQuery({
    queryKey: ["portal-schedules", clientId],
    queryFn: () => base44.entities.ShiftSchedule.filter({ client_id: clientId }),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["portal-goals", clientId],
    queryFn: () => base44.entities.ClientGoal.filter({ client_id: clientId }),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["portal-notes", clientId],
    queryFn: () => base44.entities.SessionNote.filter({ client_id: clientId }),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["portal-incidents", clientId],
    queryFn: () => base44.entities.IncidentReport.filter({ client_id: clientId }),
  });

  const { data: medications = [] } = useQuery({
    queryKey: ["portal-meds", clientId],
    queryFn: () => base44.entities.Medication.filter({ client_id: clientId }),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["portal-docs", clientId],
    queryFn: () => base44.entities.ComplianceDocument.filter({ client_id: clientId }),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["portal-notifs", portalUser?.id],
    queryFn: () => base44.entities.PortalNotification.filter({ portal_user_id: portalUser?.id }),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["portal-messages", clientId],
    queryFn: () => base44.entities.PortalMessage.filter({ client_id: clientId }),
  });

  const upcoming = schedules.filter(s => s.date >= today && s.status !== "Cancelled").slice(0, 3);
  const recentCompleted = schedules.filter(s => s.status === "Completed").slice(0, 3);
  const activeGoals = goals.filter(g => g.status === "Active" || g.status === "In Progress").slice(0, 4);
  const recentNotes = notes.slice(0, 3);
  const openIncidents = incidents.filter(i => i.status !== "Closed" && i.status !== "Resolved");
  const pendingDocs = documents.filter(d => d.status === "Pending" || d.status === "In Review");
  const unreadMessages = messages.filter(m => !m.is_read && m.sender_type === "Staff").length;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}, {portalUser?.full_name?.split(" ")[0]}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Care overview for {portalUser?.client_name}</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-400">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          <div className="flex items-center gap-1 justify-end mt-1">
            <Shield className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600">Secure session</span>
          </div>
        </div>
      </div>

      {/* Alert banners */}
      {openIncidents.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">{openIncidents.length} Open Incident{openIncidents.length > 1 ? "s" : ""}</p>
            <p className="text-xs text-red-600 mt-0.5">There {openIncidents.length === 1 ? "is" : "are"} unresolved incident{openIncidents.length > 1 ? "s" : ""} involving {portalUser?.client_name}. Click to view details.</p>
          </div>
        </div>
      )}

      {pendingDocs.length > 0 && (
        <Link to="/portal/documents">
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3 hover:bg-violet-100 transition-colors cursor-pointer">
            <FileText className="w-5 h-5 text-violet-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-violet-800">{pendingDocs.length} Document{pendingDocs.length > 1 ? "s" : ""} Awaiting Signature</p>
              <p className="text-xs text-violet-600">Tap to review and sign</p>
            </div>
            <ChevronRight className="w-4 h-4 text-violet-400" />
          </div>
        </Link>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Upcoming Visits", value: upcoming.length, icon: Calendar, color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Active Goals", value: activeGoals.length, icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Unread Messages", value: unreadMessages, icon: MessageSquare, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Current Meds", value: medications.length, icon: Pill, color: "text-violet-600", bg: "bg-violet-50" },
        ].map(stat => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="py-4 px-4">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Visits */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-sky-500" />Upcoming Visits</CardTitle>
              <Link to="/portal/schedule" className="text-xs text-sky-600 hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No upcoming visits scheduled</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map(s => (
                  <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                    <div className="w-10 h-10 rounded-lg bg-sky-100 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-sky-700">{format(parseISO(s.date), "d")}</span>
                      <span className="text-xs text-sky-600 leading-none">{format(parseISO(s.date), "MMM")}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.service_type}</p>
                      <p className="text-xs text-slate-500">{s.start_time} – {s.end_time} · {s.staff_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goal Progress */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-emerald-500" />Goal Progress</CardTitle>
              <Link to="/portal/goals" className="text-xs text-sky-600 hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {activeGoals.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No active goals on file</p>
            ) : (
              <div className="space-y-3">
                {activeGoals.map(g => {
                  const pct = g.progress_percentage || 0;
                  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-sky-500" : "bg-amber-500";
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-700 truncate pr-2">{g.goal_title || g.title}</p>
                        <span className="text-xs font-semibold text-slate-600 flex-shrink-0">{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Session Notes */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" />Recent Session Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentNotes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No session notes yet</p>
            ) : (
              <div className="space-y-3">
                {recentNotes.map(n => (
                  <div key={n.id} className="p-3 rounded-lg bg-slate-50 border-l-2 border-blue-300">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-slate-700">{n.staff_name}</p>
                      <p className="text-xs text-slate-400">{n.session_date}</p>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{n.summary || n.note_content || "Session completed"}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Feed */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" />Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="space-y-2">
                {[
                  { type: "session_note", title: "Session note added", body: "DSP Alex completed a session note for today" },
                  { type: "goal_update", title: "Goal progress updated", body: "Progress recorded for Community Skills goal" },
                  { type: "visit_clockin", title: "Visit started", body: "Alex M. clocked in for today's Community Living visit" },
                ].map((n, i) => (
                  <div key={i} className="flex gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <NotifDot type={n.type} />
                    <div>
                      <p className="text-xs font-medium text-slate-700">{n.title}</p>
                      <p className="text-xs text-slate-400">{n.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 5).map(n => (
                  <div key={n.id} className={`flex gap-3 p-2 rounded-lg ${!n.is_read ? "bg-amber-50" : "hover:bg-slate-50"}`}>
                    <NotifDot type={n.type} />
                    <div>
                      <p className="text-xs font-medium text-slate-700">{n.title}</p>
                      <p className="text-xs text-slate-400">{n.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Medications */}
      {medications.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Pill className="w-4 h-4 text-violet-500" />Current Medications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {medications.map(med => (
                <div key={med.id} className="p-3 rounded-lg bg-violet-50 border border-violet-100">
                  <p className="text-sm font-semibold text-violet-900">{med.name}</p>
                  <p className="text-xs text-violet-700 mt-0.5">{med.dosage} · {med.route}</p>
                  <p className="text-xs text-slate-500 mt-1">{med.frequency}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}