import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import ComplianceGrid from "./ComplianceGrid";
import { rowPct } from "./complianceStatus";

const COLUMNS = [
  { key: "pcsp", label: "PCSP" },
  { key: "support_strategies", label: "Strategies" },
  { key: "grievance_ack", label: "Grievance" },
  { key: "bsp_fba", label: "BSP/FBA" },
  { key: "human_rights", label: "Rights" },
  { key: "med_orders", label: "Med/MAR" },
  { key: "physical", label: "Physical" },
  { key: "dental", label: "Dental" },
  { key: "lease_inventory", label: "Lease/Inv" },
  { key: "consents", label: "Consents" },
  { key: "emergency_info", label: "Emergency" },
  { key: "authorization", label: "Auth" },
  { key: "quarterly", label: "Quarterly" },
];

function computeClientRow(client, isps, bsps, meds, consents, grievances, auths, notes) {
  const name = `${client.first_name} ${client.last_name}`;
  const myIsp = isps.find(p => p.client_id === client.id);
  const myBsp = bsps.find(p => p.client_id === client.id);
  const myMeds = meds.filter(m => m.client_id === client.id);
  const myConsents = consents.filter(c => c.client_id === client.id);
  const myGrievances = grievances.filter(g => g.client_id === client.id);
  const myAuths = auths.filter(a => a.client_id === client.id);
  const myNotes = notes.filter(n => n.client_id === client.id);
  const cells = {};

  cells.pcsp = myIsp
    ? { status: myIsp.status === "Active" ? "green" : myIsp.status === "Draft" || myIsp.status === "In Review" ? "yellow" : "red", label: "PCSP", detail: `Status: ${myIsp.status}` }
    : { status: "red", label: "PCSP", detail: "No PCSP on file" };

  const hasStrategies = myIsp?.support_strategies?.length > 0;
  cells.support_strategies = myIsp
    ? { status: hasStrategies ? "green" : "red", label: "Support Strategies", detail: hasStrategies ? `${myIsp.support_strategies.length} strategies` : "Missing strategies" }
    : { status: "gray", label: "Support Strategies", detail: "No PCSP" };

  const grievanceAcked = myGrievances.length > 0 && myGrievances.every(g => g.status === "Resolved" || g.status === "Closed");
  cells.grievance_ack = myGrievances.length > 0
    ? { status: grievanceAcked ? "green" : "yellow", label: "Grievance Ack", detail: `${myGrievances.length} grievance(s)` }
    : { status: "gray", label: "Grievance Ack", detail: "None filed" };

  cells.bsp_fba = myBsp
    ? { status: myBsp.status === "Active" ? "green" : myBsp.status === "Draft" ? "yellow" : "red", label: "BSP/FBA", detail: `Status: ${myBsp.status}` }
    : { status: "gray", label: "BSP/FBA", detail: "Not applicable" };

  const restrictions = myBsp?.human_rights_restrictions || [];
  cells.human_rights = restrictions.length > 0
    ? { status: restrictions.every(r => r.review_date && new Date(r.review_date) >= new Date()) ? "green" : "red", label: "Human Rights", detail: `${restrictions.length} restriction(s)` }
    : { status: "gray", label: "Human Rights", detail: "None on file" };

  cells.med_orders = myMeds.length > 0
    ? { status: "green", label: "Med Orders/MAR", detail: `${myMeds.length} medication(s)` }
    : { status: "red", label: "Med Orders/MAR", detail: "No medications set up" };

  cells.physical = { status: "gray", label: "Physical", detail: "Check client file" };
  cells.dental = { status: "gray", label: "Dental", detail: "Check client file" };
  cells.lease_inventory = { status: "gray", label: "Lease/Inventory", detail: "Check RHS file" };

  cells.consents = myConsents.length > 0
    ? { status: "green", label: "Consents", detail: `${myConsents.length} consent(s)` }
    : { status: "red", label: "Consents", detail: "No consents on file" };

  cells.emergency_info = client.guardian_name || client.guardian_phone
    ? { status: "green", label: "Emergency Info", detail: `Guardian: ${client.guardian_name || "N/A"}` }
    : { status: "red", label: "Emergency Info", detail: "Missing emergency contact" };

  const activeAuth = myAuths.find(a => a.status === "Approved" || a.status === "Active");
  cells.authorization = activeAuth
    ? { status: "green", label: "Authorization", detail: `Active auth on file` }
    : myAuths.length > 0
    ? { status: "yellow", label: "Authorization", detail: `${myAuths.length} auth(s), none active` }
    : { status: "red", label: "Authorization", detail: "No authorization" };

  const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const recentNotes = myNotes.filter(n => n.status === "Approved" || n.status === "Submitted");
  cells.quarterly = recentNotes.length > 0
    ? { status: "green", label: "Quarterly Summary", detail: `${recentNotes.length} notes` }
    : { status: "red", label: "Quarterly Summary", detail: "No recent notes" };

  return { id: client.id, name, sub: client.diagnosis, cells, pct: rowPct(cells) };
}

export default function ClientFilesDashboard({ user, onSelectCell }) {
  const [search, setSearch] = React.useState("");

  const { data: clients = [] } = useQuery({ queryKey: ["clients-comp-grid"], queryFn: () => base44.entities.Client.list() });
  const { data: isps = [] } = useQuery({ queryKey: ["isps-comp-grid"], queryFn: () => base44.entities.ISPlan.list() });
  const { data: bsps = [] } = useQuery({ queryKey: ["bsps-comp-grid"], queryFn: () => base44.entities.BehaviorSupportPlan.list() });
  const { data: meds = [] } = useQuery({ queryKey: ["meds-comp-grid"], queryFn: () => base44.entities.Medication.list() });
  const { data: consents = [] } = useQuery({ queryKey: ["consents-comp-grid"], queryFn: () => base44.entities.PortalConsent.list() });
  const { data: grievances = [] } = useQuery({ queryKey: ["grievances-comp-grid"], queryFn: () => base44.entities.PortalGrievance.list() });
  const { data: auths = [] } = useQuery({ queryKey: ["auths-comp-grid"], queryFn: () => base44.entities.Authorization.list() });
  const { data: notes = [] } = useQuery({ queryKey: ["notes-comp-grid"], queryFn: () => base44.entities.SessionNote.list() });

  const rows = useMemo(() => {
    return clients
      .filter(c => c.status === "Active" || !c.status)
      .map(c => computeClientRow(c, isps, bsps, meds, consents, grievances, auths, notes))
      .filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  }, [clients, isps, bsps, meds, consents, grievances, auths, notes, search]);

  const avgPct = rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <div className="text-sm text-muted-foreground">Client Avg: <span className="font-bold text-foreground">{avgPct}%</span></div>
      </div>
      <ComplianceGrid columns={COLUMNS} rows={rows} onSelectCell={onSelectCell} emptyMessage="No active clients found" />
    </div>
  );
}