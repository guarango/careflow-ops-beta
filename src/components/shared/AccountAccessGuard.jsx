import { Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useImpersonation } from "@/lib/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldAlert } from "lucide-react";

// Blocks anyone whose User record has no app role or is deactivated.
// Nothing below this guard (sidebar, dashboard, data queries) is mounted for them.
export default function AccountAccessGuard() {
  const { user, logout } = useAuth();
  const { impersonation } = useImpersonation();
  const effectiveUser = impersonation?.targetUser || user;

  const hasAccess = effectiveUser?.is_super_admin
    || (!!effectiveUser?.role && !effectiveUser?.is_deactivated);

  if (!hasAccess) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border bg-card text-card-foreground shadow p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-lg font-semibold">Account not set up</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account isn't set up yet. Contact your agency administrator.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}