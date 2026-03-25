import React from "react";
import { Wifi, WifiOff, RefreshCw, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConnectivityBar({ isOnline, isSyncing, pendingCount }) {
  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium",
        isOnline
          ? isSyncing
            ? "bg-blue-600 text-white"
            : "bg-amber-500 text-white"
          : "bg-slate-800 text-slate-200"
      )}
    >
      {!isOnline && <WifiOff className="w-3.5 h-3.5" />}
      {isOnline && isSyncing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
      {isOnline && !isSyncing && pendingCount > 0 && <CloudOff className="w-3.5 h-3.5" />}

      {!isOnline && "Offline — actions will sync when connected"}
      {isOnline && isSyncing && "Syncing offline actions…"}
      {isOnline && !isSyncing && pendingCount > 0 && `${pendingCount} action${pendingCount !== 1 ? "s" : ""} pending sync`}
    </div>
  );
}