import React from "react";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/lib/AuthContext";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import HRDashboard from "@/components/dashboard/HRDashboard";
import DSPDashboard from "@/components/dashboard/DSPDashboard";

export default function Dashboard() {
  const { role } = useRole();
  const { user } = useAuth();

  if (role === "hr") return <HRDashboard user={user} />;
  if (role === "dsp") return <DSPDashboard user={user} />;
  return <AdminDashboard user={user} />;
}