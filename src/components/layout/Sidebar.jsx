import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Heart, FileText, AlertTriangle,
  Pill, Clock, Shield, DollarSign, ChevronLeft, ChevronRight,
  Menu, X, Activity, Target, CalendarDays, Tag, UserCog,
  TrendingUp, Eye, Check, ChevronUp, MapPin, Briefcase, Settings2, ExternalLink, BarChart3, Sparkles, Smartphone, Plug, Brain
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { useRolePreview } from "@/lib/RolePreviewContext";
import { useAuth } from "@/lib/AuthContext";
import { getRoleLabel, getRoleBadgeColor } from "@/lib/permissions";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Staff", icon: Users, path: "/staff" },
  { label: "Clients", icon: Heart, path: "/clients" },
  { label: "Schedule", icon: CalendarDays, path: "/schedule" },
  { label: "Client Goals", icon: Target, path: "/goals" },
  { label: "Session Notes", icon: FileText, path: "/session-notes" },
  { label: "Behavior Support Plans", icon: Brain, path: "/bsp" },
  { label: "Incidents", icon: AlertTriangle, path: "/incidents" },
  { label: "eMAR", icon: Pill, path: "/emar" },
  { label: "Timecards", icon: Clock, path: "/timecards" },
  { label: "Compliance", icon: Shield, path: "/compliance" },
  { label: "Service Codes", icon: Tag, path: "/service-codes" },
  { label: "Payroll", icon: TrendingUp, path: "/payroll" },
  { label: "Billing", icon: DollarSign, path: "/billing" },
  { label: "User Management", icon: UserCog, path: "/users" },
  { label: "EVV", icon: MapPin, path: "/evv" },
  { label: "HR", icon: Briefcase, path: "/hr" },
  { label: "Reports & Analytics", icon: BarChart3, path: "/reports" },
  { label: "AI & Automation Hub", icon: Sparkles, path: "/ai-hub" },
  { label: "Integrations", icon: Plug, path: "/agency-admin?tab=integrations" },
  { label: "Agency Settings", icon: Settings2, path: "/agency-admin" },
  { label: "Role Preview", icon: Eye, path: "/role-preview" },
];

const ROLE_VIEWS = [
  { value: "admin", label: "Admin", userName: "Cole Morley" },
  { value: "hr", label: "HR Manager", userName: "Sandra Lee" },
  { value: "dsp", label: "DSP / Field Staff", userName: "James Williams" },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef(null);

  const { canAccessPath, role, realRole } = useRole();
  const { previewRole, setPreviewRole } = useRolePreview();
  const { user } = useAuth();

  const visibleNav = navItems.filter(item => canAccessPath(item.path));

  // Displayed user info based on active role
  const activeView = ROLE_VIEWS.find(v => v.value === role) || ROLE_VIEWS[0];

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileMenuOpen]);

  const isAdmin = realRole === "admin";

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden bg-card shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-40 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo area */}
        <div className={cn(
          "flex items-center gap-3 px-5 h-16 border-b border-sidebar-border flex-shrink-0",
          collapsed && "justify-center px-0"
        )}>
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">CareOps Pro</h1>
              <p className="text-[10px] text-sidebar-foreground/60 tracking-wide uppercase">I/DD Platform</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {/* Mobile App quick link */}
          <a href="/mobile"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground mb-1",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "Mobile Field App" : undefined}>
            <Smartphone className="w-[18px] h-[18px] flex-shrink-0 text-blue-400" />
            {!collapsed && (
              <span className="flex-1 flex items-center gap-1.5">
                Mobile Field App
                <ExternalLink className="w-3 h-3 opacity-40" />
              </span>
            )}
          </a>
          {/* Family Portal quick link */}
          <a href="/portal" target="_blank"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground mb-1",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "Family Portal" : undefined}>
            <Heart className="w-[18px] h-[18px] flex-shrink-0 text-pink-400" />
            {!collapsed && (
              <span className="flex-1 flex items-center gap-1.5">
                Family Portal
                <ExternalLink className="w-3 h-3 opacity-40" />
              </span>
            )}
          </a>
          <div className={cn("h-px bg-sidebar-border my-1", collapsed && "mx-2")} />
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User profile + role switcher */}
        {!collapsed && (
          <div ref={profileRef} className="relative border-t border-sidebar-border">
            {/* Popup menu */}
            {profileMenuOpen && isAdmin && (
              <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl border border-sidebar-border bg-[hsl(215,26%,18%)] shadow-2xl overflow-hidden z-50">
                <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest px-3 pt-3 pb-2 font-semibold">Switch view</p>
                {ROLE_VIEWS.map(v => {
                  const isActive = role === v.value;
                  return (
                    <button
                      key={v.value}
                      onClick={() => {
                        setPreviewRole(v.value === realRole ? null : v.value);
                        setProfileMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-primary/20 text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <span className="w-4 flex-shrink-0">
                        {isActive && <Check className="w-3.5 h-3.5 text-sidebar-primary" />}
                      </span>
                      <span className="flex-1 text-left">{v.label}</span>
                    </button>
                  );
                })}
                <div className="h-2" />
              </div>
            )}

            {/* Profile row */}
            <button
              onClick={() => isAdmin && setProfileMenuOpen(p => !p)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 transition-colors",
                isAdmin ? "hover:bg-sidebar-accent/60 cursor-pointer" : "cursor-default"
              )}
            >
              <div className="w-7 h-7 rounded-full bg-sidebar-primary/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-sidebar-primary-foreground">
                {activeView.userName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{activeView.userName}</p>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-semibold mt-0.5 inline-block", getRoleBadgeColor(role))}>
                  {activeView.label}
                </span>
              </div>
              {isAdmin && (
                <ChevronUp className={cn("w-3.5 h-3.5 text-sidebar-foreground/40 transition-transform flex-shrink-0", !profileMenuOpen && "rotate-180")} />
              )}
            </button>
          </div>
        )}

        {/* Collapsed user avatar */}
        {collapsed && (
          <div className="flex justify-center py-3 border-t border-sidebar-border">
            <div className="w-7 h-7 rounded-full bg-sidebar-primary/30 flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground">
              {activeView.userName.charAt(0)}
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>
    </>
  );
}