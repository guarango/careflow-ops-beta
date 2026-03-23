import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import {
  LayoutDashboard, Users, Heart, FileText, AlertTriangle,
  Pill, Clock, Shield, DollarSign, Target, CalendarDays, Tag, UserCog,
  TrendingUp, Check, X, Lock
} from "lucide-react";
import { NAV_ACCESS, CAN, getRoleLabel, getRoleBadgeColor } from "@/lib/permissions";

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
  { label: "Service Codes", icon: Tag, path: "/service-codes" },
  { label: "Payroll", icon: TrendingUp, path: "/payroll" },
  { label: "Billing", icon: DollarSign, path: "/billing" },
  { label: "User Management", icon: UserCog, path: "/users" },
];

const FEATURE_LABELS = {
  approveTimecards:     "Approve Timecards",
  viewAllTimecards:     "View All Timecards",
  approveSessionNotes:  "Approve Session Notes",
  editStaff:            "Edit Staff Records",
  changeIncidentStatus: "Change Incident Status",
  viewAllIncidents:     "View All Incidents",
  editClients:          "Edit Client Records",
  accessBilling:        "Access Billing",
  editServiceCodes:     "Edit Service Codes",
  manageUsers:          "Manage Users",
  editGoals:            "Edit Goals",
};

const ROLE_HEADER_COLORS = {
  admin: "bg-primary text-primary-foreground",
  hr:    "bg-violet-600 text-white",
  dsp:   "bg-blue-500 text-white",
};

const ROLE_DESCRIPTIONS = {
  admin: "Full access to all features and data",
  hr:    "Dashboard, Staff, Schedule, Timecards, Compliance only",
  dsp:   "Dashboard, own Clients, Schedule, Notes, eMAR, Timecards only",
};

function MockSidebar({ role }) {
  const visibleNav = ALL_NAV.filter(item => {
    const allowed = NAV_ACCESS[item.path];
    return allowed ? allowed.includes(role) : role === "admin";
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

function FeatureMatrix({ role }) {
  return (
    <div className="space-y-1.5">
      {Object.entries(FEATURE_LABELS).map(([key, label]) => {
        const hasAccess = (CAN[key] || []).includes(role);
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
          <MockSidebar role={role} />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">Feature Permissions</h3>
          <FeatureMatrix role={role} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function RolePreview() {
  const [compareMode, setCompareMode] = useState("side-by-side");

  return (
    <div>
      <PageHeader
        title="Role Preview"
        subtitle="Exact permissions enforced for each role throughout the app"
        action={
          <div className="flex gap-2">
            <Button variant={compareMode === "side-by-side" ? "default" : "outline"} size="sm" onClick={() => setCompareMode("side-by-side")}>Side by Side</Button>
            <Button variant={compareMode === "tabs" ? "default" : "outline"} size="sm" onClick={() => setCompareMode("tabs")}>Tabbed</Button>
          </div>
        }
      />

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
                {["admin", "hr", "dsp"].map(role => (
                  <th key={role} className="text-center px-6 py-2.5 font-medium">
                    <Badge variant="outline" className={getRoleBadgeColor(role)}>{getRoleLabel(role)}</Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-muted/20 border-t">
                <td className="px-4 py-2 font-semibold text-xs text-muted-foreground uppercase tracking-wider" colSpan={4}>Navigation Pages</td>
              </tr>
              {ALL_NAV.map(item => (
                <tr key={item.path} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      {item.label}
                    </div>
                  </td>
                  {["admin", "hr", "dsp"].map(role => {
                    const allowed = NAV_ACCESS[item.path];
                    const hasAccess = allowed ? allowed.includes(role) : role === "admin";
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
                <td className="px-4 py-2 font-semibold text-xs text-muted-foreground uppercase tracking-wider" colSpan={4}>Feature Permissions</td>
              </tr>
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <tr key={key} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2 text-muted-foreground">{label}</td>
                  {["admin", "hr", "dsp"].map(role => {
                    const hasAccess = (CAN[key] || []).includes(role);
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RoleCard role="admin" />
          <RoleCard role="hr" />
          <RoleCard role="dsp" />
        </div>
      ) : (
        <Tabs defaultValue="admin">
          <TabsList>
            <TabsTrigger value="admin">Admin</TabsTrigger>
            <TabsTrigger value="hr">HR Manager</TabsTrigger>
            <TabsTrigger value="dsp">DSP</TabsTrigger>
          </TabsList>
          <TabsContent value="admin"><RoleCard role="admin" /></TabsContent>
          <TabsContent value="hr"><RoleCard role="hr" /></TabsContent>
          <TabsContent value="dsp"><RoleCard role="dsp" /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}