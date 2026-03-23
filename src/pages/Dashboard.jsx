import React, { useState } from "react";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/lib/AuthContext";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import HRDashboard from "@/components/dashboard/HRDashboard";
import DSPDashboard from "@/components/dashboard/DSPDashboard";
import { Eye } from "lucide-react";

const VIEWS = [
  { value: "admin", label: "Admin" },
  { value: "hr", label: "HR Manager" },
  { value: "dsp", label: "DSP / Field Staff" },
];

export default function Dashboard() {
  const { role } = useRole();
  const { user } = useAuth();
  const [previewRole, setPreviewRole] = useState(null);

  const activeRole = previewRole || role;
  const isPreviewing = previewRole && previewRole !== role;

  return (
    <div>
      {/* Admin-only role preview switcher */}
      {role === "admin" && (
        <div className="flex items-center gap-3 mb-6 px-4 py-2.5 bg-muted/60 border border-border rounded-xl text-sm">
          <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground font-medium">Preview as:</span>
          <div className="flex gap-1.5">
            {VIEWS.map(v => (
              <button
                key={v.value}
                onClick={() => setPreviewRole(v.value === role && !previewRole ? null : v.value)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activeRole === v.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {isPreviewing && (
            <span className="ml-auto text-xs text-amber-600 font-medium">
              Previewing {VIEWS.find(v => v.value === previewRole)?.label} view
            </span>
          )}
        </div>
      )}

      {activeRole === "hr" && <HRDashboard user={user} />}
      {activeRole === "dsp" && <DSPDashboard user={user} />}
      {activeRole === "admin" && <AdminDashboard user={user} />}
    </div>
  );
}