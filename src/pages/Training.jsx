import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, GraduationCap } from "lucide-react";
import TrainingComplianceDashboard from "@/components/training/TrainingComplianceDashboard";
import StaffTrainingProfile from "@/components/training/StaffTrainingProfile";
import TrainingLibraryManager from "@/components/training/TrainingLibraryManager";
import RemediationManager from "@/components/training/RemediationManager";
import { getRequiredTrainingIds, calcComplianceScore, getEffectiveStatus } from "@/lib/trainingEngine";

export default function Training() {
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => base44.entities.StaffMember.filter({ status: "Active" }) });
  const { data: records = [] } = useQuery({ queryKey: ["training-records"], queryFn: () => base44.entities.TrainingRecord.list("-completed_date", 500) });
  const { data: library = [] } = useQuery({ queryKey: ["training-library"], queryFn: () => base44.entities.TrainingLibrary.list() });
  const { data: remediations = [] } = useQuery({ queryKey: ["remediations"], queryFn: () => base44.entities.RemediationPlan.filter({ status: "Active" }) });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.filter({ status: "Active" }) });

  const createRecord = useMutation({
    mutationFn: (data) => base44.entities.TrainingRecord.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training-records"] }),
  });
  const updateRecord = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingRecord.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training-records"] }),
  });
  const createRemediation = useMutation({
    mutationFn: (data) => base44.entities.RemediationPlan.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["remediations"] }),
  });
  const updateRemediation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RemediationPlan.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["remediations"] }),
  });

  // Build per-staff compliance scores
  const staffWithScores = useMemo(() => {
    return staff.map(s => {
      const staffRecords = records.filter(r => r.staff_id === s.id);
      const recordMap = {};
      staffRecords.forEach(r => { recordMap[r.training_id] = r; });
      const requiredIds = getRequiredTrainingIds(s.role, library);
      const score = calcComplianceScore(requiredIds, recordMap);
      const expiringSoon = staffRecords.filter(r => {
        if (!r.expiration_date) return false;
        const days = Math.ceil((new Date(r.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 90;
      }).length;
      const activeRemediations = remediations.filter(r => r.staff_id === s.id).length;
      return { ...s, complianceScore: score, expiringSoon, activeRemediations };
    });
  }, [staff, records, library, remediations]);

  const selectedStaff = staff.find(s => s.id === selectedStaffId);

  if (selectedStaffId && selectedStaff) {
    const staffRecords = records.filter(r => r.staff_id === selectedStaffId);
    const staffRemediations = remediations.filter(r => r.staff_id === selectedStaffId);
    return (
      <StaffTrainingProfile
        staff={selectedStaff}
        records={staffRecords}
        allRecords={records}
        remediations={staffRemediations}
        library={library}
        clients={clients}
        onBack={() => setSelectedStaffId(null)}
        onCreateRecord={(data) => createRecord.mutate(data)}
        onUpdateRecord={(id, data) => updateRecord.mutate({ id, data })}
        onCreateRemediation={(data) => createRemediation.mutate(data)}
        onUpdateRemediation={(id, data) => updateRemediation.mutate({ id, data })}
        saving={createRecord.isPending || updateRecord.isPending}
      />
    );
  }

  const filtered = staffWithScores.filter(s =>
    `${s.first_name} ${s.last_name} ${s.role}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Staff Training & Competency"
        subtitle={`${staffWithScores.filter(s => s.complianceScore >= 90).length} of ${staffWithScores.length} staff fully compliant`}
      />

      <Tabs defaultValue="dashboard">
        <TabsList className="mb-5">
          <TabsTrigger value="dashboard">Compliance Dashboard</TabsTrigger>
          <TabsTrigger value="staff">Staff Directory</TabsTrigger>
          <TabsTrigger value="remediation">Remediation Plans</TabsTrigger>
          <TabsTrigger value="library">Training Library</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <TrainingComplianceDashboard
            staffWithScores={staffWithScores}
            records={records}
            library={library}
            remediations={remediations}
            onSelectStaff={setSelectedStaffId}
          />
        </TabsContent>

        <TabsContent value="staff">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(s => (
              <StaffComplianceCard key={s.id} staff={s} onClick={() => setSelectedStaffId(s.id)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="remediation">
          <RemediationManager
            remediations={remediations}
            staff={staff}
            onUpdate={(id, data) => updateRemediation.mutate({ id, data })}
          />
        </TabsContent>

        <TabsContent value="library">
          <TrainingLibraryManager library={library} onRefresh={() => qc.invalidateQueries({ queryKey: ["training-library"] })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StaffComplianceCard({ staff, onClick }) {
  const score = staff.complianceScore;
  const color = score >= 90 ? "border-emerald-300 bg-emerald-50" : score >= 75 ? "border-amber-300 bg-amber-50" : "border-red-300 bg-red-50";
  const scoreColor = score >= 90 ? "text-emerald-700" : score >= 75 ? "text-amber-700" : "text-red-700";

  return (
    <button type="button" onClick={onClick} className={`text-left border-2 rounded-xl p-4 hover:shadow-sm transition-all ${color}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-sm">{staff.first_name} {staff.last_name}</p>
        <span className={`text-lg font-bold ${scoreColor}`}>{score}%</span>
      </div>
      <p className="text-xs text-muted-foreground">{staff.role}</p>
      <div className="mt-2 flex gap-2 flex-wrap">
        {staff.expiringSoon > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{staff.expiringSoon} expiring soon</span>}
        {staff.activeRemediations > 0 && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{staff.activeRemediations} remediation{staff.activeRemediations !== 1 ? "s" : ""}</span>}
      </div>
      <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${score >= 90 ? "bg-emerald-500" : score >= 75 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
      </div>
    </button>
  );
}