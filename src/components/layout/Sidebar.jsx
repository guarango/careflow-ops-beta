import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { getRoleLabel, getRoleBadgeColor } from "@/lib/permissions";
import { useRolePreview } from "@/lib/RolePreviewContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, UserCheck, ClipboardList, AlertTriangle,
  Pill, Clock, ShieldCheck, DollarSign, Target, Calendar,
  UsersRound, ReceiptText, Briefcase, Settings,
  Eye, ChevronDown, Menu, X, FileText, Stethoscope, Brain
} from "lucide-react";

const ALL_NAV = [
  {
    section: "Clinical Care",
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard },
      { path: "/clients", label: "Clients", icon: Users },
      { path: "/goals", label: "Goals", icon: Target },
      { path: "/session-notes", label: "Session Notes", icon: ClipboardList },
      { path: "/bsp", label: "Behavior Support", icon: Brain },
      { path: "/isp", label: "ISP Plans", icon: FileText },
    ],
  },
  {
    section: "Health & Safety",
    items: [
      { path: "/emar", label: "eMAR", icon: Pill },
      { path: "/incidents", label: "Incidents", icon: AlertTriangle, badge: "incidents" },
    ],
  },
  {
    section: "Staff & Operations",
    items: [
      { path: "/staff", label: "Staff", icon: UserCheck },
      { path: "/schedule", label: "Schedule & EVV", icon: Calendar },
      { path: "/timecards", label: "Timecards", icon: Clock },
      { path: "/hr", label: "HR & Compliance", icon: Briefcase },
      { path: "/compliance", label: "Compliance", icon: ShieldCheck },
    ],
  },
  {
    section: "Finance",
    items: [
      { path: "/finance", label: "Finance", icon: DollarSign },
      { path: "/reports", label: "Reports", icon: ClipboardList },
    ],
  },
  {
    section: "Agency",
    items: [
      { path: "/users", label: "Users", icon: UsersRound },
      { path: "/agency-admin", label: "Settings & Admin", icon: Settings },
      { path: "/role-preview", label: "Role Preview", icon: Eye },
    ],
  },
];

const PREVIEW_ROLES = [
  "admin", "program_director", "supervisor", "case_manager",
  "bcba", "nurse", "billing", "hr", "lead_dsp", "dsp"
];

export default function Sidebar() {
  const location = useLocation();
  const { role, realRole, can, canAccessPath } = useRole();
  const { previewRole, setPreviewRole } = useRolePreview();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);

  const showBadge = can("viewIncidentBadge");
  const { data: incidents = [] } = useQuery({
    queryKey: ["open-incidents-badge"],
    queryFn: () => base44.entities.IncidentReport.filter({ status: "Open" }),
    enabled: showBadge,
    staleTime: 60_000,
  });
  const incidentCount = incidents.length;

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const visibleSections = ALL_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccessPath(item.path)),
  })).filter((section) => section.items.length > 0);

  const sidebarContent = (
    <nav className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="px-4 py-5 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground leading-tight">CareOps Pro</p>
            <p className="text-[10px] text-sidebar-foreground/50 leading-tight">IDD Management</p>
          </div>
        </div>
      </div>

      {/* Nav Items — scroll container is isolated so clicks don't reset position */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4 min-h-0">
        {visibleSections.map((section) => (
          <div key={section.section}>
            <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              {section.section}
            </p>
            <div className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const badgeCount = item.badge === "incidents" && showBadge ? incidentCount : 0;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-primary text-white"
                        : "text-sidebar-foreground hover:text-white hover:bg-sidebar-accent"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
            <div className="mx-4 mt-4 border-t border-sidebar-border/50" />
          </div>
        ))}
      </div>

      {/* Role indicator / switcher (admin only) */}
      <div className="px-3 py-3 border-t border-sidebar-border shrink-0">
        {realRole === "admin" ? (
          <div className="relative">
            <button
              onClick={() => setRolePickerOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-sidebar-foreground/60 shrink-0" />
              <span className="flex-1 text-left text-xs text-sidebar-foreground/70">
                {previewRole ? `Viewing as ${getRoleLabel(previewRole)}` : "Preview Role"}
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-sidebar-foreground/50 transition-transform", rolePickerOpen && "rotate-180")} />
            </button>
            {rolePickerOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                <button
                  onClick={() => { setPreviewRole(null); setRolePickerOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors font-medium text-foreground"
                >
                  Reset (Admin view)
                </button>
                <div className="border-t border-border" />
                {PREVIEW_ROLES.filter(r => r !== "admin").map((r) => (
                  <button
                    key={r}
                    onClick={() => { setPreviewRole(r); setRolePickerOpen(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors",
                      previewRole === r && "bg-accent font-semibold"
                    )}
                  >
                    {getRoleLabel(r)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={cn("px-3 py-1.5 rounded-md text-[11px] font-medium border text-center", getRoleBadgeColor(role))}>
            {getRoleLabel(role)}
          </div>
        )}
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-sidebar-background text-sidebar-foreground shadow"
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-[240px] bg-sidebar-background z-40 transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {sidebarContent}
      </aside>
    </>
  );
}