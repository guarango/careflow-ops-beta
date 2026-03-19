import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Users, Heart, AlertTriangle, Pill, Clock, Shield, DollarSign,
  FileText, ArrowRight, TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => base44.entities.IncidentReport.list("-created_date", 5),
  });

  const { data: compliance = [] } = useQuery({
    queryKey: ["compliance"],
    queryFn: () => base44.entities.ComplianceDocument.list(),
  });

  const { data: timecards = [] } = useQuery({
    queryKey: ["timecards"],
    queryFn: () => base44.entities.Timecard.list("-created_date", 10),
  });

  const activeStaff = staff.filter(s => s.status === "Active").length;
  const activeClients = clients.filter(c => c.status === "Active").length;
  const openIncidents = incidents.filter(i => i.status === "Open" || i.status === "Under Review").length;
  const expiringDocs = compliance.filter(d => d.status === "Expiring Soon" || d.status === "Expired").length;
  const pendingTimecards = timecards.filter(t => t.status === "Pending").length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Overview for ${format(new Date(), "EEEE, MMMM d, yyyy")}`}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Staff" value={activeStaff} icon={Users} />
        <StatCard label="Active Clients" value={activeClients} icon={Heart} />
        <StatCard label="Open Incidents" value={openIncidents} icon={AlertTriangle} />
        <StatCard label="Compliance Alerts" value={expiringDocs} icon={Shield} />
      </div>

      {/* Quick actions + alerts */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "New Session Note", icon: FileText, path: "/session-notes" },
              { label: "Log Incident", icon: AlertTriangle, path: "/incidents" },
              { label: "eMAR Entry", icon: Pill, path: "/emar" },
              { label: "Clock In/Out", icon: Clock, path: "/timecards" },
              { label: "View Billing", icon: DollarSign, path: "/billing" },
            ].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Incidents</CardTitle>
            <Link to="/incidents">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No incidents reported</p>
            ) : (
              <div className="space-y-3">
                {incidents.slice(0, 5).map((incident) => (
                  <div key={incident.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{incident.client_name || "Unknown Client"}</span>
                        <StatusBadge status={incident.severity} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{incident.type} — {incident.date}</p>
                    </div>
                    <StatusBadge status={incident.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Timecards + Compliance */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Pending Timecards ({pendingTimecards})</CardTitle>
            <Link to="/timecards">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {timecards.filter(t => t.status === "Pending").length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No pending timecards</p>
            ) : (
              <div className="space-y-3">
                {timecards.filter(t => t.status === "Pending").slice(0, 5).map((tc) => (
                  <div key={tc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{tc.staff_name || "Staff"}</p>
                      <p className="text-xs text-muted-foreground">{tc.date} • {tc.clock_in} - {tc.clock_out || "Active"}</p>
                    </div>
                    <span className="text-sm font-semibold">{tc.total_hours ? `${tc.total_hours}h` : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Compliance Alerts</CardTitle>
            <Link to="/compliance">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {compliance.filter(d => d.status === "Expiring Soon" || d.status === "Expired").length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">All documents are current</p>
            ) : (
              <div className="space-y-3">
                {compliance.filter(d => d.status === "Expiring Soon" || d.status === "Expired").slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.category} • Expires: {doc.expiry_date || "N/A"}</p>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}