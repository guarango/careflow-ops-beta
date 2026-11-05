import React from "react";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/lib/AuthContext";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import HRDashboard from "@/components/dashboard/HRDashboard";
import DSPDashboard from "@/components/dashboard/DSPDashboard";

export default function Dashboard() {
  const { role, effectiveUser } = useRole();
  const { user } = useAuth();
  // While viewing as another user, every panel must resolve against that user
  // (a DSP being previewed must never see the admin's data).
  const viewer = effectiveUser || user;

  // Layout is chosen only on an exact role match — never defaulted to Admin.
  if (role === "dsp") return <DSPDashboard user={viewer} />;
  if (role === "manager" || role === "admin" || role === "super_admin") {
    return <AdminDashboard user={viewer} />;
  }
  return null;
}