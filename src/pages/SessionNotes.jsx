import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Search, ClipboardCheck, AlertTriangle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { useAssignedClients } from "@/hooks/useAssignedClients";
import { useRole } from "@/hooks/useRole";
import NoDSPClientsState from "@/components/shared/NoDSPClientsState";
import SessionEntryForm from "@/components/sessionnotes/SessionEntryForm";
import SupervisorReviewPanel from "@/components/sessionnotes/SupervisorReviewPanel";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

// ── Late note check ──
function checkIsLate(note) {
  if (!note || note.status === "Approved" || note.status === "Submitted") return false;
  if (!note.date) return false;
  // Default deadline: end of the same day (23:59)
  const deadline = new Date(note.date + "T23:59:59");
  return new Date() > deadline;
}

export default function SessionNotes() {
  const { isDSPMode, assignedClientIds } = useAssignedClients();
  const { can } = useRole();
  const { user } = useAuth();
  const canApproveNotes = can("approveSessionNotes");
  const canAddAddendum = can("approveSessionNotes"); // admins/managers

  const [view, setView] = useState("list"); // "list" | "entry" | "review"
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("notes");

  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["session-notes"],
    queryFn: () => base44.entities.SessionNote.list("-created_date"),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn: () => base44.entities.ClientGoal.list(),
  });
  const { data: serviceCodes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });
  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => base44.entities.ShiftSchedule.list("-date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SessionNote.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["session-notes"] }); setView("list"); setSelectedClient(null); setEditingNote(null); },
    onError: (e) => { toast.error("Failed to save session note: " + (e?.message || "Unknown error")); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SessionNote.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["session-notes"] }); },
    onError: (e) => { toast.error("Failed to save session note: " + (e?.message || "Unknown error")); },
  });

  const visibleClients = isDSPMode ? clients.filter(c => assignedClientIds.includes(c.id)) : clients;
  const visibleNotes = isDSPMode ? notes.filter(n => assignedClientIds.includes(n.client_id)) : notes;
  const activeClients = visibleClients.filter(c => c.status === "Active" || !c.status);

  const filtered = visibleNotes.filter(n =>
    `${n.client_name} ${n.staff_name} ${n.date} ${n.service_code || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  // Notes pending manager review
  const pendingReview = notes.filter(n => n.status === "Submitted" || n.status === "Flagged for Review" || n.status === "Returned");

  // Late notes (Draft or Returned past deadline)
  const lateNotes = visibleNotes.filter(n => checkIsLate(n));

  const handleStartEntry = (client, existing = null) => {
    setSelectedClient(client);
    setEditingNote(existing);
    setView("entry");
  };

  const handleSave = (formData) => {
    const data = { ...formData, is_late: checkIsLate(formData) };
    if (editingNote?.id) {
      updateMutation.mutate({ id: editingNote.id, data });
      queryClient.invalidateQueries({ queryKey: ["session-notes"] });
      setView("list"); setSelectedClient(null); setEditingNote(null);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAutosave = (formData) => {
    if (!editingNote?.id) return; // only autosave existing notes
    const data = { ...formData, is_late: checkIsLate(formData) };
    updateMutation.mutate({ id: editingNote.id, data });
  };

  const handleAddendum = ({ id, addenda, version, version_history }) => {
    updateMutation.mutate({ id, data: { addenda, version, version_history } });
    queryClient.invalidateQueries({ queryKey: ["session-notes"] });
  };

  const handleSupervisorAction = (note, action, comment) => {
    const now = new Date().toISOString();
    const updates = {
      supervisor_action: action,
      supervisor_note: comment || "",
      supervisor_reviewed_by: user?.full_name || "Supervisor",
      supervisor_reviewed_at: now,
    };
    if (action === "Approved") {
      updates.status = "Approved";
    } else if (action === "Returned") {
      updates.status = "Returned";
      updates.returned_comment = comment || "";
      updates.returned_by = user?.full_name || "Supervisor";
      updates.returned_at = now;
    } else {
      updates.status = "Flagged for Review";
    }
    updateMutation.mutate({ id: note.id, data: updates });
  };

  if (isDSPMode && assignedClientIds.length === 0) return <NoDSPClientsState />;

  // ── SESSION ENTRY FORM ────────────────────────────────────────────────────
  if (view === "entry" && selectedClient) {
    const clientGoals = goals.filter(g => g.client_id === selectedClient.id);
    return (
      <SessionEntryForm
        client={selectedClient}
        goals={clientGoals}
        serviceCodes={serviceCodes}
        shifts={shifts}
        existingNote={editingNote}
        staffName={user?.full_name || ""}
        canAddAddendum={canAddAddendum}
        onSave={handleSave}
        onAutosave={handleAutosave}
        onAddendum={handleAddendum}
        onCancel={() => { setView("list"); setSelectedClient(null); setEditingNote(null); }}
        saving={createMutation.isPending || updateMutation.isPending}
      />
    );
  }

  // ── MAIN LIST VIEW ────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Session Notes"
        subtitle={`${visibleNotes.length} notes${lateNotes.length > 0 ? ` · ${lateNotes.length} late` : ""}`}
        action={
          <Button onClick={() => setTab("new")} className="gap-1.5">
            <Plus className="w-4 h-4" />New Session Note
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="notes">All Notes</TabsTrigger>
          <TabsTrigger value="new">Start New</TabsTrigger>
          {canApproveNotes && (
            <TabsTrigger value="review" className="relative">
              Manager Review
              {pendingReview.filter(n => n.status === "Submitted").length > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingReview.filter(n => n.status === "Submitted").length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── ALL NOTES TAB ─── */}
        <TabsContent value="notes">
          <Card className="mb-4">
            <CardContent className="py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
              </div>
            </CardContent>
          </Card>

          {filtered.length === 0 && !isLoading ? (
            <EmptyState icon={FileText} title="No session notes" description="Start a new session note from the 'Start New' tab." />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden md:table-cell">Service</TableHead>
                      <TableHead className="hidden md:table-cell">Staff</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(n => {
                      const hasFlags = Object.values(n.health_safety_flags || {}).some(v => v === true);
                      const isLate = checkIsLate(n);
                      const client = clients.find(c => c.id === n.client_id);
                      return (
                        <TableRow key={n.id} className="cursor-pointer hover:bg-muted/50" onClick={() => client && handleStartEntry(client, n)}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              {hasFlags && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                              {n.client_name || "—"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{n.date}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{n.service_code || "—"}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{n.staff_name || "—"}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1">
                                <StatusBadge status={n.status || "Draft"} />
                                {isLate && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-bold">
                                    <Clock className="w-3 h-3" />LATE
                                  </span>
                                )}
                              </div>
                              {n.supervisor_note && n.status !== "Approved" && (
                                <span className="text-[10px] text-amber-700 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />Has coaching note
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={e => { e.stopPropagation(); client && handleStartEntry(client, n); }}>
                              {n.status === "Approved" ? "View" : "Edit"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── START NEW TAB ─── */}
        <TabsContent value="new">
          <div>
            <p className="text-sm text-muted-foreground mb-4">Select the client you're documenting a session for:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeClients.map(client => {
                const clientGoals = goals.filter(g => g.client_id === client.id && g.status === "Active");
                const todayNote = visibleNotes.find(n => n.client_id === client.id && n.date === new Date().toISOString().split("T")[0]);
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleStartEntry(client, todayNote || null)}
                    className={cn(
                      "text-left border-2 rounded-xl px-4 py-3 transition-all hover:border-primary/50 hover:bg-primary/5",
                      todayNote ? "border-emerald-300 bg-emerald-50" : "border-border bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{client.first_name} {client.last_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{clientGoals.length} active goal{clientGoals.length !== 1 ? "s" : ""}</p>
                      </div>
                      {todayNote ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium shrink-0">
                          {todayNote.status === "Submitted" ? "✓ Submitted" : "Draft saved"}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-medium shrink-0">Start →</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── MANAGER REVIEW TAB ─── */}
        {canApproveNotes && (
          <TabsContent value="review">
            <SupervisorReviewPanel
              notes={pendingReview}
              onAction={handleSupervisorAction}
              loading={updateMutation.isPending}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}