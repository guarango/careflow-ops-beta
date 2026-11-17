import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Search, AlertTriangle, Clock, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useAssignedClients } from "@/hooks/useAssignedClients";
import { useRole } from "@/hooks/useRole";
import NoDSPClientsState from "@/components/shared/NoDSPClientsState";
import SessionEntryForm from "@/components/sessionnotes/SessionEntryForm";
import SupervisorReviewPanel from "@/components/sessionnotes/SupervisorReviewPanel";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { buildNoteVersionEntry, initialNoteVersion, isNoteLocked } from "@/lib/noteVersioning";
import { todayISO } from "@/lib/dateUtils";
import { logAudit } from "@/lib/auditLog";
import {
  DEFAULT_LATE_HOURS,
  DEFAULT_EVV_TOLERANCE_MINUTES,
  activePcsp,
  isLateNote,
  planRequiresDailyNote,
} from "@/lib/serviceNote";

// ── Late note check: past the agency's window after the service ended ──
function checkIsLate(note, lateHours = DEFAULT_LATE_HOURS) {
  if (!note) return false;
  if (note.status === "Approved" || note.status === "Submitted") return false;
  return isLateNote(note, lateHours);
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
  const { data: plans = [] } = useQuery({
    queryKey: ["isp-plans"],
    queryFn: () => base44.entities.ISPlan.list(),
  });
  const { data: evvLogs = [] } = useQuery({
    queryKey: ["evv-logs"],
    queryFn: () => base44.entities.EVVLog.list("-date"),
  });
  const { data: agencies = [] } = useQuery({
    queryKey: ["agency-settings"],
    queryFn: () => base44.entities.Agency.list(),
  });
  const agency = agencies[0];
  const lateHours = agency?.service_note_late_hours ?? DEFAULT_LATE_HOURS;
  const evvTolerance = agency?.evv_note_tolerance_minutes ?? DEFAULT_EVV_TOLERANCE_MINUTES;

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

  // Late notes (Draft or Returned past the agency window)
  const lateNotes = visibleNotes.filter(n => checkIsLate(n, lateHours));
  const lateFlag = (note) => note.late_entry ?? note.is_late ?? checkIsLate(note, lateHours);

  // Deep link from the DSP shift screen: ?client=<id>&note=<id>
  const paramsApplied = useRef(false);
  useEffect(() => {
    if (paramsApplied.current) return;
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get("client");
    if (!clientId) { paramsApplied.current = true; return; }
    if (!clients.length) return;
    const client = clients.find(c => c.id === clientId);
    if (!client) { paramsApplied.current = true; return; }
    const noteId = params.get("note");
    const note = noteId ? notes.find(n => n.id === noteId) : null;
    if (noteId && !note) return;
    paramsApplied.current = true;
    setSelectedClient(client);
    setEditingNote(note || null);
    setView("entry");
  }, [clients, notes]);

  const clearDeepLink = () => {
    if (window.location.search) window.history.replaceState({}, "", window.location.pathname);
  };

  const handleStartEntry = (client, existing = null) => {
    setSelectedClient(client);
    setEditingNote(existing);
    setView("entry");
  };

  const sanitizeDates = (data) => {
    const cleaned = { ...data };
    for (const k of Object.keys(cleaned)) {
      if (cleaned[k] === "") cleaned[k] = null;
    }
    // Trial counts must be numbers (or null) — empty inputs arrive as strings
    if (Array.isArray(cleaned.goal_data)) {
      const num = (v) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
      cleaned.goal_data = cleaned.goal_data.map(g => ({
        ...g,
        trials_total: num(g.trials_total),
        trials_correct: num(g.trials_correct),
        percentage: num(g.percentage),
      }));
    }
    return cleaned;
  };

  const handleSave = async (formData) => {
    const late = isLateNote(
      { ...formData, status: formData.status, submitted_at: formData.submitted_at },
      lateHours
    );
    const data = sanitizeDates({
      ...formData,
      summary_note: formData.summary_note || formData.summary || "",
      late_entry: late,
      is_late: late,
    });
    console.log("[SessionNote Submit] Payload:", {
      id: editingNote?.id,
      status: data.status,
      submitted_at: data.submitted_at,
      client_id: data.client_id,
      hasSummary: !!data.summary,
      goalCount: data.goal_data?.length,
    });
    const action = data.status === "Submitted"
      ? (editingNote?.status === "Returned" ? "resubmit" : "submit")
      : "draft";
    const versionPatch = editingNote?.id
      ? buildNoteVersionEntry({ previous: editingNote, next: data, savedBy: user?.full_name, action })
      : initialNoteVersion(user?.full_name, data.status);

    const payload = versionPatch ? { ...data, ...versionPatch } : data;

    const sdkCall = editingNote?.id
      ? base44.entities.SessionNote.update(editingNote.id, payload)
      : base44.entities.SessionNote.create(payload);
    let savedId = editingNote?.id;
    try {
      const result = await Promise.race([
        sdkCall,
        new Promise((_, reject) => setTimeout(
          () => reject(new Error("Session note save timed out after 15 seconds. The record was not saved — your input is preserved.")),
          15000
        )),
      ]);
      savedId = result?.id || savedId;
      console.log("[SessionNote Submit] SDK call resolved successfully", result?.id);
    } catch (e) {
      console.error("[SessionNote Submit] SDK call FAILED:", e?.status, e?.message, e?.data, e);
      toast.error("Session note save failed: " + (e?.message || "Unknown error"));
      throw e;
    }
    queryClient.invalidateQueries({ queryKey: ["session-notes"] });
    const targetName = `${data.client_name || "Client"} — ${data.date || ""}`.trim();
    const timing = `Service ${data.service_code || "—"} · ${data.start_time || "?"}–${data.end_time || "?"}`;
    if (!editingNote?.id) {
      logAudit({
        action: "session_note_created",
        target_type: "SessionNote",
        target_id: savedId,
        target_name: targetName,
        details: timing,
      });
    }
    if (data.status === "Submitted") {
      logAudit({
        action: editingNote?.status === "Returned" ? "session_note_resubmitted" : "session_note_submitted",
        target_type: "SessionNote",
        target_id: savedId,
        target_name: targetName,
        field: "Status",
        old_value: editingNote?.status || "",
        new_value: "Submitted",
        details: `${timing}${late ? " · Late entry" : ""}`,
      });
    }
    clearDeepLink();
    setView("list"); setSelectedClient(null); setEditingNote(null);
  };

  const handleAutosave = (formData) => {
    if (!editingNote?.id) return; // only autosave existing notes
    if (isNoteLocked(editingNote.status)) return; // submitted notes are immutable
    // Never autosave a submit — only drafts
    if (formData.status === "Submitted") return;
    const data = sanitizeDates({ ...formData, is_late: checkIsLate(formData) });
    updateMutation.mutate({ id: editingNote.id, data });
  };

  // A submitted note is locked: corrections are addenda appended by the backend,
  // never an overwrite of the original text.
  const handleAddendum = async ({ id, text, reason }) => {
    try {
      const res = await base44.functions.invoke("addSessionNoteAddendum", { noteId: id, text, reason });
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ["session-notes"] });
      toast.success("Addendum saved — the original note is unchanged.");
      return res.data?.note;
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Could not save the addendum.";
      toast.error(msg);
      throw e;
    }
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
      updates.approved_by = user?.full_name || "Manager";
      updates.approved_at = now;
    } else if (action === "Returned") {
      updates.status = "Returned";
      updates.returned_comment = comment || "";
      updates.returned_by = user?.full_name || "Supervisor";
      updates.returned_at = now;
    } else {
      updates.status = "Flagged for Review";
    }
    const reviewVersion = (note.version || 1) + 1;
    updates.version = reviewVersion;
    updates.version_history = [
      ...(note.version_history || []),
      {
        version: reviewVersion,
        saved_at: now,
        saved_by: user?.full_name || "Supervisor",
        summary_of_changes: `Manager review — ${action}${comment ? `: ${comment}` : ""}`,
      },
    ];
    updateMutation.mutate({ id: note.id, data: updates });
    logAudit({
      action:
        action === "Approved"
          ? "session_note_approved"
          : action === "Returned"
            ? "session_note_returned"
            : "session_note_flagged",
      target_type: "SessionNote",
      target_id: note.id,
      target_name: `${note.client_name || "Client"} — ${note.date || ""}`.trim(),
      field: "Status",
      old_value: note.status || "",
      new_value: updates.status,
      details: `Session note ${action.toLowerCase()}${comment ? `: ${comment}` : ""}`,
    });
  };

  if (isDSPMode && assignedClientIds.length === 0) return <NoDSPClientsState />;

  // ── SESSION ENTRY FORM ────────────────────────────────────────────────────
  if (view === "entry" && selectedClient) {
    const clientGoals = goals.filter(g => g.client_id === selectedClient.id);
    const noteOwner = !editingNote?.created_by_id || editingNote.created_by_id === user?.id;
    const clientPcsp = activePcsp(plans, selectedClient.id);
    if (clientPcsp && !planRequiresDailyNote(clientPcsp, serviceCodes)) {
      return (
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => { clearDeepLink(); setView("list"); setSelectedClient(null); setEditingNote(null); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />Back
          </button>
          <div className="bg-muted/40 border border-border rounded-xl p-4">
            <p className="text-sm font-semibold text-foreground mb-1">No daily note is required</p>
            <p className="text-sm text-muted-foreground">
              {selectedClient.first_name}'s active PCSP only authorizes services documented by milestone or summary, not a daily service note.
            </p>
          </div>
        </div>
      );
    }
    return (
      <SessionEntryForm
        client={selectedClient}
        goals={clientGoals}
        serviceCodes={serviceCodes}
        shifts={shifts}
        pcsp={activePcsp(plans, selectedClient.id)}
        evvLogs={evvLogs}
        siblingNotes={visibleNotes}
        evvTolerance={evvTolerance}
        existingNote={editingNote}
        staffId={user?.id || ""}
        staffName={user?.full_name || ""}
        canAddAddendum={canAddAddendum || noteOwner}
        onSave={handleSave}
        onAutosave={handleAutosave}
        onAddendum={handleAddendum}
        onCancel={() => { clearDeepLink(); setView("list"); setSelectedClient(null); setEditingNote(null); }}
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
                      const isLate = lateFlag(n);
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
                              {isNoteLocked(n.status) ? "View" : "Edit"}
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
                const todayNote = visibleNotes.find(n => n.client_id === client.id && n.date === todayISO());
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