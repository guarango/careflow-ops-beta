import { Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldAlert } from "lucide-react";

// Blocks anyone without app access (allow-list in useRole).
// Nothing below this guard (sidebar, dashboard, data queries) is mounted for them.
export default function AccountAccessGuard() {
  const { logout } = useAuth();
  const { hasAccess } = useRole();

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