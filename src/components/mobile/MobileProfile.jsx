import React, { useState } from "react";
import { User, Award, Bell, Moon, Sun, Shield, LogOut, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const CERTS = [
  { name: "CPR / First Aid", expiry: "2026-04-06", status: "expiring" },
  { name: "MANDT Training", expiry: "2026-09-15", status: "current" },
  { name: "Medication Administration", expiry: "2026-12-01", status: "current" },
  { name: "Mandated Reporter", expiry: "2025-12-31", status: "expired" },
];

const STATUS_CFG = {
  current: { label: "Current", color: "text-green-600", icon: CheckCircle2, iconColor: "text-green-500" },
  expiring: { label: "Expiring Soon", color: "text-amber-600", icon: AlertTriangle, iconColor: "text-amber-500" },
  expired: { label: "Expired", color: "text-red-600", icon: AlertTriangle, iconColor: "text-red-500" },
};

const NOTIF_PREFS = [
  { key: "visit_reminder", label: "Visit reminders (30 min before)" },
  { key: "note_reminder", label: "Session note reminders" },
  { key: "supervisor_msg", label: "Supervisor messages" },
  { key: "cert_expiry", label: "Certification expiration warnings" },
  { key: "goal_reminder", label: "Goal data collection reminders" },
];

export default function MobileProfile({ user }) {
  const [darkMode, setDarkMode] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState({ visit_reminder: true, note_reminder: true, supervisor_msg: true, cert_expiry: true, goal_reminder: false });
  const [section, setSection] = useState(null); // "certs" | "notifications" | null

  const firstName = user?.full_name?.split(" ")[0] || "User";
  const initials = user?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "U";

  function toggleNotif(key) {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleLogout() {
    if (window.confirm("Logging out will clear all offline data. Continue?")) {
      base44.auth.logout();
    }
  }

  if (section === "certs") {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
          <button onClick={() => setSection(null)} className="text-muted-foreground text-sm">← Back</button>
          <h1 className="text-base font-bold flex-1">My Certifications</h1>
        </div>
        <div className="px-4 py-5 space-y-3">
          {CERTS.map((c, i) => {
            const cfg = STATUS_CFG[c.status];
            const Icon = cfg.icon;
            return (
              <div key={i} className="bg-card border border-border rounded-xl px-4 py-4 flex items-center gap-3">
                <Icon className={cn("w-5 h-5 flex-shrink-0", cfg.iconColor)} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">Expires {c.expiry}</p>
                </div>
                <span className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (section === "notifications") {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
          <button onClick={() => setSection(null)} className="text-muted-foreground text-sm">← Back</button>
          <h1 className="text-base font-bold flex-1">Notification Preferences</h1>
        </div>
        <div className="px-4 py-5 space-y-2">
          {NOTIF_PREFS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3.5">
              <span className="text-sm text-foreground">{label}</span>
              <button
                onClick={() => toggleNotif(key)}
                className={cn("w-12 h-6 rounded-full transition-colors relative flex-shrink-0",
                  notifPrefs[key] ? "bg-primary" : "bg-muted")}
              >
                <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                  notifPrefs[key] ? "right-0.5" : "left-0.5")} />
              </button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground px-1 mt-3">Some notifications may be required by your agency for compliance and cannot be disabled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Profile header */}
      <div className="bg-sidebar px-5 pt-10 pb-8 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-sidebar-primary/40 flex items-center justify-center text-sidebar-primary-foreground font-bold text-2xl mb-3">
          {initials}
        </div>
        <h1 className="text-xl font-bold text-sidebar-accent-foreground">{user?.full_name || "Staff Member"}</h1>
        <p className="text-sidebar-foreground/60 text-sm mt-1">{user?.email || "dsp@agency.org"}</p>
        <div className="mt-2 px-3 py-1 bg-sidebar-accent/50 rounded-full">
          <span className="text-xs text-sidebar-accent-foreground font-semibold">Direct Support Professional</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 -mt-4">
        {[
          { label: "This week", value: "18.5h" },
          { label: "This month", value: "72h" },
          { label: "Notes due", value: "1" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-xl px-3 py-4 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Settings list */}
      <div className="px-4 mt-6 space-y-2">
        {[
          { icon: Award, label: "My Certifications", sub: "1 expiring soon", action: () => setSection("certs"), badge: "!", badgeColor: "bg-amber-500" },
          { icon: Bell, label: "Notification Preferences", sub: "Manage alerts", action: () => setSection("notifications"), badge: null },
          { icon: Shield, label: "Security & Biometrics", sub: "Face ID, PIN, session timeout", action: null, badge: null },
        ].map(({ icon: Icon, label, sub, action, badge, badgeColor }) => (
          <button
            key={label}
            onClick={action}
            disabled={!action}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3.5 active:bg-muted transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
            {badge && <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0", badgeColor)}>{badge}</span>}
            {action && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          </button>
        ))}

        {/* Dark mode toggle */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3.5">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            {darkMode ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Appearance</p>
            <p className="text-xs text-muted-foreground">{darkMode ? "Dark mode" : "Light mode"}</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={cn("w-12 h-6 rounded-full transition-colors relative flex-shrink-0", darkMode ? "bg-primary" : "bg-muted")}
          >
            <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform", darkMode ? "right-0.5" : "left-0.5")} />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 active:bg-red-100 transition-colors mt-4"
        >
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-sm font-medium text-red-600">Log Out</p>
        </button>
      </div>

      <div className="px-4 py-6 mt-2 text-center">
        <p className="text-[10px] text-muted-foreground">CareOps Pro Mobile · v8.0.0</p>
        <p className="text-[10px] text-muted-foreground">All PHI is encrypted and HIPAA-compliant</p>
      </div>
    </div>
  );
}