import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useOffline } from "@/hooks/useOffline";
import MobileHome from "@/components/mobile/MobileHome";
import MobileClients from "@/components/mobile/MobileClients";
import MobileClockIn from "@/components/mobile/MobileClockIn";
import MobileNotifications from "@/components/mobile/MobileNotifications";
import MobileProfile from "@/components/mobile/MobileProfile";
import MobileSupervisor from "@/components/mobile/MobileSupervisor";
import ConnectivityBar from "@/components/mobile/ConnectivityBar";
import { Home, Users, Clock, Bell, User, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const DSP_TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "clients", label: "Clients", icon: Users },
  { id: "clock", label: "Clock", icon: Clock },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "profile", label: "Profile", icon: User },
];

const SUPERVISOR_TABS = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "clients", label: "Team", icon: Users },
  { id: "clock", label: "Visits", icon: Clock },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "profile", label: "Profile", icon: User },
];

export default function MobileApp() {
  const { user } = useAuth();
  const { role } = useRole();
  const { isOnline, isSyncing, pendingCount } = useOffline();
  const [activeTab, setActiveTab] = useState("home");
  const [notifCount] = useState(3);

  const isSupervisor = role === "admin" || role === "supervisor";
  const tabs = isSupervisor ? SUPERVISOR_TABS : DSP_TABS;

  const renderContent = () => {
    if (activeTab === "home") {
      return isSupervisor
        ? <MobileSupervisor user={user} onNavigate={setActiveTab} />
        : <MobileHome user={user} onNavigate={setActiveTab} />;
    }
    if (activeTab === "clients") return <MobileClients user={user} isSupervisor={isSupervisor} />;
    if (activeTab === "clock") return <MobileClockIn user={user} isSupervisor={isSupervisor} />;
    if (activeTab === "alerts") return <MobileNotifications user={user} />;
    if (activeTab === "profile") return <MobileProfile user={user} />;
    return null;
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden select-none">
      {/* Connectivity status bar */}
      <ConnectivityBar isOnline={isOnline} isSyncing={isSyncing} pendingCount={pendingCount} />

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {renderContent()}
      </div>

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 bg-card border-t border-border safe-area-bottom">
        <div className="flex items-stretch">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const showBadge = tab.id === "alerts" && notifCount > 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[60px] transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                aria-label={tab.label}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                      {notifCount}
                    </span>
                  )}
                </div>
                <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}