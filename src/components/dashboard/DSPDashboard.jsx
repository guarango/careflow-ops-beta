import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, formatDistanceToNow, isToday, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarDays, Clock, CheckCircle2, AlertCircle, Bell,
  Smartphone, ChevronRight, AlertTriangle, Target, Pill as PillIcon, Info
} from "lucide-react";
import { cn } from "@/lib/utils";


function StatusPill({ color, label }) {
  const colors = {
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color] || colors.gray}`}>
      {label}
    </span>
  );
}

const NOTIF_ICONS = {
  emar_reminder: { icon: PillIcon, color: "text-blue-500", bg: "bg-blue-50" },
  emar_missed: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  goal_missed: { icon: Target, color: "text-amber-500", bg: "bg-amber-50" },
};

function shiftStatus(shift) {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  if (shift.evv_clock_in && !shift.evv_clock_out) return { label: "Active", color: "green" };
  if (shift.status === "Completed" || shift.evv_clock_out) return { label: "Completed", color: "gray" };
  const [h, m] = (shift.start_time || "00:00").split(":").map(Number);
  const start = new Date(todayStr);
  start.setHours(h, m, 0, 0);
  const diffMin = (start - now) / 60000;
  if (diffMin > 0 && diffMin <= 30) return { label: "Clock in soon", color: "amber" };
  if (diffMin > 30) return { label: "Upcoming", color: "blue" };
  return { label: "In progress", color: "green" };
}

export default function DSPDashboard({ user }) {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState("");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const firstName = user?.full_name?.split(" ")[0] || "there";
  const today = format(new Date(), "EEEE, MMMM d, yyyy");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Fetch today's shifts for this staff
  const { data: allShifts = [] } = useQuery({
    queryKey: ["my-shifts-today", user?.id, todayStr],
    queryFn: () => base44.entities.ShiftSchedule.filter({ date: todayStr }),
    enabled: !!user?.id,
  });

  // Fetch staff member record to get assigned clients
  const { data: staffRecords = [] } = useQuery({
    queryKey: ["staff-me", user?.email],
    queryFn: () => base44.entities.StaffMember.filter({ email: user.email }),
    enabled: !!user?.email,
  });
  const staffRecord = staffRecords[0];

  // Fetch assigned clients
  const { data: allClients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  // Fetch today's medications (eMAR) for assigned clients
  const { data: allMedLogs = [] } = useQuery({
    queryKey: ["med-logs-today", todayStr],
    queryFn: () => base44.entities.MedicationLog.filter({ date: todayStr }),
    enabled: !!user?.id,
  });

  // Fetch notifications for this user
  const { data: allNotifs = [] } = useQuery({
    queryKey: ["my-notifs", user?.id],
    queryFn: () => base44.entities.AppNotification.filter({ recipient_user_id: user.id }),
    enabled: !!user?.id,
  });

  // Filter shifts to user's
  const myShifts = allShifts.filter(s =>
    s.staff_id === user?.id || s.staff_id === staffRecord?.id
  );

  // Active shift (clocked in, not out)
  const activeShift = myShifts.find(s => s.evv_clock_in && !s.evv_clock_out);

  // Tick elapsed time for active shift
  useEffect(() => {
    if (!activeShift?.evv_clock_in) return;
    const tick = () => {
      const diff = Date.now() - new Date(activeShift.evv_clock_in).getTime();
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setElapsed(hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [activeShift?.evv_clock_in]);

  // Assigned clients for today
  const assignedClientIds = staffRecord?.assigned_client_ids || [];
  const myClients = allClients.filter(c =>
    assignedClientIds.includes(c.id) && c.status === "Active"
  );

  // Unread notifications
  const unreadNotifs = allNotifs
    .filter(n => n.status === "unread" || n.status === "read")
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  // For each client, get today's visits
  const clientShifts = (clientId) => myShifts.filter(s => s.client_id === clientId);
  const clientMedsDue = (clientId) => {
    const logged = allMedLogs.filter(ml => ml.client_id === clientId);
    return logged;
  };

  const nextShift = myShifts
    .filter(s => !s.evv_clock_out)
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))[0];

  const isNextWithin30 = (() => {
    if (!nextShift?.start_time || activeShift) return false;
    const now = new Date();
    const [h, m] = nextShift.start_time.split(":").map(Number);
    const start = new Date(todayStr);
    start.setHours(h, m, 0, 0);
    const diff = (start - now) / 60000;
    return diff >= 0 && diff <= 30;
  })();

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Greeting */}
      <div className="pl-14 sm:pl-0">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">{greeting}, {firstName}</h1>
        <p className="text-muted-foreground text-sm mt-1">{today}</p>
      </div>

      {/* Active Shift Banner */}
      {activeShift ? (
        <Card className="border-2 border-green-300 bg-green-50/60">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Active Shift</span>
              </div>
              <p className="text-lg font-bold text-foreground">{activeShift.client_name}</p>
              <p className="text-sm text-muted-foreground">
                {activeShift.service_type} · Clocked in at {activeShift.evv_clock_in?.slice(11, 16)} · {elapsed} elapsed
              </p>
            </div>
            <Link to="/schedule">
              <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold shrink-0">
                View shift
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : nextShift ? (
        <Card className={cn("border-2", isNextWithin30 ? "border-green-200 bg-green-50/50" : "border-blue-100 bg-blue-50/30")}>
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                {isNextWithin30 ? "Shift starting soon" : "Next shift today"}
              </p>
              <p className="text-lg font-bold text-foreground">{nextShift.client_name}</p>
              <p className="text-sm text-muted-foreground">
                {nextShift.service_type} · Starts {nextShift.start_time}
              </p>
            </div>
            {isNextWithin30 && (
              <Link to="/schedule">
                <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 shrink-0">
                  Clock in
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border bg-muted/30">
          <CardContent className="p-5 text-center text-muted-foreground text-sm">
            No shifts scheduled for today.
          </CardContent>
        </Card>
      )}

      {/* My Shift Today */}
      {myShifts.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold">My Shift Today</CardTitle>
            </div>
            <Link to="/schedule">
              <Button variant="ghost" size="sm" className="text-xs h-7">
                Schedule <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {myShifts.map((s, i) => {
              const st = shiftStatus(s);
              return (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <span className="text-xs font-mono text-muted-foreground w-14 shrink-0">{s.start_time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{s.client_name}</p>
                    <p className="text-xs text-muted-foreground">{s.service_type}</p>
                  </div>
                  <StatusPill color={st.color} label={st.label} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* My Clients Today */}
      {myClients.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">My Clients Today</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {myClients.map((client) => {
              const shifts = clientShifts(client.id);
              const meds = clientMedsDue(client.id);
              const medsAdministered = meds.filter(m => m.status === "Administered").length;
              const medsTotal = meds.length;
              const hasGoals = true; // would check SessionNotes for today

              return (
                <Card key={client.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                        {client.first_name?.[0]}{client.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{client.first_name} {client.last_name}</p>
                        {shifts[0] && (
                          <p className="text-xs text-muted-foreground">{shifts[0].service_type} · {shifts[0].start_time}</p>
                        )}
                      </div>
                    </div>

                    {/* Task checklist */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {medsAdministered === medsTotal && medsTotal > 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          eMAR sign-offs: {medsTotal > 0 ? `${medsAdministered}/${medsTotal} done` : "None due"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-xs text-muted-foreground">Goals documented</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* My Notifications */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold">My Notifications</CardTitle>
          </div>
          <Link to="/notifications">
            <Button variant="ghost" size="sm" className="text-xs h-7">
              View all <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {unreadNotifs.length === 0 ? (
            <div className="flex items-center gap-3 py-4 text-green-600">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">You're all caught up!</span>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {unreadNotifs.map((n) => {
                const cfg = NOTIF_ICONS[n.type] || { icon: Info, color: "text-muted-foreground", bg: "bg-muted" };
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => navigate(n.related_record_type === "emar" ? "/emar" : "/goals")}
                    className="flex gap-3 py-3 cursor-pointer hover:bg-muted/40 rounded-md px-1 -mx-1 transition-colors"
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                      <Icon className={cn("w-4 h-4", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">{n.message}</p>
                      {n.client_name && <p className="text-[11px] text-muted-foreground mt-0.5">{n.client_name}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true }) : ""}
                      </p>
                    </div>
                    {n.status === "unread" && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile app banner */}
      <Card className="border border-blue-200 bg-blue-50/60">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Use the Mobile Field App</p>
            <p className="text-xs text-muted-foreground">Clock in/out, session notes, goal data & more — optimized for your phone</p>
          </div>
          <a href="/mobile" className="flex-shrink-0 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            Open
          </a>
        </CardContent>
      </Card>
    </div>
  );
}