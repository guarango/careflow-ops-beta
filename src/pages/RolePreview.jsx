import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import {
  LayoutDashboard, Users, Heart, FileText, AlertTriangle,
  Pill, Clock, Shield, DollarSign, Target, CalendarDays, Tag, UserCog,
  TrendingUp, Check, X, Lock, Briefcase, Info, UserSearch, ShieldAlert
} from "lucide-react";
import { NAV_ACCESS, CAN, getRoleLabel, getRoleBadgeColor } from "@/lib/permissions";
import { useRole } from "@/hooks/useRole";
import { useImpersonation } from "@/lib/ImpersonationContext";
import UserPickerDialog from "@/components/shared/UserPickerDialog";

const ALL_NAV = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Staff", icon: Users, path: "/staff" },
  { label: "Clients", icon: Heart, path: "/clients" },
  { label: "Schedule", icon: CalendarDays, path: "/schedule" },
  { label: "Client Goals", icon: Target, path: "/goals" },
  { label: "Session Notes", icon: FileText, path: "/session-notes" },
  { label: "Incidents", icon: AlertTriangle, path: "/incidents" },
  { label: "eMAR", icon: Pill, path: "/emar" },
  { label: "Timecards", icon: Clock, path: "/timecards" },
  { label: "Compliance", icon: Shield, path: "/compliance" },
  { label: "Finance", icon: DollarSign, path: "/finance" },
  { label: "HR & Compliance", icon: Briefcase, path: "/hr" },
  { label: "User Management", icon: UserCog, path: "/users" },
];

const FEATURE_LABELS = {
  approveTimecards:     "Approve Timecards",
  viewAllTimecards:     "View All Timecards",
  approveSessionNotes:  "Approve Session Notes",
  editStaff:            "Edit Staff Records (HR bundle)",
  changeIncidentStatus: "Change Incident Status",
  viewAllIncidents:     "View All Incidents",
  editClients:          "Edit Client Records",
  accessBilling:        "Access Billing (Billing bundle)",
  editServiceCodes:     "Edit Service Codes (Billing bundle)",
  manageUsers:          "Manage Users",
  editGoals:            "Edit Goals",
  viewIncidentBadge:    "View Incident Badge",
  manageTraining:       "Manage Training",
  viewAllStaff:         "View All Staff",
  accessSettings:       "Access Settings",
  exportPayroll:        "Export Payroll (Billing bundle)",
  lockPayPeriod:        "Lock Pay Period",
  unlockTimecard:       "Unlock Timecard",
  loginAs:              "Login As (Super Admin only)",
};

const ROLES = ["dsp", "manager", "admin", "super_admin"];

const ROLE_HEADER_COLORS = {
  dsp:         "bg-blue-500 text-white",
  manager:     "bg-violet-500 text-white",
  admin:       "bg-primary text-primary-foreground",
  super_admin: "bg-destructive text-white",
};

const ROLE_DESCRIPTIONS = {
  dsp:         "Sees only assigned clients. Clocks in/out, writes session notes, charts goals, passes meds, files incidents, views own schedule, timecard, and trainings. No admin access.",
  manager:     "Oversees assigned clients and houses. Approves notes and timecards, reviews incidents, builds schedules, verifies trainings for their team. No billing, rates, or agency settings.",
  admin:       "Full agency access. HR and Billing areas need the matching bundle.",
  super_admin: "Platform owner; all agencies; Login As.",
};

