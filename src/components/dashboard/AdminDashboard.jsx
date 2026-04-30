import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Heart, Users, AlertTriangle, Shield, ArrowRight,
  ShieldAlert, FileWarning, Activity, UserMinus
} from "lucide-react";

function StatCard({ label, value, sub, subColor = "text-muted-foreground", icon: Icon, iconColor = "text-primary" }) {
  return (
    <div className="bg-muted/50 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      <div className={`text-xs mt-1 ${subColor}`}>{sub}</div>
    </div>
  );
}

function Pill({ color, label }) {
  const colors = {
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${colors[color] || colors.gray}`}>
      {label}
    </span>
  );
}

const VISITS = [
  { time: "8:00 AM", client: "Michael Anderson", staff: "James Williams", service: "Personal care", duration: "3 hrs", status: "Active", statusColor: "green" },
  { time: "9:30 AM", client: "Sarah Chen", staff: "Maria Johnson", service: "Community support", duration: "2 hrs", status: "Scheduled", statusColor: "blue" },
  { time: "1:00 PM", client: "David Park", staff: "Unassigned", service: "Respite", duration: "4 hrs", status: "No staff", statusColor: "amber" },
  { time: "2:00 PM", client: "Lisa Torres", staff: "James Williams", service: "Day program", duration: "2 hrs", status: "Scheduled", statusColor: "blue" },
];

const QUICK_ACTIONS = [
  { label: "+ Add client", path: "/clients" },
  { label: "+ Add staff", path: "/staff" },
  { label: "Log incident", path: "/incidents" },
  { label: "Review timecards", path: "/timecards" },
  { label: "Billing overview", path: "/finance" },
  { label: "Compliance docs", path: "/compliance" },
];

// Static compliance/HR alerts (would be live data in production)
const COMPLIANCE_ALERTS = [
  { color: "red", badge: "Expired", title: "State Operating License", meta: "Organization", date: "Expired 2025-12-31", path: "/compliance" },
  { color: "amber", badge: "Expiring Soon", title: "CPR Certification", meta: "Maria Johnson", date: "Expires 2026-05-15", path: "/hr" },
  { color: "amber", badge: "Expiring Soon", title: "ISP Review Due", meta: "Michael Anderson", date: "Past due", path: "/isp" },
  { color: "blue", badge: "Pending", title: "I-9 Verification", meta: "New hire · James R.", date: "Awaiting docs", path: "/hr" },
  { color: "amber", badge: "Expiring Soon", title: "First Aid Cert", meta: "David Kim", date: "Expires 2026-06-01", path: "/hr" },
];

// Static clinical/operational alerts (live AppNotification data supplements this)
const CLINICAL_ALERTS = [
  { color: "red", badge: "Missed", title: "⚠️ eMAR — Lorazepam", meta: "Michael Anderson · James W.", time: "32 min ago", path: "/emar" },
  { color: "amber", badge: "Unsigned", title: "Goal docs overdue", meta: "Lisa Torres · Maria J.", time: "2 hr 15 min ago", path: "/goals" },
  { color: "blue", badge: "Pending Review", title: "Incident report", meta: "James Williams · 3/21", time: "Awaiting supervisor", path: "/incidents" },
  { color: "amber", badge: "No staff", title: "Unassigned visit", meta: "David Park · 1:00 PM Respite", time: "Today", path: "/schedule" },
];

export default function AdminDashboard({ user }) {
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => base44.entities.StaffMember.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.IncidentReport.list("-created_date", 20) });
  const { data: compliance = [] } = useQuery({ queryKey: ["compliance"], queryFn: () => base44.entities.ComplianceDocument.list() });
  const { data: timecards = [] } = useQuery({ queryKey: ["timecards-pending"], queryFn: () => base44.entities.Timecard.filter({ status: "Pending" }) });

  const now = new Date();
  const monthLabel = format(now, "MMMM yyyy");

  const activeClients = clients.filter(c => c.status === "Active").length;
  const openIncidents = incidents.filter(i => i.status === "Open" || i.status === "Under Review").length;
  const expiringDocs = compliance.filter(d => d.status === "Expiring Soon" || d.status === "Expired").length;
  const pendingTimecards = timecards.length;

  const firstName = user?.full_name?.split(" ")[0] || "there";
  const today = format(now, "EEEE, MMMM d, yyyy");
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const totalAlerts = COMPLIANCE_ALERTS.length + CLINICAL_ALERTS.length;

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Greeting */}
      <div className="pl-14 sm:pl-0">
        <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{greeting}, {firstName}</h1>
        <p className="text-muted-foreground text-sm mt-1 truncate">
          {today} ·{" "}
          <span className="text-destructive font-medium">{totalAlerts} items need your attention</span>
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Active clients" value={activeClients || 24} sub="2 new this month" icon={Heart} />
        <StatCard label="Staff on shift today" value={11} sub="of 18 scheduled" icon={Users} />
        <StatCard
          label="Open incidents"
          value={openIncidents || 3}
          sub="1 requires report"
          subColor="text-destructive"
          iconColor="text-destructive"
          icon={AlertTriangle}
        />
        <StatCard
          label="Compliance alerts"
          value={expiringDocs || 5}
          sub="2 expiring this week"
          subColor="text-amber-600"
          iconColor="text-amber-500"
          icon={Shield}
        />
      </div>

      {/* Split Alerts Panel */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* LEFT: Compliance & HR Alerts */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold">Compliance & HR Alerts</CardTitle>
            </div>
            <Link to="/compliance">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 shrink-0">
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-1 pt-1">
            {COMPLIANCE_ALERTS.slice(0, 5).map((a, i) => (
              <Link to={a.path} key={i}>
                <div className="flex items-start gap-2 py-2 min-h-[44px] border-b border-border last:border-0 hover:bg-muted/40 rounded-md px-1 -mx-1 transition-colors cursor-pointer">
                  <div className="pt-0.5 shrink-0"><Pill color={a.color} label={a.badge} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.meta}</p>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${a.color === "red" ? "text-destructive" : a.color === "amber" ? "text-amber-600" : "text-blue-600"}`}>
                    {a.date}
                  </span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* RIGHT: Clinical & Operational Alerts */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-500" />
              <CardTitle className="text-sm font-semibold">Clinical & Operational Alerts</CardTitle>
            </div>
            <Link to="/incidents">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 shrink-0">
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-1 pt-1">
            {CLINICAL_ALERTS.slice(0, 5).map((a, i) => (
              <Link to={a.path} key={i}>
                <div className="flex items-start gap-2 py-2 min-h-[44px] border-b border-border last:border-0 hover:bg-muted/40 rounded-md px-1 -mx-1 transition-colors cursor-pointer">
                  <div className="pt-0.5 shrink-0"><Pill color={a.color} label={a.badge} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.meta}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Quick actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.path} to={a.path}>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-11 md:h-9">{a.label}</Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's visits + Billing snapshot */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Today's visits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {VISITS.map((v, i) => (
              <div key={i} className="flex items-center gap-2 py-2 min-h-[44px] border-b border-border last:border-0">
                <span className="text-xs font-mono text-muted-foreground w-14 flex-shrink-0">{v.time}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.client}</p>
                  <p className="text-xs text-muted-foreground truncate">{v.staff} · {v.service}</p>
                </div>
                <Pill color={v.statusColor} label={v.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Billing snapshot — {monthLabel}</CardTitle>
            <Link to="/finance">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 shrink-0">
                View <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { label: "Billed this month", value: "$18,420", color: "text-foreground", path: null },
              { label: "Pending claims", value: "$4,210", color: "text-amber-600", path: null },
              { label: "Paid / remitted", value: "$14,210", color: "text-green-600", path: null },
              { label: "Timecards pending approval", value: pendingTimecards || 7, color: "text-destructive", path: "/timecards" },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2 min-h-[44px] border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                {row.path ? (
                  <Link to={row.path}>
                    <span className={`text-sm font-bold ${row.color} hover:underline cursor-pointer`}>{row.value}</span>
                  </Link>
                ) : (
                  <span className={`text-sm font-bold ${row.color}`}>{row.value}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}