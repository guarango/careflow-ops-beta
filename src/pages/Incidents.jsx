import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Plus, Search, Lock, BarChart3 } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useAssignedClients } from "@/hooks/useAssignedClients";
import { useAuth } from "@/lib/AuthContext";
import NoDSPClientsState from "@/components/shared/NoDSPClientsState";
import IncidentForm from "@/components/incidents/IncidentForm";
import IncidentDetailDialog from "@/components/incidents/IncidentDetailDialog";
import IncidentTrends from "@/components/incidents/IncidentTrends";

export default function Incidents() {
  const { can, isDSP, isAdmin } = useRole();
  const { isDSPMode, assignedClientIds } = useAssignedClients();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [showTrends, setShowTrends] = useState(false);

  const queryClient = useQueryClient();
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => base44.entities.IncidentReport.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: houses = [] } = useQuery({
    queryKey: ["houses"],
    queryFn: () => base44.entities.House.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.IncidentReport.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["incidents"] }); setShowForm(false); setEditing(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.IncidentReport.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setSelected(null);
      setEditing(null);
      setShowForm(false);
    },
  });

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openDetail = (i) => setSelected(i);
  const openEdit = () => { setEditing(selected); setShowForm(true); };

  const handleSave = (data) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const handleDetailUpdate = (data) => {
    updateMutation.mutate({ id: selected.id, data });
    setSelected({ ...selected, ...data });
  };

  const visibleClients = isDSPMode ? clients.filter(c => assignedClientIds.includes(c.id)) : clients;
  const visibleIncidents = isDSPMode ? incidents.filter(i => assignedClientIds.includes(i.client_id)) : incidents;
  const filtered = visibleIncidents.filter(i =>
    `${i.client_name} ${i.type} ${i.severity} ${i.status}`.toLowerCase().includes(search.toLowerCase())
  );
  const canReview = can("changeIncidentStatus");

  if (isDSPMode && assignedClientIds.length === 0) return <NoDSPClientsState />;

  return (
    <div>
      <PageHeader
        title="Incident Reports"
        subtitle={isDSP ? "Your submitted reports" : `${incidents.length} reports`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTrends(!showTrends)}><BarChart3 className="w-4 h-4 mr-2" />Trends</Button>
            <Button onClick={openNew} className="bg-destructive hover:bg-destructive/90"><Plus className="w-4 h-4 mr-2" />Report Incident</Button>
          </div>
        }
      />

      {isDSP && (
        <div className="flex items-center gap-2 mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <span>Incidents you submit are sent to your supervisor for review. You cannot change the status of a submitted report.</span>
        </div>
      )}

      {showTrends && (
        <div className="mb-6">
          <IncidentTrends incidents={visibleIncidents} />
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search incidents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={AlertTriangle} title="No incidents" description="No incident reports have been filed." action={<Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />Report Incident</Button>} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i) => (
                  <TableRow key={i.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(i)}>
                    <TableCell className="font-medium">{i.client_name || "—"}</TableCell>
                    <TableCell className="text-sm">{i.type}</TableCell>
                    <TableCell><StatusBadge status={i.severity} /></TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{i.date}</TableCell>
                    <TableCell><StatusBadge status={i.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {showForm && (
        <IncidentForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
          editing={editing}
          clients={visibleClients}
          houses={houses}
          user={user}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {selected && !showForm && (
        <IncidentDetailDialog
          open={!!selected}
          incident={selected}
          onClose={() => setSelected(null)}
          onEdit={openEdit}
          onUpdate={handleDetailUpdate}
          canReview={canReview}
          reviewerName={user?.full_name || user?.email || "Manager"}
        />
      )}
    </div>
  );
}