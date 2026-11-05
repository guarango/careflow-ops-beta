import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Heart, Users, AlertTriangle, Shield, ArrowRight, ShieldAlert, Activity,
} from "lucide-react";
import { todayISO } from "@/lib/dateUtils";
import { useRole } from "@/hooks/useRole";
import TodayVisitsCard from "./TodayVisitsCard";
import BillingSnapshotCard from "./BillingSnapshotCard";
import AlertListCard from "./AlertListCard";

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

const QUICK_ACTIONS = [
  { label: "+ Add client", path: "/clients" },
  { label: "+ Add staff", path: "/staff" },
  { label: "Log incident", path: "/incidents" },
  { label: "Review timecards", path: "/timecards" },
  { label: "Billing overview", path: "/finance" },
  { label: "Compliance docs", path: "/compliance" },
];

export default function AdminDashboard({ user }) {
  const { canAccessPath } = useRole();
  const quickActions = QUICK_ACTIONS.filter((a) => canAccessPath(a.path));
  const today = todayISO();
  const monthStart = `${today.slice(0, 7)}-01`;

  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => base44.entities.StaffMember.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.IncidentReport.list("-created_date", 100) });
  const { data: agencyDocs = [] } = useQuery({ queryKey: ["compliance"], queryFn: () => base44.entities.ComplianceDocument.list() });
  const { data: staffDocs = [] } = useQuery({ queryKey: ["staff-compliance-docs-dash"], queryFn: () => base44.entities.StaffComplianceDocument.list() });
  const { data: pendingTimecards = 0 } = useQuery({
    queryKey: ["timecards-pending-count"],
    queryFn: () => base44.entities.Timecard.count({ status: "Pending" }),
  });
  const { data: todayShifts = [] } = useQuery({
    queryKey: ["dashboard-shifts-today", today],
    queryFn: () => base44.entities.ShiftSchedule.filter({ date: today }),
  });
  const { data: claims = [] } = useQuery({
    queryKey: ["dashboard-claims", monthStart],
    queryFn: () => base44.entities.Claim.filter({ service_date: { $gte: monthStart } }),
  });
  const { data: billingRecords = [] } = useQuery({
    queryKey: ["dashboard-billing-records", monthStart],
    queryFn: () => base44.entities.BillingRecord.filter({ date: { $gte: monthStart } }),
  });
  const { data: missedMeds = [] } = useQuery({
    queryKey: ["dashboard-missed-meds", today],
    queryFn: () => base44.entities.MedicationLog.filter({ status: "Missed" }),
  });

  const now = new Date();
  const monthLabel = format(now, "MMMM yyyy");
  const firstName = user?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const todayLabel = format(now, "EEEE, MMMM d, yyyy");
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const activeClients = clients.filter((c) => c.status === "Active").length;
  const openIncidents = incidents.filter((i) => i.status === "Open" || i.status === "Under Review");
  const scheduledToday = todayShifts.length;
  const staffOnShift = todayShifts.filter((s) => !!s.staff_id).length;

  // ─── Compliance & HR alerts (agency files + staff files) ────────────────
  const farFuture = (d) => { try { return differenceInCalendarDays(parseISO(d), now); } catch { return 9999; } };
  const complianceAlerts = [
    ...agencyDocs
      .filter((d) => d.status === "Expired" || d.status === "Expiring Soon")
      .map((d) => ({
        color: d.status === "Expired" ? "red" : "amber",
        badge: d.status,
        title: d.title || "Agency document",
        meta: d.category || "Agency file",
        right: d.expiry_date || "No expiry",
        path: "/compliance",
      })),
    ...staffDocs
      .filter((d) => {
        if (!d.expiration_date) return false;
        const days = farFuture(d.expiration_date);
        return days <= 60;
      })
      .map((d) => {
        const days = farFuture(d.expiration_date);
        return {
          color: days < 0 ? "red" : "amber",
          badge: days < 0 ? "Expired" : "Expiring Soon",
          title: d.document_type || "Staff document",
          meta: d.staff_name || "Staff file",
          right: d.expiration_date,
          path: "/compliance",
        };
      }),
  ];
  const expiredDocCount = complianceAlerts.filter((a) => a.color === "red").length;

  // ─── Clinical & operational alerts ──────────────────────────────────────
  const unassignedVisits = todayShifts.filter((s) => !s.staff_id);
  const clinicalAlerts = [
    ...missedMeds.slice(0, 5).map((m) => ({
      color: "red",
      badge: "Missed",
      title: "Med pass not documented",
      meta: `${m.client_name || "Client"} · ${m.date || ""}`,
      right: m.review_status === "pending_review" ? "Awaiting review" : "Needs review",
      path: "/emar",
    })),
    ...openIncidents.slice(0, 5).map((i) => ({
      color: i.severity === "Critical" || i.severity === "High" ? "red" : "blue",
      badge: i.status === "Open" ? "Open" : "Under Review",
      title: `Incident — ${i.type || "Report"}`,
      meta: i.client_name || i.staff_name || "Agency",
      right: i.date || "",
      path: "/incidents",
    })),
    ...unassignedVisits.map((s) => ({
      color: "amber",
      badge: "No staff",
      title: "Unassigned visit",
      meta: `${s.client_name || "Client"} · ${s.start_time || ""} ${s.service_type || ""}`.trim(),
      right: "Today",
      path: "/schedule",
    })),
  ];

  const totalAlerts = complianceAlerts.length + clinicalAlerts.length;
  const visitsToday = [...todayShifts].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Greeting */}
      <div className="pl-14 sm:pl-0">
        <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{greeting}, {firstName}</h1>
        <p className="text-muted-foreground text-sm mt-1 truncate">
          {todayLabel} ·{" "}
          {totalAlerts > 0 ? (
            <span className="text-destructive font-medium">{totalAlerts} items need your attention</span>
          ) : (
            <span className="text-green-600 font-medium">Nothing needs your attention</span>
          )}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Active clients"
          value={activeClients}
          sub={`${clients.length} client record${clients.length === 1 ? "" : "s"} total`}
          icon={Heart}
        />
        <StatCard
          label="Staff on shift today"
          value={staffOnShift}
          sub={scheduledToday > 0 ? `of ${scheduledToday} scheduled` : "No shifts scheduled"}
          icon={Users}
        />
        <StatCard
          label="Open incidents"
          value={openIncidents.length}
          sub={openIncidents.length > 0 ? "Open or under review" : "No open incidents"}
          subColor={openIncidents.length > 0 ? "text-destructive" : "text-muted-foreground"}
          iconColor={openIncidents.length > 0 ? "text-destructive" : "text-primary"}
          icon={AlertTriangle}
        />
        <StatCard
          label="Compliance alerts"
          value={complianceAlerts.length}
          sub={expiredDocCount > 0 ? `${expiredDocCount} expired` : complianceAlerts.length > 0 ? "Expiring soon" : "All current"}
          subColor={expiredDocCount > 0 ? "text-destructive" : complianceAlerts.length > 0 ? "text-amber-600" : "text-muted-foreground"}
          iconColor={complianceAlerts.length > 0 ? "text-amber-500" : "text-primary"}
          icon={Shield}
        />
      </div>

      {/* Split Alerts Panel */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <AlertListCard
          title="Compliance & HR Alerts"
          icon={ShieldAlert}
          iconColor="text-amber-500"
          viewAllPath="/compliance"
          alerts={complianceAlerts.slice(0, 5)}
          emptyMessage="All agency and staff files are current."
        />
        <AlertListCard
          title="Clinical & Operational Alerts"
          icon={Activity}
          iconColor="text-red-500"
          viewAllPath="/incidents"
          alerts={clinicalAlerts.slice(0, 5)}
          emptyMessage="No clinical or scheduling alerts today."
        />
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Quick actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {quickActions.map((a) => (
              <Link key={a.path} to={a.path}>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-11 md:h-9">{a.label}</Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's visits + Billing snapshot */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        <TodayVisitsCard shifts={visitsToday} />
        <BillingSnapshotCard
          monthLabel={monthLabel}
          monthStart={monthStart}
          claims={claims}
          billingRecords={billingRecords}
          pendingTimecards={pendingTimecards}
        />
      </div>
    </div>
  );
}