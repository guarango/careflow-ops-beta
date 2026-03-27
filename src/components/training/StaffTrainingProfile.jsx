import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, AlertTriangle, CheckCircle2, Clock, Plus, ShieldAlert } from "lucide-react";
import TrainingRecordList from "./TrainingRecordList";
import TrainingLogDialog from "./TrainingLogDialog";
import CompetencyCheckoffDialog from "./CompetencyCheckoffDialog";
import { DEFAULT_AGENCY_TRAININGS, ROLE_SPECIFIC_TRAININGS, CLIENT_SPECIFIC_TRAININGS, getEffectiveStatus, daysUntilExpiry, getRequiredTrainingIds, calcComplianceScore } from "@/lib/trainingEngine";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function StaffTrainingProfile({ staff, records, allRecords, remediations, library, clients, onBack, onCreateRecord, onUpdateRecord, onCreateRemediation, onUpdateRemediation, saving }) {
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [showCheckoffDialog, setShowCheckoffDialog] = useState(false);
  const [editRecord, setEditRecord] = useState(null);

  const recordMap = useMemo(() => {
    const m = {};
    records.forEach(r => { m[r.training_id] = r; });
    return m;
  }, [records]);

  const requiredIds = getRequiredTrainingIds(staff.role, library);
  const score = calcComplianceScore(requiredIds, recordMap);

  const universalTrainings = DEFAULT_AGENCY_TRAININGS;
  const roleTrainings = ROLE_SPECIFIC_TRAININGS[staff.role] || [];
  const assignedClientIds = (staff.assigned_client_ids || []);
  const assignedClients = clients.filter(c => assignedClientIds.includes(c.id));

  const expiringSoon = records.filter(r => {
    if (!r.expiration_date) return false;
    const d = daysUntilExpiry(r.expiration_date);
    return d !== null && d >= 0 && d <= 90;
  });

  const handleLogSave = (data) => {
    if (data.id) onUpdateRecord(data.id, data);
    else onCreateRecord({ ...data, staff_id: staff.id, staff_name: `${staff.first_name} ${staff.last_name}` });
    setShowLogDialog(false);
    setEditRecord(null);
  };

  const handleExportTranscript = () => {
    const lines = [
      `TRAINING TRANSCRIPT — ${staff.first_name} ${staff.last_name}`,
      `Role: ${staff.role} | Hire Date: ${staff.hire_date || "—"} | Generated: ${format(new Date(), "MMMM d, yyyy")}`,
      `Compliance Score: ${score}%`,
      "",
      "COMPLETED TRAININGS:",
      ...records.filter(r => r.status === "Completed").map(r =>
        `• ${r.training_title} | Completed: ${r.completed_date} | Expires: ${r.expiration_date || "N/A"} | Verified by: ${r.verified_by || "—"} | Score: ${r.score != null ? r.score + "%" : "—"}`
      ),
      "",
      "CERTIFICATIONS:",
      ...records.filter(r => r.certification_number).map(r =>
        `• ${r.training_title} | Cert #: ${r.certification_number} | Issued by: ${r.issuing_organization || "—"} | Expires: ${r.expiration_date || "—"}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${staff.first_name}_${staff.last_name}_TrainingTranscript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scoreColor = score >= 90 ? "text-emerald-600" : score >= 75 ? "text-amber-600" : "text-red-600";
  const borderColor = score >= 90 ? "border-emerald-300 bg-emerald-50" : score >= 75 ? "border-amber-300 bg-amber-50" : "border-red-300 bg-red-50";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />All Staff
        </button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportTranscript} className="gap-1.5"><Download className="w-4 h-4" />Export Transcript</Button>
          <Button size="sm" onClick={() => { setEditRecord(null); setShowLogDialog(true); }} className="gap-1.5"><Plus className="w-4 h-4" />Log Training</Button>
        </div>
      </div>

      {/* Header card */}
      <div className={`border-2 rounded-xl p-4 mb-5 ${borderColor}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-bold text-lg">{staff.first_name} {staff.last_name}</h2>
            <p className="text-sm text-muted-foreground">{staff.role} · {staff.employment_type || "Full Time"}</p>
            {staff.hire_date && <p className="text-xs text-muted-foreground">Hired {format(new Date(staff.hire_date), "MMMM d, yyyy")}</p>}
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${scoreColor}`}>{score}%</p>
            <p className="text-xs text-muted-foreground">Compliance Score</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {expiringSoon.length > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />{expiringSoon.length} expiring soon</span>}
          {remediations.length > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{remediations.length} active remediation{remediations.length !== 1 ? "s" : ""}</span>}
          {remediations.some(r => r.hr_flag) && <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold"><ShieldAlert className="w-3 h-3" />HR Flag</span>}
        </div>
      </div>

      <Tabs defaultValue="universal">
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="universal">Agency-Universal</TabsTrigger>
          <TabsTrigger value="role">Role-Specific</TabsTrigger>
          {assignedClients.length > 0 && <TabsTrigger value="clients">Client-Specific</TabsTrigger>}
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="remediation">Remediation</TabsTrigger>
          <TabsTrigger value="history">Full History</TabsTrigger>
        </TabsList>

        <TabsContent value="universal">
          <TrainingRecordList
            trainings={universalTrainings}
            records={records}
            onLogTraining={(t) => { setEditRecord({ training_id: t.id, training_title: t.title, training_category: t.category }); setShowLogDialog(true); }}
            onCheckoff={(r) => { setEditRecord(r); setShowCheckoffDialog(true); }}
          />
        </TabsContent>

        <TabsContent value="role">
          {roleTrainings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 border-dashed border-2 border-border rounded-xl">No role-specific trainings defined for {staff.role}.</p>
          ) : (
            <TrainingRecordList
              trainings={roleTrainings}
              records={records}
              onLogTraining={(t) => { setEditRecord({ training_id: t.id, training_title: t.title, training_category: t.category }); setShowLogDialog(true); }}
              onCheckoff={(r) => { setEditRecord(r); setShowCheckoffDialog(true); }}
            />
          )}
        </TabsContent>

        {assignedClients.length > 0 && (
          <TabsContent value="clients">
            <div className="space-y-5">
              {assignedClients.map(client => {
                const clientRecords = records.filter(r => r.client_id === client.id);
                const clientMap = {};
                clientRecords.forEach(r => { clientMap[r.training_id] = r; });
                const complete = CLIENT_SPECIFIC_TRAININGS.filter(t => getEffectiveStatus(clientMap[t.id]) === "Completed").length;
                const eligible = complete === CLIENT_SPECIFIC_TRAININGS.length;
                return (
                  <div key={client.id}>
                    <div className={`flex items-center gap-2 mb-2 px-3 py-2 rounded-xl border-2 ${eligible ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                      {eligible ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                      <p className="font-semibold text-sm">{client.first_name} {client.last_name}</p>
                      <Badge variant="outline" className={cn("text-xs ml-auto", eligible ? "border-emerald-300 text-emerald-700" : "border-red-300 text-red-700")}>
                        {eligible ? "Schedulable" : `${complete}/${CLIENT_SPECIFIC_TRAININGS.length} Complete`}
                      </Badge>
                    </div>
                    <TrainingRecordList
                      trainings={CLIENT_SPECIFIC_TRAININGS.map(t => ({ ...t, title: `${t.title} — ${client.first_name} ${client.last_name}` }))}
                      records={clientRecords}
                      onLogTraining={(t) => { setEditRecord({ training_id: t.id.replace("-client",""), training_title: t.title, training_category: "Client-Specific", client_id: client.id, client_name: `${client.first_name} ${client.last_name}` }); setShowLogDialog(true); }}
                      onCheckoff={(r) => { setEditRecord(r); setShowCheckoffDialog(true); }}
                    />
                  </div>
                );
              })}
            </div>
          </TabsContent>
        )}

        <TabsContent value="certifications">
          <TrainingRecordList
            trainings={records.filter(r => r.certification_number || r.issuing_organization).map(r => ({ id: r.training_id, title: r.training_title, category: "Certification" }))}
            records={records}
            onLogTraining={() => { setEditRecord({ training_category: "Certification" }); setShowLogDialog(true); }}
            onCheckoff={() => {}}
            showCertDetails
          />
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => { setEditRecord({ training_category: "Certification" }); setShowLogDialog(true); }} className="gap-1">
              <Plus className="w-3.5 h-3.5" />Add Certification
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="remediation">
          {remediations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 border-dashed border-2 border-border rounded-xl">No active remediation plans.</p>
          ) : (
            <div className="space-y-3">
              {remediations.map(r => (
                <RemediationCard key={r.id} plan={r} onUpdate={(data) => onUpdateRemediation(r.id, data)} />
              ))}
            </div>
          )}
          <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => onCreateRemediation({
            staff_id: staff.id,
            staff_name: `${staff.first_name} ${staff.last_name}`,
            training_title: "",
            status: "Active",
            cycle_number: 1,
            steps: [],
          })}>
            <Plus className="w-3.5 h-3.5" />Create Remediation Plan
          </Button>
        </TabsContent>

        <TabsContent value="history">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-left text-muted-foreground">{["Training","Category","Status","Completed","Expires","Score","Verified By"].map(h => <th key={h} className="pb-2 pr-3 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {[...records].sort((a, b) => new Date(b.completed_date || 0) - new Date(a.completed_date || 0)).map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 pr-3 font-medium">{r.training_title}</td>
                    <td className="py-2 pr-3"><Badge variant="outline" className="text-[10px]">{r.training_category}</Badge></td>
                    <td className="py-2 pr-3"><StatusPill status={getEffectiveStatus(r)} /></td>
                    <td className="py-2 pr-3">{r.completed_date || "—"}</td>
                    <td className="py-2 pr-3">{r.expiration_date || "—"}</td>
                    <td className="py-2 pr-3">{r.score != null ? `${r.score}%` : "—"}</td>
                    <td className="py-2 pr-3">{r.verified_by || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {showLogDialog && (
        <TrainingLogDialog
          initialData={editRecord}
          staffName={`${staff.first_name} ${staff.last_name}`}
          onSave={handleLogSave}
          onClose={() => { setShowLogDialog(false); setEditRecord(null); }}
          saving={saving}
        />
      )}
      {showCheckoffDialog && editRecord && (
        <CompetencyCheckoffDialog
          record={editRecord}
          onSave={(data) => { if (data.id) onUpdateRecord(data.id, data); setShowCheckoffDialog(false); setEditRecord(null); }}
          onClose={() => { setShowCheckoffDialog(false); setEditRecord(null); }}
        />
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const map = { Completed: "bg-emerald-100 text-emerald-700", Expired: "bg-red-100 text-red-700", "Not Started": "bg-slate-100 text-slate-500", Failed: "bg-red-100 text-red-700", "In Progress": "bg-blue-100 text-blue-700" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[status] || "bg-slate-100 text-slate-500"}`}>{status}</span>;
}

function RemediationCard({ plan, onUpdate }) {
  return (
    <div className={cn("border-2 rounded-xl p-4", plan.hr_flag ? "border-red-300 bg-red-50" : plan.status === "Overdue" ? "border-amber-300 bg-amber-50" : "border-border")}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-sm">{plan.training_title}</p>
          {plan.gap_description && <p className="text-xs text-muted-foreground mt-0.5">{plan.gap_description}</p>}
        </div>
        <div className="flex gap-1.5">
          <Badge variant="outline" className="text-xs">Cycle {plan.cycle_number}</Badge>
          {plan.hr_flag && <Badge className="text-xs bg-red-100 text-red-800 border-red-300"><ShieldAlert className="w-3 h-3 mr-0.5" />HR Flag</Badge>}
        </div>
      </div>
      {(plan.steps || []).map((step, i) => (
        <div key={i} className="flex items-center gap-2 text-xs mb-1">
          <input type="checkbox" checked={step.completed} onChange={e => {
            const steps = [...plan.steps]; steps[i] = { ...steps[i], completed: e.target.checked };
            onUpdate({ ...plan, steps });
          }} />
          <span className={step.completed ? "line-through text-muted-foreground" : ""}>{step.step}</span>
          {step.due_date && <span className="text-muted-foreground ml-auto">{step.due_date}</span>}
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => onUpdate({ ...plan, status: "Completed" })}>Mark Complete</Button>
      </div>
    </div>
  );
}