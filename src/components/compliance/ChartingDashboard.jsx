import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ComplianceGrid from "./ComplianceGrid";
import { rowPct } from "./complianceStatus";

const COLUMNS = [
  { key: "notes_completed", label: "Notes Done" },
  { key: "notes_on_time", label: "On Time" },
  { key: "notes_approved", label: "Approved" },
  { key: "med_passes", label: "Med Passes" },
  { key: "med_reasons", label: "Med Reasons" },
  { key: "goals_charted", label: "Goals Charted" },
  { key: "prn_minimum", label: "PRN Min" },
  { key: "evv_exceptions", label: "EVV Exc" },
  { key: "incidents", label: "Incidents" },
];

function inRange(dateStr, start, end) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function computeRow(id, name, sub, notes, medLogs, goals, evvLogs, incidents, start, end) {
  const cells = {};
  const totalNotes = notes.length;
  cells.notes_completed = totalNotes > 0
    ? { status: "green", label: "Notes Completed", detail: `${totalNotes} notes` }
    : { status: "red", label: "Notes Completed", detail: "No notes" };

  const onTime = notes.filter(n => !n.is_late);
  cells.notes_on_time = totalNotes > 0
    ? { status: onTime.length === totalNotes ? "green" : onTime.length > totalNotes / 2 ? "yellow" : "red", label: "Notes On Time", detail: `${onTime.length}/${totalNotes} on time` }
    : { status: "gray", label: "Notes On Time", detail: "No notes" };

  const approved = notes.filter(n => n.status === "Approved");
  cells.notes_approved = totalNotes > 0
    ? { status: approved.length === totalNotes ? "green" : approved.length > 0 ? "yellow" : "red", label: "Notes Approved", detail: `${approved.length}/${totalNotes} approved` }
    : { status: "gray", label: "Notes Approved", detail: "No notes" };

  const administered = medLogs.filter(m => m.status === "Administered");
  cells.med_passes = medLogs.length > 0
    ? { status: "green", label: "Med Passes", detail: `${administered.length}/${medLogs.length} given` }
    : { status: "gray", label: "Med Passes", detail: "No med logs" };

  const withReason = medLogs.filter(m => m.status !== "Administered" && (m.reason || m.prn_reason_given));
  const withoutReason = medLogs.filter(m => m.status !== "Administered" && !m.reason && !m.prn_reason_given);
  cells.med_reasons = withoutReason.length > 0
    ? { status: "red", label: "Med Reasons", detail: `${withoutReason.length} without reason` }
    : withReason.length > 0
    ? { status: "green", label: "Med Reasons", detail: `${withReason.length} with reason` }
    : { status: "gray", label: "Med Reasons", detail: "No non-admin meds" };

  const chartedGoals = goals.filter(g => g.progress_entries?.some(e => inRange(e.date, start, end)));
  cells.goals_charted = goals.length > 0
    ? { status: chartedGoals.length === goals.length ? "green" : chartedGoals.length > 0 ? "yellow" : "red", label: "Goals Charted", detail: `${chartedGoals.length}/${goals.length} charted` }
    : { status: "gray", label: "Goals Charted", detail: "No goals" };

  const prnGoals = goals.filter(g => g.charting_mode === "PRN");
  const prnMet = prnGoals.filter(g => {
    const entries = g.progress_entries?.filter(e => inRange(e.date, start, end)) || [];
    const monthCount = entries.length;
    return monthCount >= (g.prn_monthly_minimum || 1);
  });
  cells.prn_minimum = prnGoals.length > 0
    ? { status: prnMet.length === prnGoals.length ? "green" : prnMet.length > 0 ? "yellow" : "red", label: "PRN Minimum", detail: `${prnMet.length}/${prnGoals.length} met minimum` }
    : { status: "gray", label: "PRN Minimum", detail: "No PRN goals" };

  const openExceptions = evvLogs.filter(e => e.exception_status === "pending" || (e.exception_type && e.exception_type !== "none" && e.exception_status !== "approved"));
  cells.evv_exceptions = openExceptions.length === 0
    ? { status: "green", label: "EVV Exceptions", detail: "No open exceptions" }
    : { status: openExceptions.length > 3 ? "red" : "yellow", label: "EVV Exceptions", detail: `${openExceptions.length} open` };

  const deadlineMet = incidents.filter(i => {
    const reported = i.date ? new Date(i.date) : null;
    const dspdDate = i.dspd_reported_date ? new Date(i.dspd_reported_date) : null;
    return reported && dspdDate && (dspdDate - reported) <= 24 * 60 * 60 * 1000;
  });
  cells.incidents = incidents.length > 0
    ? { status: deadlineMet.length === incidents.length ? "green" : deadlineMet.length > 0 ? "yellow" : "red", label: "Incidents", detail: `${deadlineMet.length}/${incidents.length} on time` }
    : { status: "green", label: "Incidents", detail: "No incidents" };

  return { id, name, sub, cells, pct: rowPct(cells) };
}

