import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import {
  LayoutDashboard, Users, Heart, FileText, AlertTriangle,
  Pill, Clock, Shield, DollarSign, Target, CalendarDays, UserCog,
  Check, X, Briefcase, Info, RotateCcw, Lock,
} from "lucide-react";
import { getRoleLabel, getRoleBadgeColor } from "@/lib/permissions";
import { useRole } from "@/hooks/useRole";
import { usePermissions } from "@/lib/PermissionsContext";

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

export default function RolePreview() {
  const { isSuperAdmin } = useRole();
  const { matrix, togglePermission, resetToDefaults, saving } = usePermissions();

  const navAccess = matrix.navAccess;
  const canMap = matrix.can;

  return (
    <div>
      <PageHeader
        title="Role Permissions"
        subtitle="Permission model for DSP, Manager, Admin, and Super Admin"
        action={
          isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetToDefaults()}
              disabled={saving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          )
        }
      />

      {/* Bundle note */}
      <div className="mb-6 p-4 bg-muted rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong>Bundles:</strong> Admin access to HR and Billing areas requires the matching bundle. An Admin without the HR or Billing bundle cannot open those areas.
          {isSuperAdmin && " Click any checkmark or X below to toggle access for that role."}
        </p>
      </div>

      {/* Full permissions matrix */}
      <Card>
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
                    const allowed = navAccess[item.path];
                    let hasAccess = allowed ? allowed.includes(role) : (role === "admin" || role === "super_admin");
                    return (
                      <td key={role} className="px-4 py-2 text-center">
                        <PermissionToggle
                          hasAccess={hasAccess}
                          editable={isSuperAdmin}
                          onClick={() => isSuperAdmin && togglePermission("nav", item.path, role)}
                        />
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
                    const allowed = canMap[key];
                    const hasAccess = allowed ? allowed.includes(role) : false;
                    return (
                      <td key={role} className="px-4 py-2 text-center">
                        <PermissionToggle
                          hasAccess={hasAccess}
                          editable={isSuperAdmin}
                          onClick={() => isSuperAdmin && togglePermission("can", key, role)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Clickable checkmark / X toggle. Only interactive when `editable` is true (Super Admin).
 */
function PermissionToggle({ hasAccess, editable, onClick }) {
  if (!editable) {
    return hasAccess
      ? <Check className="w-4 h-4 text-green-600 mx-auto" />
      : <X className="w-4 h-4 text-red-400 mx-auto" />;
  }
  return (
    <button
      onClick={onClick}
      title={hasAccess ? "Click to revoke" : "Click to grant"}
      className={`mx-auto p-1 rounded-md transition-colors hover:scale-110 ${
        hasAccess
          ? "text-green-600 hover:bg-green-100"
          : "text-red-400 hover:bg-red-100"
      }`}
    >
      {hasAccess
        ? <Check className="w-4 h-4" />
        : <X className="w-4 h-4" />
      }
    </button>
  );
}