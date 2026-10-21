import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { useImpersonation } from "@/lib/ImpersonationContext";
import NotificationBell from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function TopNav() {
  const { user } = useAuth();
  const { impersonation, returnToSelf } = useImpersonation();

  return (
    <div className="
      fixed top-0 right-0 z-30
      ml-0 md:ml-[64px] lg:ml-[240px]
      left-0
      h-14
      bg-background border-b border-border
      flex items-center justify-end
      px-4 md:px-6
      gap-3
    ">
      {/* Right side: notification bell + user pill */}
      <div className="flex items-center gap-3 ml-auto">
        {user && (
          <div className="flex items-center gap-2">
            <NotificationBell currentUser={user} dark={false} />
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-xs font-bold">
                  {user.full_name?.charAt(0) || "?"}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground max-w-[140px] truncate">
                {user.full_name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Impersonation banner */}
      {impersonation && (
        <div className="fixed top-14 left-0 right-0 z-20 h-10 bg-amber-500 text-white flex items-center justify-between px-4 md:ml-[64px] lg:ml-[240px]">
          <span className="text-xs font-medium">
            Login As: viewing as {impersonation.targetUser?.full_name || impersonation.targetUser?.email} — all actions are audited
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={() => returnToSelf()}
          >
            <LogOut className="w-3 h-3 mr-1" />
            Return to my account
          </Button>
        </div>
      )}
    </div>
  );
}