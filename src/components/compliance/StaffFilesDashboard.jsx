import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ComplianceGrid from "./ComplianceGrid";
import { docStatus, expiryStatus, daysUntil, rowPct, REQUIRED_TRAINING_HOURS } from "./complianceStatus";

const ADMIN_COLUMNS = [
  { key: "background_check", label: "Background" },
  { key: "oig_check", label: "OIG" },
  { key: "onboarding", label: "Onboarding" },
  { key: "policies", label: "Policies" },
  { key: "core_trainings", label: "Core Trng" },
  { key: "client_trainings", label: "Client Trng" },
  { key: "cpr_first_aid", label: "CPR/FA" },
  { key: "crisis", label: "Crisis" },
  { key: "training_hours", label: "Hrs/Yr" },
  { key: "expiring", label: "Expiring" },
];

const MANAGER_COLUMNS = [
  { key: "core_trainings", label: "Core Trng" },
  { key: "client_trainings", label: "Client Trng" },
  { key: "cpr_first_aid", label: "CPR/FA" },
  { key: "crisis", label: "Crisis" },
  { key: "training_hours", label: "Hrs/Yr" },
  { key: "expiring", label: "Expiring" },
];

function computeStaffRow(staff, compDocs, onboardingDocs, trainings, isAdmin) {
  const name = `${staff.first_name} ${staff.last_name}`;
  const myComp = compDocs.filter(d => d.staff_id === staff.id);
  const myOnboard = onboardingDocs.filter(d => d.staff_id === staff.id);
  const myTrainings = trainings.filter(t => t.staff_id === staff.id);
  const cells = {};

  if (isAdmin) {
    const bg = myComp.find(d => d.document_type?.toLowerCase().includes("background"));
    cells.background_check = bg
      ? { status: docStatus(bg.status, bg.expiration_date), label: "Background Check", detail: bg.expiration_date ? `Expires ${bg.expiration_date}` : "On file" }
      : { status: "red", label: "Background Check", detail: "Not on file" };

    const oig = myComp.find(d => d.document_type?.toLowerCase().includes("oig"));
    cells.oig_check = oig
      ? { status: docStatus(oig.status, oig.expiration_date), label: "OIG Check", detail: oig.expiration_date ? `Expires ${oig.expiration_date}` : "On file" }
      : { status: "red", label: "OIG Check", detail: "Not on file" };

    const signedOnboard = myOnboard.filter(d => d.status === "Signed");
    cells.onboarding = myOnboard.length > 0
      ? { status: signedOnboard.length === myOnboard.length ? "green" : "yellow", label: "Onboarding Docs", detail: `${signedOnboard.length}/${myOnboard.length} signed` }
      : { status: "red", label: "Onboarding Docs", detail: "No onboarding docs sent" };

    const policyDocs = myOnboard.filter(d => /policy|handbook|acknowledg/i.test(d.document_name || ""));
    const signedPolicies = policyDocs.filter(d => d.status === "Signed");
    cells.policies = policyDocs.length > 0
      ? { status: signedPolicies.length === policyDocs.length ? "green" : "yellow", label: "Policy Docs", detail: `${signedPolicies.length}/${policyDocs.length} signed` }
      : { status: "red", label: "Policy Docs", detail: "No policy docs" };
  }

  const coreTrainings = myTrainings.filter(t => t.assignment_type === "onboarding" || t.assignment_type === "manual");
  const completedCore = coreTrainings.filter(t => t.status === "Completed" || t.status === "Verified");
  cells.core_trainings = coreTrainings.length > 0
    ? { status: completedCore.length === coreTrainings.length ? "green" : completedCore.length > 0 ? "yellow" : "red", label: "Core Trainings", detail: `${completedCore.length}/${coreTrainings.length} complete` }
    : { status: "gray", label: "Core Trainings", detail: "None assigned" };

  const clientTrainings = myTrainings.filter(t => t.assignment_type === "client");
  const completedClient = clientTrainings.filter(t => t.status === "Completed" || t.status === "Verified");
  cells.client_trainings = clientTrainings.length > 0
    ? { status: completedClient.length === clientTrainings.length ? "green" : completedClient.length > 0 ? "yellow" : "red", label: "Client-Specific Trainings", detail: `${completedClient.length}/${clientTrainings.length} complete` }
    : { status: "gray", label: "Client Trainings", detail: "None assigned" };

  const cpr = myComp.find(d => /cpr|first.?aid/i.test(d.document_type || ""));
  cells.cpr_first_aid = cpr
    ? { status: docStatus(cpr.status, cpr.expiration_date), label: "CPR/First Aid", detail: cpr.expiration_date ? `Expires ${cpr.expiration_date}` : "On file" }
    : { status: "red", label: "CPR/First Aid", detail: "Not on file" };

  const crisis = myTrainings.find(t => /crisis|cpi|de-escalat|prevent/i.test(t.training_title || ""));
  cells.crisis = crisis
    ? { status: crisis.status === "Completed" || crisis.status === "Verified" ? "green" : "yellow", label: "Crisis Training", detail: `${crisis.status}` }
    : { status: "red", label: "Crisis Training", detail: "Not assigned" };

  const hours = staff.training_hours || 0;
  cells.training_hours = hours >= REQUIRED_TRAINING_HOURS
    ? { status: "green", label: "Training Hours", detail: `${hours}/${REQUIRED_TRAINING_HOURS} hrs` }
    : hours > 0
    ? { status: "yellow", label: "Training Hours", detail: `${hours}/${REQUIRED_TRAINING_HOURS} hrs` }
    : { status: "red", label: "Training Hours", detail: "0 hrs recorded" };

  const allExpirations = myComp.map(d => d.expiration_date).filter(Boolean);
  const worstExp = allExpirations.length > 0
    ? allExpirations.reduce((worst, date) => {
        const s = expiryStatus(date);
        const order = { red: 0, orange: 1, yellow: 2, green: 3 };
        return order[s] < order[worst] ? s : worst;
      }, "green")
    : "green";
  const expiringSoon = allExpirations.filter(d => { const days = daysUntil(d); return days !== null && days <= 60; });
  cells.expiring = expiringSoon.length > 0
    ? { status: worstExp, label: "Expiring Items", detail: `${expiringSoon.length} item(s) expiring within 60 days` }
    : { status: "green", label: "Expiring Items", detail: "Nothing expiring soon" };

  return { id: staff.id, name, sub: staff.role, cells, pct: rowPct(cells) };
}

