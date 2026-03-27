import React, { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PortalContext } from "@/pages/Portal";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, Target, FileText, MessageSquare, Heart,
  LogOut, Menu, X, Shield, Bell, User, ChevronDown, Star, ClipboardList, Camera, Lock, AlertOctagon
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", path: "/portal/dashboard", icon: LayoutDashboard, roles: ["Guardian", "Case Manager"] },
  { label: "My Care", path: "/portal/my-care", icon: Heart, roles: ["Client"] },
  { label: "Weekly Updates", path: "/portal/weekly-reports", icon: FileText, roles: ["Guardian", "Case Manager"] },
  { label: "Milestones", path: "/portal/milestones", icon: Star, roles: ["Guardian", "Client", "Case Manager"] },
  { label: "Schedule", path: "/portal/schedule", icon: Calendar, roles: ["Guardian", "Client", "Case Manager"] },
  { label: "Goals", path: "/portal/goals", icon: Target, roles: ["Guardian", "Client", "Case Manager"] },
  { label: "Messages", path: "/portal/messages", icon: MessageSquare, roles: ["Guardian", "Client", "Case Manager"] },
  { label: "ISP Input", path: "/portal/isp-input", icon: ClipboardList, roles: ["Guardian", "Case Manager"] },
  { label: "Memories", path: "/portal/memories", icon: Camera, roles: ["Guardian", "Client", "Case Manager"] },
  { label: "Concerns", path: "/portal/concerns", icon: AlertOctagon, roles: ["Guardian", "Case Manager"] },
  { label: "My Access", path: "/portal/my-access", icon: Lock, roles: ["Guardian", "Case Manager"] },
  { label: "Documents", path: "/portal/documents", icon: FileText, roles: ["Guardian", "Case Manager"] },
];

const roleColors = {
  Guardian: "bg-violet-100 text-violet-700",
  Client: "bg-sky-100 text-sky-700",
  "Case Manager": "bg-emerald-100 text-emerald-700",
};

export default function PortalShell({ children }) {
  const { portalUser, handleLogout } = useContext(PortalContext);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = navItems.filter(n => n.roles.includes(portalUser?.portal_role));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Nav */}
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-800 text-sm">CareOps Portal</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {visibleNav.map(item => (
              <Link key={item.path} to={item.path}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                  location.pathname === item.path
                    ? "bg-sky-50 text-sky-700 font-medium"
                    : "text-slate-600 hover:bg-slate-100"
                )}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l">
              <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center">
                <User className="w-4 h-4 text-sky-600" />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-slate-800 leading-tight">{portalUser?.full_name}</p>
                <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", roleColors[portalUser?.portal_role])}>
                  {portalUser?.portal_role}
                </span>
              </div>
              <button onClick={handleLogout} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors ml-1" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b px-4 py-2 z-30">
          {visibleNav.map(item => (
            <Link key={item.path} to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors my-0.5",
                location.pathname === item.path
                  ? "bg-sky-50 text-sky-700 font-medium"
                  : "text-slate-600 hover:bg-slate-100"
              )}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* Client name banner */}
      <div className="bg-sky-600 text-white text-center py-1.5 text-xs">
        <Shield className="w-3 h-3 inline mr-1.5 opacity-75" />
        Viewing care record for: <span className="font-semibold">{portalUser?.client_name}</span>
        {portalUser?.portal_role !== "Client" && (
          <span className="ml-2 opacity-75">({portalUser?.relationship})</span>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      <footer className="text-center py-4 text-xs text-slate-400 border-t bg-white">
        <Shield className="w-3 h-3 inline mr-1" />
        HIPAA-compliant · All data encrypted · Session secured
      </footer>
    </div>
  );
}