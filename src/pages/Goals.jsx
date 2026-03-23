import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, ChevronDown, ChevronRight, PlusCircle } from "lucide-react";
import { useAssignedClients } from "@/hooks/useAssignedClients";
import NoDSPClientsState from "@/components/shared/NoDSPClientsState";

const domains = ["Communication", "Self-Care", "Mobility", "Social Skills", "Vocational", "Behavioral", "Academic", "Community Integration", "Health & Safety", "Other"];
const goalStatuses = ["Active", "Mastered", "Discontinued", "On Hold"];

const domainColors = {
  Communication: "bg-blue-100 text-blue-700 border-blue-200",
  "Self-Care": "bg-green-100 text-green-700 border-green-200",
  Mobility: "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Social Skills": "bg-purple-100 text-purple-700 border-purple-200",
  Vocational: "bg-orange-100 text-orange-700 border-orange-200",
  Behavioral: "bg-red-100 text-red-700 border-red-200",
  Academic: "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Community Integration": "bg-teal-100 text-teal-700 border-teal-200",
  "Health & Safety": "bg-pink-100 text-pink-700 border-pink-200",
  Other: "bg-gray-100 text-gray-700 border-gray-200",
};

const emptyGoal = { client_id: "", client_name: "", goal_title: "", domain: "", description: "", baseline: "", target: "", method: "", frequency: "Each Session", start_date: "", target_date: "", status: "Active", progress_entries: [] };

