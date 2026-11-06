import { Outlet, Navigate } from "react-router-dom";
import { useMyStaffRecord } from "@/hooks/useMyStaffRecord";

/**
 * The first-login onboarding wizard is required before any other page.
 * A person who has not finished it is sent to the wizard and resumes at their
 * saved step. People with no staff record (e.g. Super Admin) pass straight through.
 */
export default function StaffOnboardingGuard() {
  const { data: staff, isLoading } = useMyStaffRecord();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (staff && !staff.onboarding_completed_at) {
    return <Navigate to="/my-onboarding" replace />;
  }

  return <Outlet />;
}