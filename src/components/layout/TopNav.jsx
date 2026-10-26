import React from "react";
import { useAuth } from "@/lib/AuthContext";
import NotificationBell from "@/components/notifications/NotificationBell";
import ImpersonationBanner from "@/components/shared/ImpersonationBanner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

export default function TopNav() {
  const { user, logout } = useAuth();

  return (
    <>
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
        {/* Right side: notification bell + user menu */}
        <div className="flex items-center gap-3 ml-auto">
          {user && (
            <div className="flex items-center gap-2">
              <NotificationBell currentUser={user} dark={false} />
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 pl-3 border-l border-border outline-none cursor-pointer">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground text-xs font-bold">
                      {user.full_name?.charAt(0) || "?"}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[140px] truncate">
                    {user.full_name}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="truncate">{user.full_name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => logout()}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      <ImpersonationBanner />
    </>
  );
}