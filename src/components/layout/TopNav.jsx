import React from "react";
import { useAuth } from "@/lib/AuthContext";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function TopNav() {
  const { user } = useAuth();

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
    </div>
  );
}