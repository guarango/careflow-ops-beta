import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Heart, FileText, AlertTriangle,
  Pill, Clock, Shield, DollarSign, Target, CalendarDays, UserCog,
  Check, X, Briefcase, Info, RotateCcw, Brain, ClipboardList,
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
  { label: "Behavior Support Plans", icon: Brain, path: "/bsp" },
  { label: "Monthly & Quarterly Summaries", icon: ClipboardList, path: "/summaries/monthly", paths: ["/summaries/monthly", "/summaries/quarterly"] },
  { label: "eMAR", icon: Pill, path: "/emar" },
  { label: "Timecards", icon: Clock, path: "/timecards" },
  { label: "Compliance", icon: Shield, path: "/compliance" },
  { label: "Finance", icon: DollarSign, path: "/finance" },
  { label: "HR & Compliance", icon: Briefcase, path: "/hr" },
  { label: "User Management", icon: UserCog, path: "/users" },
];

const FEATURE_CATEGORIES = [
  {
    title: "People & Records",
    icon: Users,
    description: "Staff and client records",
    items: [
      ["viewAllStaff", "View All Staff"],
      ["createStaff", "Add Staff Records (HR bundle)"],
      ["editStaff", "Edit Staff Records (HR bundle)"],
      ["deleteStaff", "Delete Staff Records (HR bundle)"],
      ["createClient", "Add Client Records"],
      ["editClients", "Edit Client Records"],
      ["deleteClient", "Delete Client Records"],
    ],
  },
  {
    title: "Clinical & Documentation",
    icon: FileText,
    description: "Notes, goals, incidents, and training",
    items: [
      ["approveSessionNotes", "Approve Session Notes"],
      ["editGoals", "Edit Goals"],
      ["viewAllIncidents", "View All Incidents"],
      ["changeIncidentStatus", "Change Incident Status"],
      ["viewIncidentBadge", "View Incident Badge"],
      ["manageTraining", "Manage Training"],
    ],
  },
  {
    title: "Time & Payroll",
    icon: Clock,
    description: "Timecard review and pay periods",
    items: [
      ["viewAllTimecards", "View All Timecards"],
      ["approveTimecards", "Approve Timecards"],
      ["exportPayroll", "Export Payroll (Billing bundle)"],
      ["lockPayPeriod", "Lock Pay Period"],
      ["unlockTimecard", "Unlock Timecard"],
    ],
  },
  {
    title: "Billing & Finance",
    icon: DollarSign,
    description: "Claims, rates, and billing access",
    items: [
      ["accessBilling", "Access Billing (Billing bundle)"],
      ["editServiceCodes", "Edit Service Codes (Billing bundle)"],
    ],
  },
  {
    title: "Administration & Access",
    icon: Shield,
    description: "Users, settings, and impersonation",
    items: [
      ["createUser", "Invite / Add Users"],
      ["editUser", "Edit Users & Roles"],
      ["deleteUser", "Delete Users"],
      ["accessSettings", "Access Settings"],
      ["loginAs", "Login As (Super Admin only)"],
    ],
  },
];

const ROLES = ["dsp", "manager", "admin", "super_admin"];

/**
 * Role permissions matrix, hosted inside Settings & Admin.
 * Editable only by Super Admin; other admins get a read-only view.
 */
export default function RolePermissionsPanel() {
  const { isSuperAdmin } = useRole();
  const { matrix, togglePermission, toggleNavPaths, resetToDefaults, saving } = usePermissions();

  const navAccess = matrix.navAccess;
  const canMap = matrix.can;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Role Permissions</h2>
          <p className="text-sm text-muted-foreground">Permission model for DSP, Manager, Admin, and Super Admin</p>
        </div>
        {isSuperAdmin && (
          <Button variant="outline" size="sm" onClick={() => resetToDefaults()} disabled={saving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        )}
      </div>

      <div className="p-4 bg-muted rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong>Bundles:</strong> Admin access to HR and Billing areas requires the matching bundle. An Admin without the HR or Billing bundle cannot open those areas.
          {isSuperAdmin && " Click any checkmark or X below to toggle access for that role."}
        </p>
      </div>

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
              {ALL_NAV.map(item => {
                const paths = item.paths || [item.path];
                return (
                  <tr key={item.path} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                        {item.label}
                      </div>
                    </td>
                    {ROLES.map(role => {
                      const hasAccess = paths.every(p => {
                        const allowed = navAccess[p];
                        return allowed ? allowed.includes(role) : (role === "admin" || role === "super_admin");
                      });
                      return (
                        <td key={role} className="px-4 py-2 text-center">
                          <PermissionToggle
                            hasAccess={hasAccess}
                            editable={isSuperAdmin}
                            onClick={() => isSuperAdmin && toggleNavPaths(paths, role)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {FEATURE_CATEGORIES.map(category => (
                <React.Fragment key={category.title}>
                  <tr className="bg-muted/20 border-t-2">
                    <td className="px-4 py-2" colSpan={5}>
                      <div className="flex items-center gap-2">
                        <category.icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                          {category.title}
                        </span>
                        <span className="text-xs text-muted-foreground/70 normal-case tracking-normal">
                          — {category.description}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {category.items.map(([key, label]) => (
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
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

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
        hasAccess ? "text-green-600 hover:bg-green-100" : "text-red-400 hover:bg-red-100"
      }`}
    >
      {hasAccess ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
    </button>
  );
}