import React from "react";
import { UserX } from "lucide-react";

export default function NoDSPClientsState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <UserX className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No clients assigned yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Contact your administrator to be assigned to clients.
      </p>
    </div>
  );
}