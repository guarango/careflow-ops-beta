import React from "react";
import { useImpersonation } from "@/lib/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { getRoleLabel } from "@/lib/permissions";
import { Lock, LogOut } from "lucide-react";

export default function ImpersonationBanner() {
  const { impersonation, returnToSelf } = useImpersonation();
  if (!impersonation) return null;

  const name = impersonation.targetUser?.full_name || impersonation.targetUser?.email || "Unknown";
  const role = impersonation.targetUser?.role || "dsp";

  return (
    <div className="fixed top-14 left-0 right-0 z-20 h-10 bg-orange-500 text-white flex items-center justify-between px-4 md:ml-[64px] lg:ml-[240px]">
      <div className="flex items-center gap-2 min-w-0">
        <Lock className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs font-medium truncate">
          Viewing as {name} ({getRoleLabel(role)}) — Read-only mode
        </span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs shrink-0"
        onClick={() => returnToSelf()}
      >
        <LogOut className="w-3 h-3 mr-1" />
        Return to my account
      </Button>
    </div>
  );
}