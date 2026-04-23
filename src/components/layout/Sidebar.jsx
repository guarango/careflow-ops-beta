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
  Eye, ChevronDown, ChevronRight, Menu, X, FileText, Stethoscope, Brain
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

// Tooltip for collapsed icon-only sidebar (tablet)
function NavTooltip({ label, children }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute left-full ml-2 z-50 px-2.5 py-1.5 rounded-md bg-[#1E293B] text-[#F1F5F9] text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none">
          {label}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const { role, realRole, can, canAccessPath } = useRole();
  const { previewRole, setPreviewRole } = useRolePreview();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tabletExpanded, setTabletExpanded] = useState(false);
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

  // ─── Full sidebar content (mobile overlay + desktop) ─────────────────────
  const fullSidebarContent = (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#1E293B] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center shrink-0">
            <Stethoscope className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#F1F5F9] leading-tight">CareOps Pro</p>
            <p className="text-[11px] text-[#64748B] leading-tight">IDD Management</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-3 space-y-1 min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:bg-[#334155] [&::-webkit-scrollbar-thumb:hover]:bg-[#475569] [&::-webkit-scrollbar-thumb]:rounded-full">
        {visibleSections.map((section) => (
          <div key={section.section}>
            <p className="px-[14px] pt-4 pb-1.5 text-[10px] font-semibold uppercase text-[#475569] tracking-[0.08em]">
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
                    onClick={() => { setMobileOpen(false); setTabletExpanded(false); }}
                    style={active ? { boxShadow: "0 2px 8px rgba(14, 165, 233, 0.35)" } : {}}
                    className={cn(
                      "flex items-center gap-3 px-[14px] rounded-lg text-sm transition-all duration-150 min-h-[44px]",
                      active
                        ? "bg-[#0EA5E9] text-white font-semibold"
                        : "text-[#CBD5E1] font-normal hover:bg-[#1E293B] hover:text-[#F1F5F9] cursor-pointer"
                    )}
                  >
                    <Icon className="shrink-0" style={{ width: 18, height: 18, color: active ? "#FFFFFF" : undefined }} />
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
            <div className="mx-4 mt-3 border-t border-[#1E293B]" />
          </div>
        ))}
      </div>

      {/* Role switcher */}
      <div className="px-3 py-3 border-t border-[#1E293B] shrink-0">
        {realRole === "admin" ? (
          <div className="relative">
            <button
              onClick={() => setRolePickerOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-[#1E293B] hover:bg-[#334155] transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
              <span className="flex-1 text-left text-xs text-[#94A3B8]">
                {previewRole ? `Viewing as ${getRoleLabel(previewRole)}` : "Preview Role"}
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-[#64748B] transition-transform", rolePickerOpen && "rotate-180")} />
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

  // ─── Collapsed icon-only sidebar (tablet 768–1024px) ─────────────────────
  const collapsedSidebarContent = (
    <nav className="flex flex-col h-full items-center">
      {/* Logo icon only */}
      <div className="py-5 border-b border-[#1E293B] w-full flex justify-center shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center">
          <Stethoscope className="w-4 h-4 text-[#38BDF8]" />
        </div>
      </div>

      {/* Expand chevron */}
      <button
        onClick={() => setTabletExpanded(true)}
        className="mt-3 p-2 rounded-lg hover:bg-[#1E293B] text-[#64748B] hover:text-[#F1F5F9] transition-colors"
        title="Expand sidebar"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Icons only */}
      <div className="flex-1 overflow-y-auto w-full py-2 min-h-0 [&::-webkit-scrollbar]:hidden">
        {visibleSections.map((section) => (
          <div key={section.section} className="mb-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const badgeCount = item.badge === "incidents" && showBadge ? incidentCount : 0;
              return (
                <NavTooltip key={item.path} label={item.label}>
                  <Link
                    to={item.path}
                    style={active ? { boxShadow: "0 2px 8px rgba(14, 165, 233, 0.35)" } : {}}
                    className={cn(
                      "relative mx-2 my-0.5 flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150",
                      active
                        ? "bg-[#0EA5E9] text-white"
                        : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-[#F1F5F9]"
                    )}
                  >
                    <Icon style={{ width: 18, height: 18 }} />
                    {badgeCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                </NavTooltip>
              );
            })}
            <div className="my-2 mx-2 border-t border-[#1E293B]" />
          </div>
        ))}
      </div>
    </nav>
  );

  return (
    <>
      {/* ── MOBILE: hamburger toggle (< 768px) ───────────────────────────── */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 w-11 h-11 flex items-center justify-center rounded-md bg-[#0F172A] text-[#CBD5E1] shadow"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* ── MOBILE: backdrop ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── MOBILE: full overlay sidebar (<768px) ────────────────────────── */}
      <aside className={cn(
        "md:hidden fixed top-0 left-0 h-full w-[280px] bg-[#0F172A] z-40 transition-transform duration-300 shadow-2xl",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {fullSidebarContent}
      </aside>

      {/* ── TABLET: collapsed icon sidebar (768–1024px) ──────────────────── */}
      <aside className="hidden md:flex lg:hidden fixed top-0 left-0 h-full w-[64px] bg-[#0F172A] z-40 flex-col">
        {collapsedSidebarContent}
      </aside>

      {/* ── TABLET: expanded overlay (when chevron clicked) ──────────────── */}
      {tabletExpanded && (
        <>
          <div
            className="hidden md:block lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setTabletExpanded(false)}
          />
          <aside className="hidden md:block lg:hidden fixed top-0 left-0 h-full w-[240px] bg-[#0F172A] z-40 shadow-2xl">
            {fullSidebarContent}
          </aside>
        </>
      )}

      {/* ── DESKTOP: full sidebar (>1024px) ──────────────────────────────── */}
      <aside className="hidden lg:block fixed top-0 left-0 h-full w-[240px] bg-[#0F172A] z-40">
        {fullSidebarContent}
      </aside>
    </>
  );
}