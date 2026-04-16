import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, Search, ArrowLeft, ChevronRight, AlertTriangle, Clock, LayoutGrid, List } from "lucide-react";
import { useAssignedClients } from "@/hooks/useAssignedClients";
import NoDSPClientsState from "@/components/shared/NoDSPClientsState";
import ClientGoalCard from "@/components/goals/ClientGoalCard";
import GoalFormDialog from "@/components/goals/GoalFormDialog";
import GoalDetailView from "@/components/goals/GoalDetailView";
import GoalAlerts from "@/components/goals/GoalAlerts";
import GoalListView from "@/components/goals/GoalListView";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO, isValid } from "date-fns";

const DOMAIN_COLORS = {
  "Communication": "bg-blue-100 text-blue-700 border-blue-200",
  "Activities of Daily Living": "bg-green-100 text-green-700 border-green-200",
  "Community Integration": "bg-teal-100 text-teal-700 border-teal-200",
  "Social Skills": "bg-purple-100 text-purple-700 border-purple-200",
  "Vocational/Employment": "bg-orange-100 text-orange-700 border-orange-200",
  "Health & Wellness": "bg-pink-100 text-pink-700 border-pink-200",
  "Behavioral Support": "bg-red-100 text-red-700 border-red-200",
  "Self-Advocacy": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Mobility & Motor Skills": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Leisure & Recreation": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Other": "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_COLORS = {
  "Active": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Mastered": "bg-sky-100 text-sky-700 border-sky-200",
  "Discontinued": "bg-gray-100 text-gray-600 border-gray-200",
  "On Hold": "bg-amber-100 text-amber-700 border-amber-200",
};

const PRIORITY_DOT = { High: "bg-red-500", Medium: "bg-amber-400", Low: "bg-slate-300" };

function hasAlerts(goal) {
  const entries = goal.progress_entries || [];
  if (goal.status !== "Active") return false;
  if (entries.length === 0) return true;
  const last = entries[entries.length - 1]?.date;
  if (last) {
    const d = parseISO(last);
    if (isValid(d) && differenceInDays(new Date(), d) >= 14) return true;
  }
  if (goal.target_date) {
    const d = parseISO(goal.target_date);
    if (isValid(d) && differenceInDays(d, new Date()) <= 30) return true;
  }
  return false;
}

const EMPTY_FORM = {
  client_id: "", client_name: "", goal_title: "", domain: "", goal_type: "",
  priority: "Medium", status: "Active", connection_to_personal_outcome: "",
  persons_own_words: "", personal_strengths: "", preferred_strategies: "",
  preferred_people: "", best_times_settings: "", trauma_considerations: "",
  baseline_description: "", baseline_date: "", baseline_assessed_by: "",
  objectives: [], mastery_criteria: "", prompt_level_baseline: "", prompt_fading_plan: "",
  goal_narrative: "", primary_measurement_method: "", secondary_measurement_method: "",
  minimum_trials_per_session: "", data_collection_schedule: "", data_collector_role: "",
  data_collection_instructions: "", goal_author: "", supervising_clinician: "",
  start_date: "", target_date: "", next_review_date: "", regulatory_framework: "",
  team_notes: "", progress_entries: [],
};

export default function Goals() {
  const { isDSPMode, assignedClientIds } = useAssignedClients();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"

  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({ queryKey: ["goals"], queryFn: () => base44.entities.ClientGoal.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientGoal.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); closeDialog(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientGoal.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); closeDialog(); },
  });

  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(EMPTY_FORM); };
  const openNew = (clientPrefill) => {
    const f = clientPrefill
      ? { ...EMPTY_FORM, client_id: clientPrefill.id, client_name: `${clientPrefill.first_name} ${clientPrefill.last_name}` }
      : EMPTY_FORM;
    setForm(f); setEditing(null); setShowDialog(true);
  };
  const openEdit = (g) => { setForm({ ...EMPTY_FORM, ...g }); setEditing(g); setShowDialog(true); setSelectedGoal(null); };

  const handleSave = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const visibleGoals = isDSPMode ? goals.filter(g => assignedClientIds.includes(g.client_id)) : goals;
  const visibleClients = isDSPMode ? clients.filter(c => assignedClientIds.includes(c.id)) : clients;
  const activeClients = visibleClients.filter(c => c.status === "Active" || !c.status);

  const searchLower = search.toLowerCase();
  const filteredClients = activeClients.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchLower)
  );

  const currentClient = selectedClient ? clients.find(c => c.id === selectedClient.id) || selectedClient : null;
  const clientGoals = currentClient ? visibleGoals.filter(g => g.client_id === currentClient.id) : [];
  const activeGoals = clientGoals.filter(g => g.status === "Active");
  const inactiveGoals = clientGoals.filter(g => g.status !== "Active");

  if (isDSPMode && assignedClientIds.length === 0) return <NoDSPClientsState />;

  const AVATAR_COLORS = [
    "bg-blue-100 text-blue-700","bg-purple-100 text-purple-700","bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700","bg-pink-100 text-pink-700","bg-teal-100 text-teal-700",
    "bg-indigo-100 text-indigo-700","bg-rose-100 text-rose-700",
  ];
  const getColor = (id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  // ── GOAL DETAIL VIEW ─────────────────────────────
  if (selectedGoal) {
    const liveGoal = visibleGoals.find(g => g.id === selectedGoal.id) || selectedGoal;
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <button type="button" onClick={() => setSelectedGoal(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>{currentClient ? `${currentClient.first_name} ${currentClient.last_name}` : "All Clients"}</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[300px]">{liveGoal.goal_title}</span>
        </div>
        <GoalDetailView
          goal={liveGoal}
          onEdit={openEdit}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ["goals"] })}
        />
      </div>
    );
  }

  // ── CLIENT GOAL LIST ─────────────────────────────
  if (selectedClient) {
    return (
      <div>
        <button type="button" onClick={() => setSelectedClient(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to all clients
        </button>

        {/* Client Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {currentClient.photo_url ? (
              <img src={currentClient.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0", getColor(currentClient.id))}>
                {currentClient.first_name[0]}{currentClient.last_name[0]}
              </div>
            )}
            <div>
              <p className="font-bold text-lg">{currentClient.first_name} {currentClient.last_name}</p>
              <p className="text-xs text-muted-foreground">{clientGoals.length} goal{clientGoals.length !== 1 ? "s" : ""} · {activeGoals.length} active</p>
            </div>
          </div>
          <Button size="sm" onClick={() => openNew(currentClient)} className="gap-1.5">
            <Plus className="w-4 h-4" />Add Goal
          </Button>
        </div>

        {clientGoals.length === 0 ? (
          <EmptyState icon={Target} title="No goals on file" description="Add the first ISP goal for this client." action={<Button size="sm" onClick={() => openNew(currentClient)}><Plus className="w-4 h-4 mr-1" />Add Goal</Button>} />
        ) : (
          <div className="space-y-2">
            {activeGoals.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Active Goals ({activeGoals.length})</p>
                {activeGoals.map(g => <GoalListItem key={g.id} goal={g} onClick={() => setSelectedGoal(g)} onEdit={openEdit} />)}
              </>
            )}
            {inactiveGoals.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Other Goals ({inactiveGoals.length})</p>
                {inactiveGoals.map(g => <GoalListItem key={g.id} goal={g} onClick={() => setSelectedGoal(g)} onEdit={openEdit} />)}
              </div>
            )}
          </div>
        )}

        <GoalFormDialog
          open={showDialog}
          onClose={closeDialog}
          editing={editing}
          form={form}
          setForm={setForm}
          clients={visibleClients}
          onSave={handleSave}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    );
  }

  // ── CLIENT GRID ───────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Client Goals"
        subtitle={`${visibleGoals.length} goals tracked across ${activeClients.length} clients`}
        action={<Button onClick={() => openNew()} className="gap-1.5"><Plus className="w-4 h-4" />Add Goal</Button>}
      />

      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
            </div>
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredClients.length === 0 ? (
        <EmptyState icon={Target} title="No clients found" description="Add ISP goals to start tracking client progress." action={<Button onClick={() => openNew()} size="sm"><Plus className="w-4 h-4 mr-1" />Add Goal</Button>} />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => (
            <ClientGoalCard
              key={client.id}
              client={client}
              goals={visibleGoals.filter(g => g.client_id === client.id)}
              onClick={() => setSelectedClient(client)}
            />
          ))}
        </div>
      ) : (
        <GoalListView
          goals={visibleGoals.filter(g => {
            const client = clients.find(c => c.id === g.client_id);
            if (!client) return false;
            return `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchLower);
          })}
          clients={clients}
          onSelectClient={setSelectedClient}
          onSelectGoal={setSelectedGoal}
          onEdit={openEdit}
        />
      )}

      <GoalFormDialog
        open={showDialog}
        onClose={closeDialog}
        editing={editing}
        form={form}
        setForm={setForm}
        clients={visibleClients}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

// ── Goal list item row component ──────────────────────────────────────────────
function GoalListItem({ goal, onClick, onEdit }) {
  const alertCount = hasAlerts(goal) ? 1 : 0;
  const entries = goal.progress_entries || [];
  const lastEntry = entries[entries.length - 1];

  return (
    <div
      className="border border-border rounded-xl px-4 py-3 bg-card hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", PRIORITY_DOT[goal.priority] || "bg-slate-300")} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="font-medium text-sm leading-snug">{goal.goal_title}</span>
              {alertCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge variant="outline" className={`text-[9px] py-0 h-4 border ${DOMAIN_COLORS[goal.domain] || DOMAIN_COLORS.Other}`}>{goal.domain}</Badge>
              {goal.goal_type && <Badge variant="outline" className="text-[9px] py-0 h-4">{goal.goal_type}</Badge>}
              <Badge variant="outline" className={`text-[9px] py-0 h-4 border ${STATUS_COLORS[goal.status] || ""}`}>{goal.status}</Badge>
            </div>
            {lastEntry && (
              <p className="text-[11px] text-muted-foreground mt-1">
                <Clock className="w-3 h-3 inline mr-1" />Last: {lastEntry.date} — {lastEntry.score}
              </p>
            )}
            {goal.mastery_criteria && (
              <p className="text-[11px] text-muted-foreground mt-0.5">Target: {goal.mastery_criteria}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={e => { e.stopPropagation(); onEdit(goal); }}>Edit</Button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}