function MockSidebar({ role, bundles }) {
  const visibleNav = ALL_NAV.filter(item => {
    const allowed = NAV_ACCESS[item.path];
    if (!allowed) return role === "admin" || role === "super_admin";
    if (!allowed.includes(role)) return false;
    // Check bundle requirements for /hr and /finance
    if (item.path === "/hr" && role === "admin") return bundles.hr;
    if (item.path === "/finance" && role === "admin") return bundles.billing;
    return true;
  });
  const hiddenNav = ALL_NAV.filter(item => !visibleNav.includes(item));

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Visible ({visibleNav.length})</p>
        <div className="space-y-1">
          {visibleNav.map(item => (
            <div key={item.path} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-50 border border-green-100 text-sm">
              <item.icon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              <span>{item.label}</span>
              <Check className="w-3 h-3 text-green-600 ml-auto" />
            </div>
          ))}
        </div>
      </div>
      {hiddenNav.length > 0 && (
        <div className="flex-1">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Hidden ({hiddenNav.length})</p>
          <div className="space-y-1">
            {hiddenNav.map(item => (
              <div key={item.path} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50/60 border border-red-100 text-sm text-muted-foreground">
                <Lock className="w-3.5 h-3.5 flex-shrink-0 text-red-300" />
                <span className="line-through">{item.label}</span>
                <X className="w-3 h-3 text-red-400 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureMatrix({ role, bundles }) {
  return (
    <div className="space-y-1.5">
      {Object.entries(FEATURE_LABELS).map(([key, label]) => {
        const hasAccess = (() => {
          const allowed = CAN[key];
          if (!allowed) return false;
          if (!allowed.includes(role)) return false;
          // Check bundle requirements
          if (key === "editStaff" && role === "admin") return bundles.hr;
          if ((key === "accessBilling" || key === "editServiceCodes" || key === "exportPayroll") && role === "admin") return bundles.billing;
          return true;
        })();
        return (
          <div key={key} className={`flex items-center justify-between px-3 py-2 rounded-md text-sm border ${hasAccess ? "bg-green-50 border-green-100" : "bg-red-50/40 border-red-100"}`}>
            <span className={hasAccess ? "text-foreground" : "text-muted-foreground"}>{label}</span>
            {hasAccess
              ? <span className="flex items-center gap-1 text-xs text-green-700 font-medium"><Check className="w-3.5 h-3.5" />Allowed</span>
              : <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><Lock className="w-3.5 h-3.5" />Restricted</span>
            }
          </div>
        );
      })}
    </div>
  );
}

function RoleCard({ role }) {
  const bundles = role === "admin" ? { hr: true, billing: true } : { hr: false, billing: false };
  return (
    <Card className="overflow-hidden">
      <div className={`px-5 py-4 ${ROLE_HEADER_COLORS[role]}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{getRoleLabel(role)}</h2>
            <p className="text-xs opacity-80 mt-0.5">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">{getRoleLabel(role)}</Badge>
        </div>
      </div>
      <CardContent className="p-5 space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Navigation Access</h3>
          <MockSidebar role={role} bundles={bundles} />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">Feature Permissions</h3>
          <FeatureMatrix role={role} bundles={bundles} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function RolePreview() {
  const [compareMode, setCompareMode] = useState("side-by-side");
  const { isSuperAdmin } = useRole();
  const { impersonation, returnToSelf } = useImpersonation();
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Role Preview"
        subtitle="Permission model for DSP, Manager, Admin, and Super Admin"
        action={
          <div className="flex gap-2">
            {isSuperAdmin && !impersonation && (
              <Button variant="outline" size="sm" onClick={() => setUserPickerOpen(true)}>
                <UserSearch className="w-4 h-4 mr-2" />
                View as User
              </Button>
            )}
            <Button variant={compareMode === "side-by-side" ? "default" : "outline"} size="sm" onClick={() => setCompareMode("side-by-side")}>Side by Side</Button>
            <Button variant={compareMode === "tabs" ? "default" : "outline"} size="sm" onClick={() => setCompareMode("tabs")}>Tabbed</Button>
          </div>
        }
      />

      {impersonation && (
        <Card className="mb-6 border-orange-500/30 bg-orange-500/5">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">
                  Currently viewing as {impersonation.targetUser?.full_name || impersonation.targetUser?.email} ({getRoleLabel(impersonation.targetUser?.role)})
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reason: {impersonation.reason} · Read-only mode · 30-minute timeout
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => returnToSelf()}>Return to my account</Button>
          </CardContent>
        </Card>
      )}

      {isSuperAdmin && !impersonation && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserSearch className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">View as a specific user</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick any user to see exactly what they see — read-only, 30-minute timeout, fully audited.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => setUserPickerOpen(true)}>
              <UserSearch className="w-4 h-4 mr-2" />
              Select User
            </Button>
          </CardContent>
        </Card>
      )}

      {userPickerOpen && (
        <UserPickerDialog open={userPickerOpen} onClose={() => setUserPickerOpen(false)} />
      )}

      {/* Bundle note */}
      <div className="mb-6 p-4 bg-muted rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong>Bundles:</strong> Admin cards below show full access (both bundles enabled). An Admin without the HR or Billing bundle cannot open those areas.
        </p>
      </div>

      {/* Full comparison matrix */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Full Permissions Matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Feature / Page</th>
                {ROLES.map(role => (
                  <th key={role} className="text-center px-6 py-2.5 font-medium">
                    <Badge variant="outline" className={getRoleBadgeColor(role)}>{getRoleLabel(role)}</Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-muted/20 border-t">
                <td className="px-4 py-2 font-semibold text-xs text-muted-foreground uppercase tracking-wider" colSpan={5}>Navigation Pages</td>
              </tr>
              {ALL_NAV.map(item => (
                <tr key={item.path} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      {item.label}
                    </div>
                  </td>
                  {ROLES.map(role => {
                    const allowed = NAV_ACCESS[item.path];
                    let hasAccess = allowed ? allowed.includes(role) : (role === "admin" || role === "super_admin");
                    if (hasAccess && item.path === "/hr" && role === "admin") hasAccess = true; // shown with bundle in card
                    if (hasAccess && item.path === "/finance" && role === "admin") hasAccess = true;
                    return (
                      <td key={role} className="px-4 py-2 text-center">
                        {hasAccess
                          ? <Check className="w-4 h-4 text-green-600 mx-auto" />
                          : <X className="w-4 h-4 text-red-400 mx-auto" />
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-muted/20 border-t-2">
                <td className="px-4 py-2 font-semibold text-xs text-muted-foreground uppercase tracking-wider" colSpan={5}>Feature Permissions</td>
              </tr>
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <tr key={key} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2 text-muted-foreground">{label}</td>
                  {ROLES.map(role => {
                    const allowed = CAN[key];
                    const hasAccess = allowed ? allowed.includes(role) : false;
                    return (
                      <td key={role} className="px-4 py-2 text-center">
                        {hasAccess
                          ? <Check className="w-4 h-4 text-green-600 mx-auto" />
                          : <X className="w-4 h-4 text-red-400 mx-auto" />
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {compareMode === "side-by-side" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {ROLES.map(role => <RoleCard key={role} role={role} />)}
        </div>
      ) : (
        <Tabs defaultValue="dsp">
          <TabsList>
            {ROLES.map(role => <TabsTrigger key={role} value={role}>{getRoleLabel(role)}</TabsTrigger>)}
          </TabsList>
          {ROLES.map(role => <TabsContent key={role} value={role}><RoleCard role={role} /></TabsContent>)}
        </Tabs>
      )}
    </div>
  );
}