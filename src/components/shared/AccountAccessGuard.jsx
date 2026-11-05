import { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldAlert } from "lucide-react";

// Blocks anyone without app access (allow-list in useRole).
// Nothing below this guard (sidebar, dashboard, data queries) is mounted for them.
export default function AccountAccessGuard() {
  const { logout, checkAppState } = useAuth();
  const { hasAccess } = useRole();
  const attempted = useRef(false);

  // Activation itself runs in the activateStaffAccount backend function (sign-in
  // workflow). This only asks it once and re-reads the login, in case that finished
  // after this page mounted — it never decides access here.
  useEffect(() => {
    if (hasAccess || attempted.current) return;
    attempted.current = true;
    base44.functions
      .invoke("activateStaffAccount", {})
      .then((res) => {
        if (res.data?.applied) checkAppState();
      })
      .catch(() => {});
  }, [hasAccess]);

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