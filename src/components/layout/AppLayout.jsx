import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import { Smartphone, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";

// Roles that work directly with clients and need quick access to external portals
const PORTAL_ACCESS_ROLES = ["admin", "program_director", "supervisor", "case_manager", "nurse", "bcba", "lead_dsp", "dsp"];

export default function AppLayout() {
  const { role } = useRole();
  const showExternalLinks = PORTAL_ACCESS_ROLES.includes(role);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Top header bar for external-facing quick links */}
      {showExternalLinks && (
        <header className="fixed top-0 right-0 left-0 lg:left-[240px] h-14 z-20 flex items-center justify-end px-4 gap-1 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <div className="w-px h-5 bg-border mx-1" />
            <a
              href="/mobile"
              target="_blank"
              rel="noopener noreferrer"
              title="Mobile Field App"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Mobile App</span>
            </a>
            <a
              href="/portal"
              target="_blank"
              rel="noopener noreferrer"
              title="Family Portal"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Family Portal</span>
            </a>
          </div>
        </header>
      )}

      <main className={cn(
        "lg:ml-[240px] min-h-screen transition-all duration-300",
        showExternalLinks ? "pt-14" : "pt-0"
      )}>
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}