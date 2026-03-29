import React from "react";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/lib/AuthContext";
import { getRoleLabel } from "@/lib/permissions";

export default function AccessDenied() {
  const { role } = useRole();
  const { user } = useAuth();
  const name = user?.full_name || "there";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-7 h-7 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Access Restricted</h2>
        <p className="text-sm text-slate-500 mb-1">
          Hi {name} — your role ({getRoleLabel(role)}) doesn't include access to this module.
        </p>
        <p className="text-xs text-slate-400 mb-6">
          If you believe this is an error, please contact your administrator.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}