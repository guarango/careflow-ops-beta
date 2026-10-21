import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle2, ShieldAlert, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

/**
 * Shows qualification warnings when assigning a DSP to a shift.
 * Checks staff profile compliance: background check, I9, drug screen, TB test,
 * orientation, and certifications expiring within 30 days or expired.
 */
export default function QualificationCheck({ staffId, staff }) {
  const { data: complianceDocs = [] } = useQuery({
    queryKey: ["staff-compliance-docs", staffId],
    queryFn: () => base44.entities.StaffComplianceDocument.filter({ staff_id: staffId }),
    enabled: !!staffId,
  });

  const { data: onboardingDocs = [] } = useQuery({
    queryKey: ["staff-onboarding-docs", staffId],
    queryFn: () => base44.entities.OnboardingDocument.filter({ staff_id: staffId }),
    enabled: !!staffId,
  });

  if (!staff) return null;

  const warnings = [];
  const today = new Date();

  // Background check
  if (staff.background_check_status && staff.background_check_status !== "Cleared") {
    warnings.push({ label: `Background check: ${staff.background_check_status}`, severity: "high" });
  } else if (!staff.background_check_status && !staff.background_check_date) {
    warnings.push({ label: "Background check not on file", severity: "high" });
  }

  // I9
  if (!staff.i9_verified) {
    warnings.push({ label: "I-9 not verified", severity: "high" });
  }

  // Drug screen
  if (staff.drug_screen_status && staff.drug_screen_status !== "Passed") {
    warnings.push({ label: `Drug screen: ${staff.drug_screen_status}`, severity: "high" });
  }

  // TB test
  if (staff.tb_test_result && staff.tb_test_result === "Positive") {
    warnings.push({ label: "TB test: Positive", severity: "high" });
  } else if (staff.tb_test_expiry) {
    const expDate = new Date(staff.tb_test_expiry);
    const daysLeft = differenceInDays(expDate, today);
    if (daysLeft < 0) warnings.push({ label: `TB test expired (${format(expDate, "MMM d, yyyy")})`, severity: "high" });
    else if (daysLeft <= 30) warnings.push({ label: `TB test expires in ${daysLeft} days`, severity: "medium" });
  }

  // Orientation
  if (!staff.orientation_completed) {
    warnings.push({ label: "Orientation not completed", severity: "medium" });
  }

  // Certifications
  (staff.certifications || []).forEach(cert => {
    if (cert.expiry_date) {
      const expDate = new Date(cert.expiry_date);
      const daysLeft = differenceInDays(expDate, today);
      if (cert.status === "Expired" || daysLeft < 0) {
        warnings.push({ label: `Certification expired: ${cert.name}`, severity: "high" });
      } else if (cert.status === "Expiring Soon" || daysLeft <= 30) {
        warnings.push({ label: `Certification expiring soon: ${cert.name} (${daysLeft} days)`, severity: "medium" });
      }
    }
  });

  // Pending onboarding documents
  const pendingOnboarding = onboardingDocs.filter(d => d.status === "Pending");
  pendingOnboarding.forEach(d => {
    warnings.push({ label: `Onboarding doc pending: ${d.document_name}`, severity: "medium" });
  });

  // Pending/expired compliance docs
  const pendingCompliance = complianceDocs.filter(d => d.status === "Pending" || d.status === "Expired");
  pendingCompliance.forEach(d => {
    warnings.push({ label: `${d.document_type}: ${d.status}`, severity: d.status === "Expired" ? "high" : "medium" });
  });

  if (warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        All qualifications current — no warnings.
      </div>
    );
  }

  const highCount = warnings.filter(w => w.severity === "high").length;

  return (
    <div className={`border rounded-lg p-3 ${highCount > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className={`w-4 h-4 ${highCount > 0 ? "text-red-600" : "text-amber-600"}`} />
        <p className={`text-sm font-semibold ${highCount > 0 ? "text-red-700" : "text-amber-700"}`}>
          {highCount > 0 ? `${highCount} critical qualification issue${highCount > 1 ? "s" : ""}` : `${warnings.length} qualification warning${warnings.length > 1 ? "s" : ""}`}
        </p>
      </div>
      <ul className="space-y-1">
        {warnings.map((w, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs">
            <AlertTriangle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${w.severity === "high" ? "text-red-500" : "text-amber-500"}`} />
            <span className={w.severity === "high" ? "text-red-700" : "text-amber-700"}>{w.label}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground mt-2">You can still assign this staff member, but these items should be resolved.</p>
    </div>
  );
}