function ProgressLogDialog({ goal, onClose, onSave }) {
  const [entry, setEntry] = useState({ date: new Date().toISOString().split("T")[0], score: "", notes: "", recorded_by: "" });

  const handleSave = () => {
    const updated = { ...goal, progress_entries: [...(goal.progress_entries || []), entry] };
    onSave(updated);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log Progress — {goal.goal_title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Date</Label><Input type="date" value={entry.date} onChange={e => setEntry({ ...entry, date: e.target.value })} /></div>
          <div><Label>Score / Result</Label><Input value={entry.score} onChange={e => setEntry({ ...entry, score: e.target.value })} placeholder="e.g. 3/5 trials, 80%, Independent" /></div>
          <div><Label>Recorded By</Label><Input value={entry.recorded_by} onChange={e => setEntry({ ...entry, recorded_by: e.target.value })} /></div>
          <div><Label>Notes</Label><Textarea value={entry.notes} onChange={e => setEntry({ ...entry, notes: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!entry.score}>Log Progress</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GoalCard({ goal, onEdit, onLogProgress }) {
  const [expanded, setExpanded] = useState(false);
  const entries = goal.progress_entries || [];
  const lastEntry = entries[entries.length - 1];

  return (
    <Card className="mb-3">
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button onClick={() => setExpanded(!expanded)} className="mt-0.5 text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-sm">{goal.goal_title}</span>
                <Badge variant="outline" className={`text-[10px] border ${domainColors[goal.domain] || domainColors.Other}`}>{goal.domain}</Badge>
                <StatusBadge status={goal.status} />
              </div>
              {lastEntry && (
                <p className="text-xs text-muted-foreground mt-1">Last: {lastEntry.date} — {lastEntry.score}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onLogProgress(goal)}>
              <PlusCircle className="w-3.5 h-3.5 mr-1" />Log
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onEdit(goal)}>Edit</Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="ml-7 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {goal.description && <div className="col-span-2"><span className="text-muted-foreground font-medium">Description: </span>{goal.description}</div>}
              {goal.baseline && <div><span className="text-muted-foreground font-medium">Baseline: </span>{goal.baseline}</div>}
              {goal.target && <div><span className="text-muted-foreground font-medium">Target: </span>{goal.target}</div>}
              {goal.method && <div><span className="text-muted-foreground font-medium">Method: </span>{goal.method}</div>}
              {goal.frequency && <div><span className="text-muted-foreground font-medium">Frequency: </span>{goal.frequency}</div>}
              {goal.target_date && <div><span className="text-muted-foreground font-medium">Target Date: </span>{goal.target_date}</div>}
            </div>
            {entries.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Progress Log ({entries.length} entries)</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {[...entries].reverse().map((e, i) => (
                    <div key={i} className="text-xs bg-muted rounded-md px-3 py-2 flex gap-3">
                      <span className="text-muted-foreground">{e.date}</span>
                      <span className="font-medium">{e.score}</span>
                      {e.notes && <span className="text-muted-foreground truncate">{e.notes}</span>}
                      {e.recorded_by && <span className="text-muted-foreground ml-auto">— {e.recorded_by}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function Goals() {
  const { isDSPMode, assignedClientIds } = useAssignedClients();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyGoal);
  const [loggingGoal, setLoggingGoal] = useState(null);
  const [selectedClient, setSelectedClient] = useState("all");

  const queryClient = useQueryClient();
  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn: () => base44.entities.ClientGoal.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientGoal.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientGoal.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); closeDialog(); setLoggingGoal(null); },
  });

  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(emptyGoal); };
  const openNew = () => { setForm(emptyGoal); setEditing(null); setShowDialog(true); };
  const openEdit = (g) => { setForm(g); setEditing(g); setShowDialog(true); };

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setForm({ ...form, client_id: clientId, client_name: client ? `${client.first_name} ${client.last_name}` : "" });
  };

  const handleSave = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const visibleGoals = isDSPMode ? goals.filter(g => assignedClientIds.includes(g.client_id)) : goals;
  const filteredGoals = selectedClient === "all" ? visibleGoals : visibleGoals.filter(g => g.client_id === selectedClient);

  // Group by client
  const grouped = filteredGoals.reduce((acc, g) => {
    const key = g.client_name || "Unknown Client";
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  const visibleClients = isDSPMode ? clients.filter(c => assignedClientIds.includes(c.id)) : clients;
  const activeClients = visibleClients.filter(c => c.status === "Active");

  if (isDSPMode && assignedClientIds.length === 0) return <NoDSPClientsState />;

  return (
    <div>
      <PageHeader
        title="Client Goals"
        subtitle={`${visibleGoals.length} goals tracked`}
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add Goal</Button>}
      />

      {/* Client filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <Button variant={selectedClient === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedClient("all")}>All Clients</Button>
        {activeClients.map(c => (
          <Button key={c.id} variant={selectedClient === c.id ? "default" : "outline"} size="sm" onClick={() => setSelectedClient(c.id)}>
            {c.first_name} {c.last_name}
          </Button>
        ))}
      </div>

      {filteredGoals.length === 0 ? (
        <EmptyState icon={Target} title="No goals found" description="Add ISP goals to start tracking client progress." action={<Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Goal</Button>} />
      ) : (
        Object.entries(grouped).map(([clientName, clientGoals]) => (
          <div key={clientName} className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{clientName} — {clientGoals.length} goals</h2>
            {clientGoals.map(g => (
              <GoalCard key={g.id} goal={g} onEdit={openEdit} onLogProgress={setLoggingGoal} />
            ))}
          </div>
        ))
      )}

      {loggingGoal && (
        <ProgressLogDialog
          goal={loggingGoal}
          onClose={() => setLoggingGoal(null)}
          onSave={(updated) => updateMutation.mutate({ id: loggingGoal.id, data: updated })}
        />
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Goal" : "Add Goal"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={handleClientSelect}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{visibleClients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Goal Title *</Label><Input value={form.goal_title} onChange={e => setForm({ ...form, goal_title: e.target.value })} placeholder="e.g. Will independently brush teeth" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Domain *</Label>
                <Select value={form.domain} onValueChange={v => setForm({ ...form, domain: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{domains.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{goalStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Baseline</Label><Input value={form.baseline} onChange={e => setForm({ ...form, baseline: e.target.value })} placeholder="Starting level" /></div>
              <div><Label>Target / Mastery Criteria</Label><Input value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} placeholder="e.g. 80% over 3 sessions" /></div>
              <div><Label>Method of Measurement</Label><Input value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} placeholder="e.g. Trial data" /></div>
              <div><Label>Tracking Frequency</Label><Input value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} placeholder="e.g. Each Session" /></div>
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>Target Date</Label><Input type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.client_id || !form.goal_title || !form.domain}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}