export default function ChartingDashboard({ user, onSelectCell }) {
  const today = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
  const [viewBy, setViewBy] = useState("client");
  const [startDate, setStartDate] = useState(monthAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today);

  const { data: notes = [] } = useQuery({ queryKey: ["notes-charting"], queryFn: () => base44.entities.SessionNote.list() });
  const { data: medLogs = [] } = useQuery({ queryKey: ["medlogs-charting"], queryFn: () => base44.entities.MedicationLog.list() });
  const { data: goals = [] } = useQuery({ queryKey: ["goals-charting"], queryFn: () => base44.entities.ClientGoal.list() });
  const { data: evvLogs = [] } = useQuery({ queryKey: ["evv-charting"], queryFn: () => base44.entities.EVVLog.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents-charting"], queryFn: () => base44.entities.IncidentReport.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-charting"], queryFn: () => base44.entities.Client.list() });
  const { data: staff = [] } = useQuery({ queryKey: ["staff-charting"], queryFn: () => base44.entities.StaffMember.list() });
  const { data: houses = [] } = useQuery({ queryKey: ["houses-charting"], queryFn: () => base44.entities.House.list() });

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T23:59:59");

  const rows = useMemo(() => {
    const inRangeNotes = notes.filter(n => inRange(n.date, start, end));
    const inRangeMeds = medLogs.filter(m => inRange(m.date, start, end));
    const inRangeIncidents = incidents.filter(i => inRange(i.date, start, end));

    if (viewBy === "client") {
      return clients.filter(c => c.status === "Active" || !c.status).map(c => {
        const cNotes = inRangeNotes.filter(n => n.client_id === c.id);
        const cMeds = inRangeMeds.filter(m => m.client_id === c.id);
        const cGoals = goals.filter(g => g.client_id === c.id);
        const cEvv = evvLogs.filter(e => e.client_id === c.id);
        const cInc = inRangeIncidents.filter(i => i.client_id === c.id);
        return computeRow(c.id, `${c.first_name} ${c.last_name}`, c.diagnosis, cNotes, cMeds, cGoals, cEvv, cInc, start, end);
      });
    }
    if (viewBy === "dsp") {
      return staff.filter(s => s.status === "Active" || !s.status).map(s => {
        const sNotes = inRangeNotes.filter(n => n.staff_id === s.id);
        const sMeds = inRangeMeds.filter(m => m.administered_by === s.id || m.staff_name?.includes(`${s.first_name} ${s.last_name}`));
        const sGoals = goals.filter(g => g.progress_entries?.some(e => e.recorded_by === s.id));
        const sEvv = evvLogs.filter(e => e.staff_id === s.id);
        const sInc = inRangeIncidents.filter(i => i.reported_by === s.id);
        return computeRow(s.id, `${s.first_name} ${s.last_name}`, s.role, sNotes, sMeds, sGoals, sEvv, sInc, start, end);
      });
    }
    return houses.map(h => {
      const clientIds = clients.filter(c => c.house_id === h.id).map(c => c.id);
      const hNotes = inRangeNotes.filter(n => clientIds.includes(n.client_id));
      const hMeds = inRangeMeds.filter(m => clientIds.includes(m.client_id));
      const hGoals = goals.filter(g => clientIds.includes(g.client_id));
      const hEvv = evvLogs.filter(e => clientIds.includes(e.client_id) || e.house_id === h.id);
      const hInc = inRangeIncidents.filter(i => clientIds.includes(i.client_id));
      return computeRow(h.id, h.name, h.program_type, hNotes, hMeds, hGoals, hEvv, hInc, start, end);
    });
  }, [viewBy, notes, medLogs, goals, evvLogs, incidents, clients, staff, houses, start, end]);

  const avgPct = rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={viewBy} onValueChange={setViewBy}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="client">By Client</SelectItem>
            <SelectItem value="dsp">By DSP</SelectItem>
            <SelectItem value="house">By House</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
        <span className="text-muted-foreground text-sm">to</span>
        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
        <div className="text-sm text-muted-foreground ml-auto">Charting Avg: <span className="font-bold text-foreground">{avgPct}%</span></div>
      </div>
      <ComplianceGrid columns={COLUMNS} rows={rows} onSelectCell={onSelectCell} emptyMessage="No data for selected range" />
    </div>
  );
}