export default function StaffFilesDashboard({ user, onSelectCell }) {
  const [search, setSearch] = React.useState("");
  const isAdmin = user?.role === "admin";
  const columns = isAdmin ? ADMIN_COLUMNS : MANAGER_COLUMNS;

  const { data: staff = [] } = useQuery({ queryKey: ["staff-comp-grid"], queryFn: () => base44.entities.StaffMember.list() });
  const { data: compDocs = [] } = useQuery({ queryKey: ["staff-comp-docs-grid"], queryFn: () => base44.entities.StaffComplianceDocument.list() });
  const { data: onboardingDocs = [] } = useQuery({ queryKey: ["onboarding-docs-grid"], queryFn: () => base44.entities.OnboardingDocument.list() });
  const { data: trainings = [] } = useQuery({ queryKey: ["training-assignments-grid"], queryFn: () => base44.entities.TrainingAssignment.list() });

  const rows = useMemo(() => {
    const active = staff.filter(s => s.status === "Active" || !s.status);
    return active
      .map(s => computeStaffRow(s, compDocs, onboardingDocs, trainings, isAdmin))
      .filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  }, [staff, compDocs, onboardingDocs, trainings, isAdmin, search]);

  const avgPct = rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0;

  const handleCellClick = (row, col, cell) => {
    onSelectCell?.({ type: "staff", staffId: row.id, column: col.key, ...cell });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input placeholder="Search staff…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <div className="text-sm text-muted-foreground">Staff Avg: <span className="font-bold text-foreground">{avgPct}%</span></div>
      </div>
      <ComplianceGrid columns={columns} rows={rows} onSelectCell={handleCellClick} emptyMessage="No active staff found" />
    </div>
  );
}