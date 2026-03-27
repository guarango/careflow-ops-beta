import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Heart } from "lucide-react";
import QoLClientGrid from "@/components/qol/QoLClientGrid";
import QoLClientView from "@/components/qol/QoLClientView";
import QoLAgencyDashboard from "@/components/qol/QoLAgencyDashboard";

export default function QoL() {
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("clients");
  const qc = useQueryClient();

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.filter({ status: "Active" }) });
  const { data: assessments = [] } = useQuery({ queryKey: ["qol-assessments"], queryFn: () => base44.entities.QoLAssessment.list("-assessment_date", 500) });
  const { data: lifeVisions = [] } = useQuery({ queryKey: ["life-visions"], queryFn: () => base44.entities.LifeVision.list("-captured_date", 200) });
  const { data: contacts = [] } = useQuery({ queryKey: ["network-contacts"], queryFn: () => base44.entities.NetworkContact.list() });
  const { data: activities = [] } = useQuery({ queryKey: ["community-activities"], queryFn: () => base44.entities.CommunityActivity.list("-date", 500) });
  const { data: employment = [] } = useQuery({ queryKey: ["employment-records"], queryFn: () => base44.entities.EmploymentRecord.filter({ is_current: true }) });
  const { data: milestones = [] } = useQuery({ queryKey: ["qol-milestones"], queryFn: () => base44.entities.QoLMilestone.list("-milestone_date", 300) });
  const { data: goals = [] } = useQuery({ queryKey: ["goals"], queryFn: () => base44.entities.ClientGoal.filter({ status: "Active" }) });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents-qol"], queryFn: () => base44.entities.BehaviorIncident.list("-date", 300) });

  const createAssessment = useMutation({ mutationFn: d => base44.entities.QoLAssessment.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["qol-assessments"] }) });
  const updateAssessment = useMutation({ mutationFn: ({ id, d }) => base44.entities.QoLAssessment.update(id, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["qol-assessments"] }) });
  const createVision = useMutation({ mutationFn: d => base44.entities.LifeVision.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["life-visions"] }) });
  const updateVision = useMutation({ mutationFn: ({ id, d }) => base44.entities.LifeVision.update(id, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["life-visions"] }) });
  const createContact = useMutation({ mutationFn: d => base44.entities.NetworkContact.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["network-contacts"] }) });
  const updateContact = useMutation({ mutationFn: ({ id, d }) => base44.entities.NetworkContact.update(id, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["network-contacts"] }) });
  const createActivity = useMutation({ mutationFn: d => base44.entities.CommunityActivity.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["community-activities"] }) });
  const createEmployment = useMutation({ mutationFn: d => base44.entities.EmploymentRecord.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["employment-records"] }) });
  const updateEmployment = useMutation({ mutationFn: ({ id, d }) => base44.entities.EmploymentRecord.update(id, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["employment-records"] }) });
  const createMilestone = useMutation({ mutationFn: d => base44.entities.QoLMilestone.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["qol-milestones"] }) });

  const selectedClient = clients.find(c => c.id === selectedClientId);

  if (selectedClientId && selectedClient) {
    return (
      <QoLClientView
        client={selectedClient}
        assessments={assessments.filter(a => a.client_id === selectedClientId)}
        allAssessments={assessments}
        lifeVision={lifeVisions.find(v => v.client_id === selectedClientId)}
        contacts={contacts.filter(c => c.client_id === selectedClientId)}
        activities={activities.filter(a => a.client_id === selectedClientId)}
        employment={employment.find(e => e.client_id === selectedClientId)}
        milestones={milestones.filter(m => m.client_id === selectedClientId)}
        goals={goals.filter(g => g.client_id === selectedClientId)}
        incidents={incidents.filter(i => i.client_id === selectedClientId)}
        onBack={() => setSelectedClientId(null)}
        onCreateAssessment={d => createAssessment.mutate(d)}
        onUpdateAssessment={(id, d) => updateAssessment.mutate({ id, d })}
        onSaveVision={(data, id) => id ? updateVision.mutate({ id, d: data }) : createVision.mutate(data)}
        onCreateContact={d => createContact.mutate(d)}
        onUpdateContact={(id, d) => updateContact.mutate({ id, d })}
        onCreateActivity={d => createActivity.mutate(d)}
        onSaveEmployment={(data, id) => id ? updateEmployment.mutate({ id, d: data }) : createEmployment.mutate(data)}
        onCreateMilestone={d => createMilestone.mutate(d)}
      />
    );
  }

  const filtered = clients.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalCie = employment.filter(e => e.status === "Competitive Integrated Employment").length;

  return (
    <div>
      <PageHeader
        title="Quality of Life Outcomes"
        subtitle="Schalock & Verdugo 8-Domain Framework · HCBS Quality Measures"
        action={
          <div className="flex gap-2 items-center">
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-medium">{totalCie} in Competitive Employment</span>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="mt-1">
        <TabsList className="mb-5">
          <TabsTrigger value="clients">Individual Outcomes</TabsTrigger>
          <TabsTrigger value="agency">Agency Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <QoLClientGrid
            clients={filtered}
            assessments={assessments}
            contacts={contacts}
            activities={activities}
            employment={employment}
            milestones={milestones}
            onSelect={setSelectedClientId}
          />
        </TabsContent>

        <TabsContent value="agency">
          <QoLAgencyDashboard
            clients={clients}
            assessments={assessments}
            contacts={contacts}
            activities={activities}
            employment={employment}
            goals={goals}
            lifeVisions={lifeVisions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}