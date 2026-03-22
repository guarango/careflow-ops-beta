import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Heart,
  FileText,
  AlertTriangle,
  Pill,
  Clock,
  Shield,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Activity,
  Target,
  CalendarDays,
  Tag,
  UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { getRoleLabel, getRoleBadgeColor } from "@/lib/permissions";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
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

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { canAccessPath, role } = useRole();
  const { user } = useAuth();
  const visibleNav = navItems.filter(item => canAccessPath(item.path));

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

        {/* User info */}
        {!collapsed && user && (
          <div className="px-4 py-3 border-t border-sidebar-border">
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{user.full_name || user.email}</p>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-semibold mt-0.5 inline-block", getRoleBadgeColor(role))}>
              {getRoleLabel(role)}
            </span>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>
    </>
  );
}