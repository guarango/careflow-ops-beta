import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import QuarterlySectionCard from "@/components/quarterly/QuarterlySectionCard";
import GoalProgressCard from "@/components/quarterly/GoalProgressCard";
import DataNeedingReview from "@/components/summaries/DataNeedingReview";
import {
  STATUS_STYLES,
  SENT_METHODS,
  effectiveStatus,
  quarterlyElements,
  signingBlockers,
  localTodayISO,
} from "@/lib/quarterlySummary";
import { downloadQuarterlyPdf } from "@/lib/quarterlyPdf";
import { logAudit } from "@/lib/auditLog";
import { format, differenceInCalendarDays } from "date-fns";
import {
  ArrowLeft, CheckCircle2, Send, AlertTriangle, Clock, Download, RefreshCw, Loader2, FileText, Lock,
} from "lucide-react";
import toast from "react-hot-toast";

export default function QuarterlySummaryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = useRole();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(null);
  const [signDialog, setSignDialog] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [sendDialog, setSendDialog] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendMethod, setSendMethod] = useState("Email");
  const [sendDate, setSendDate] = useState(localTodayISO());

  const { data: summary, isLoading } = useQuery({
    queryKey: ["quarterly-summary", id],
    queryFn: () => base44.entities.QuarterlySummary.get(id),
    enabled: !!id,
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => base44.entities.Agency.list("-created_date", 1),
  });
  const agency = agencies[0];

  const { data: serviceCodes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });
  const codesById = useMemo(
    () => Object.fromEntries(serviceCodes.map(c => [c.id, c.code])),
    [serviceCodes]
  );

  useEffect(() => {
    if (summary) {
      setDraft({ ...summary, goal_progress: summary.goal_progress || [] });
      setSignerName(summary.writer_name || summary.signed_by_name || user?.full_name || "");
      setSignerRole(summary.signed_by_role || "");
      setSendTo(summary.sent_to || "");
      setSendMethod(summary.sent_method || "Email");
      setSendDate(summary.sent_to_sc_date || localTodayISO());
      setDirty(false);
    }
  }, [summary, user?.full_name]);

  const status = effectiveStatus(draft || summary);
  const elements = quarterlyElements(draft || summary);
  const blockers = signingBlockers(draft || summary);
  const isManager = can("approveSummaries");
  const editable = isManager && draft && !["Sent", "Signed"].includes(status);
  const completedCount = elements.filter(e => e.complete).length;

  const dueDate = draft?.due_date ? new Date(`${draft.due_date}T00:00:00`) : null;
  const daysLeft = dueDate ? differenceInCalendarDays(dueDate, new Date()) : null;

  const patch = (fields) => {
    setDraft(d => ({ ...d, ...fields }));
    setDirty(true);
  };

  const contentPayload = (source = draft) => ({
    services_summary: source.services_summary || "",
    status_and_response: source.status_and_response || "",
    notable_events: source.notable_events || "",
    goal_progress: source.goal_progress || [],
    writer_name: source.writer_name || "",
    format: source.format || "Combined",
  });

  const save = async ({ silent = false } = {}) => {
    setBusy("save");
    try {
      await base44.entities.QuarterlySummary.update(id, contentPayload());
      await logAudit({
        action: "quarterly_summary_edit",
        target_type: "QuarterlySummary",
        target_id: id,
        target_name: `${draft.client_name} — ${draft.quarter}`,
        details: "Content edited in the quarterly summary editor",
      });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["quarterly-summary", id] });
      if (!silent) toast.success("Saved");
    } catch (e) {
      toast.error("Could not save the summary");
    }
    setBusy(null);
  };

  const markReady = async () => {
    if (blockers.length) {
      toast.error(`Still missing: ${blockers.join("; ")}`);
      return;
    }
    setBusy("ready");
    try {
      await base44.entities.QuarterlySummary.update(id, { ...contentPayload(), status: "Ready" });
      await logAudit({
        action: "quarterly_summary_ready",
        target_type: "QuarterlySummary",
        target_id: id,
        target_name: `${draft.client_name} — ${draft.quarter}`,
        old_value: draft.status,
        new_value: "Ready",
        details: "All six elements complete",
      });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["quarterly-summary", id] });
      toast.success("Marked ready to sign");
    } catch (e) {
      toast.error("Could not update the status");
    }
    setBusy(null);
  };

  const openSign = () => {
    if (blockers.length) {
      toast.error(`Cannot sign yet: ${blockers.join("; ")}`);
      return;
    }
    setSignDialog(true);
  };

  const sign = async () => {
    if (!String(signerName || "").trim() || !String(draft.writer_name || "").trim()) {
      toast.error("The staff member writing the summary must be named before signing.");
      return;
    }
    const now = new Date().toISOString();
    setBusy("sign");
    try {
      await base44.entities.QuarterlySummary.update(id, {
        ...contentPayload(),
        writer_name: draft.writer_name || signerName,
        status: "Signed",
        signed_by: draft.writer_id || user?.id || "",
        signed_by_name: signerName,
        signed_by_role: signerRole,
        signed_at: now,
        signature_timestamp: now,
      });
      await logAudit({
        action: "quarterly_summary_signed",
        target_type: "QuarterlySummary",
        target_id: id,
        target_name: `${draft.client_name} — ${draft.quarter}`,
        old_value: status,
        new_value: "Signed",
        details: `Signed by ${signerName}${signerRole ? ` (${signerRole})` : ""}`,
      });
      setSignDialog(false);
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["quarterly-summary", id] });
      toast.success("Quarterly summary signed");
    } catch (e) {
      toast.error("Could not sign the summary");
    }
    setBusy(null);
  };

  const send = async () => {
    if (!String(sendTo || "").trim()) {
      toast.error("Enter the support coordinator's name");
      return;
    }
    setBusy("send");
    try {
      await base44.entities.QuarterlySummary.update(id, {
        status: "Sent",
        sent_to: sendTo,
        sent_method: sendMethod,
        sent_to_sc_date: sendDate,
        sent_by_name: user?.full_name || user?.email || "",
      });
      await logAudit({
        action: "quarterly_summary_sent",
        target_type: "QuarterlySummary",
        target_id: id,
        target_name: `${draft.client_name} — ${draft.quarter}`,
        old_value: status,
        new_value: "Sent",
        details: `Sent to ${sendTo} by ${sendMethod} on ${sendDate}`,
      });
      setSendDialog(false);
      queryClient.invalidateQueries({ queryKey: ["quarterly-summary", id] });
      toast.success("Recorded as sent to the support coordinator");
    } catch (e) {
      toast.error("Could not record the send");
    }
    setBusy(null);
  };

  const rebuild = async () => {
    if (!window.confirm("Rebuild services and goal data from this quarter's records? Your written summaries and goal narratives are kept.")) {
      return;
    }
    setBusy("rebuild");
    try {
      await base44.functions.invoke("generateQuarterlySummary", {
        client_id: draft.client_id,
        quarter_number: draft.quarter_number,
        year: draft.year,
      });
      queryClient.invalidateQueries({ queryKey: ["quarterly-summary", id] });
      toast.success("Rebuilt from this quarter's records");
    } catch (e) {
      toast.error("Could not rebuild the summary");
    }
    setBusy(null);
  };

  const exportPdf = async () => {
    setBusy("pdf");
    try {
      await downloadQuarterlyPdf({ summary: { ...draft, status }, agency });
      await logAudit({
        action: "quarterly_summary_export",
        target_type: "QuarterlySummary",
        target_id: id,
        target_name: `${draft.client_name} — ${draft.quarter}`,
        details: "PDF exported for the support coordinator",
      });
    } catch (e) {
      toast.error("Could not build the PDF");
    }
    setBusy(null);
  };

  const updateGoal = (index, row) => {
    const goals = [...(draft.goal_progress || [])];
    goals[index] = row;
    patch({ goal_progress: goals });
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!draft) return <div className="text-center py-12">Summary not found</div>;

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/summaries/quarterly")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{draft.client_name}</h1>
            <Badge variant="outline" className={STATUS_STYLES[status]}>{status}</Badge>
            <span className="text-sm text-muted-foreground">{draft.quarter}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
            <span>{draft.period_start} to {draft.period_end}</span>
            <span className="text-xs">{completedCount}/6 elements complete</span>
            {dueDate && (
              <span className={status === "Late" ? "text-red-600 font-medium" : daysLeft !== null && daysLeft <= 7 ? "text-amber-600 font-medium" : ""}>
                {status === "Late" ? (
                  <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {Math.abs(daysLeft)} day(s) past the {format(dueDate, "MMM d")} due date</span>
                ) : (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due {format(dueDate, "MMM d, yyyy")}{daysLeft !== null ? ` (${daysLeft} day${daysLeft === 1 ? "" : "s"})` : ""}</span>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isManager && editable && (
            <>
              <Button variant="outline" size="sm" onClick={rebuild} disabled={busy === "rebuild"} className="gap-1">
                {busy === "rebuild" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Rebuild
              </Button>
              <Button size="sm" onClick={() => save()} disabled={busy === "save"} className="gap-1">
                {busy === "save" ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Save
              </Button>
              {status === "Draft" && (
                <Button variant="secondary" size="sm" onClick={markReady} disabled={busy === "ready"}>Mark ready</Button>
              )}
              {status !== "Signed" && (
                <Button size="sm" onClick={openSign} className="gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Sign
                </Button>
              )}
            </>
          )}
          {isManager && status === "Signed" && (
            <Button size="sm" onClick={() => setSendDialog(true)} className="gap-1">
              <Send className="w-3 h-3" /> Send to SC
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={busy === "pdf"} className="gap-1">
            {busy === "pdf" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} PDF
          </Button>
        </div>
      </div>

      {status === "Late" && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="p-3 flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4" />
            Not sent to the support coordinator by the due date. The status is Late.
          </CardContent>
        </Card>
      )}

      {draft.sign_blocked_reason && status !== "Sent" && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardContent className="p-3 flex items-start gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{draft.sign_blocked_reason}</span>
          </CardContent>
        </Card>
      )}

      {isManager && blockers.length > 0 && editable && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardContent className="p-3 text-sm text-amber-800">
            <p className="font-medium mb-1">Before this can be signed:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {blockers.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {draft.signed_by_name && (
        <Card className="mb-4">
          <CardContent className="p-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Signed by {draft.signed_by_name}{draft.signed_by_role ? ` (${draft.signed_by_role})` : ""}</span>
            <span className="text-muted-foreground">{draft.signed_at ? format(new Date(draft.signed_at), "MMM d, yyyy h:mm a") : ""}</span>
          </CardContent>
        </Card>
      )}

      {status === "Sent" && (
        <Card className="mb-4 border-green-200 bg-green-50">
          <CardContent className="p-3 text-sm text-green-800 flex items-center justify-between">
            <span className="flex items-center gap-1"><Send className="w-4 h-4" /> Sent to {draft.sent_to || "support coordinator"} by {draft.sent_method || "—"}</span>
            <span>{draft.sent_to_sc_date || ""}</span>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {/* 1 — Person */}
        <QuarterlySectionCard number={1} title="Person's Name" complete={elements[0]?.complete}>
          <p className="text-sm font-medium">{draft.client_name || "Not recorded"}</p>
          <p className="text-xs text-muted-foreground">Quarter {draft.quarter} · Client record linked to this summary</p>
        </QuarterlySectionCard>

        {/* 2 — Services */}
        <QuarterlySectionCard
          number={2}
          title="Each Service Provided"
          detail={elements[1]?.detail}
          complete={elements[1]?.complete}
          action={
            <div className="w-[170px] shrink-0">
              <Select value={draft.format || "Combined"} onValueChange={(v) => editable && patch({ format: v })} disabled={!editable}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Combined">Combined summary</SelectItem>
                  <SelectItem value="Per service">Per service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        >
          {(draft.services_provided || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No services recorded for this quarter yet. Rebuild once the quarter's session notes exist.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-1.5 pr-3 font-medium">Service</th>
                    <th className="py-1.5 pr-3 font-medium">Units</th>
                    <th className="py-1.5 pr-3 font-medium">Notes</th>
                    <th className="py-1.5 font-medium">Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {(draft.services_provided || []).map((svc, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5 pr-3">
                        <span className="font-medium">{svc.service_code || "—"}</span>
                        {svc.service_name && <span className="text-muted-foreground"> · {svc.service_name}</span>}
                      </td>
                      <td className="py-1.5 pr-3">{svc.units_delivered ?? 0}</td>
                      <td className="py-1.5 pr-3">{svc.notes_count ?? 0}</td>
                      <td className="py-1.5 text-muted-foreground">{(svc.staff_names || []).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QuarterlySectionCard>

        {/* 3 — Date range */}
        <QuarterlySectionCard
          number={3}
          title="Date Range Covered"
          detail={elements[2]?.detail}
          complete={elements[2]?.complete}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Quarter start</p>
              <p className="font-medium">{draft.period_start || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Quarter end</p>
              <p className="font-medium">{draft.period_end || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due to support coordinator</p>
              <p className="font-medium">{draft.due_date || "—"}</p>
            </div>
          </div>
        </QuarterlySectionCard>

        {/* 4 — Summary, status and response, notable events */}
        <QuarterlySectionCard
          number={4}
          title="General Summary, Status and Response, Notable Events"
          detail="The person's status, response to services, and what happened this quarter"
          complete={elements[3]?.complete}
        >
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Services provided</Label>
              <Textarea
                rows={3}
                value={draft.services_summary || ""}
                disabled={!editable}
                onChange={e => patch({ services_summary: e.target.value })}
                placeholder="Summarize what was provided across the quarter."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status and response to services</Label>
              <Textarea
                rows={4}
                value={draft.status_and_response || ""}
                disabled={!editable}
                onChange={e => patch({ status_and_response: e.target.value })}
                placeholder="Health, mood, engagement, and how the person responded to supports."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notable events and activities</Label>
              <Textarea
                rows={4}
                value={draft.notable_events || ""}
                disabled={!editable}
                onChange={e => patch({ notable_events: e.target.value })}
                placeholder="Prefilled from this quarter's incidents and flagged notes."
                className="mt-1"
              />
            </div>
          </div>
        </QuarterlySectionCard>

        {/* 5 — Goals */}
        <QuarterlySectionCard
          number={5}
          title="Progress Toward Each Goal"
          detail={elements[4]?.detail}
          complete={elements[4]?.complete}
        >
          {(draft.goal_progress || []).length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-start gap-2">
              <FileText className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                No goal progress is required for this person's services. ELS, MTP, PBA, Professional Medication
                Monitoring and Respite are exempt from goal progress.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(draft.goal_progress || []).map((row, i) => (
                <GoalProgressCard
                  key={row.goal_id || i}
                  row={row}
                  editable={editable}
                  onChange={(next) => updateGoal(i, next)}
                  codesById={codesById}
                />
              ))}
            </div>
          )}
          <DataNeedingReview items={draft.data_needing_review || []} />
        </QuarterlySectionCard>

        {/* 6 — Writer */}
        <QuarterlySectionCard
          number={6}
          title="Name of the Staff Member Writing It"
          detail="Manager or QIDP writes and signs; an Admin signs as backup"
          complete={elements[5]?.complete}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Staff member</Label>
              <Input
                value={draft.writer_name || ""}
                disabled={!editable}
                onChange={e => patch({ writer_name: e.target.value })}
                placeholder="Full name of the person writing this summary"
                className="mt-1"
              />
            </div>
            <div className="text-sm">
              {draft.signed_by_name ? (
                <>
                  <p className="text-xs text-muted-foreground">Agency sign-off</p>
                  <p className="font-medium flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    {draft.signed_by_name}{draft.signed_by_role ? ` (${draft.signed_by_role})` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {draft.signed_at ? format(new Date(draft.signed_at), "MMM d, yyyy h:mm a") : ""}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-6">
                  <Lock className="w-3 h-3" /> Not signed yet
                </p>
              )}
            </div>
          </div>
        </QuarterlySectionCard>
      </div>

      {/* Sign dialog */}
      <Dialog open={signDialog} onOpenChange={setSignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Quarterly Summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Signing confirms all six elements are accurate and complete. The staff member named in Element 6 is
              recorded as the writer.
            </p>
            {blockers.length > 0 && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
                {blockers.join("; ")}
              </div>
            )}
            <div>
              <Label className="text-xs">Your name</Label>
              <Input value={signerName} onChange={e => setSignerName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Your role</Label>
              <Input
                value={signerRole}
                onChange={e => setSignerRole(e.target.value)}
                placeholder="e.g. QIDP, Program Manager"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialog(false)}>Cancel</Button>
            <Button onClick={sign} disabled={busy === "sign" || blockers.length > 0 || !signerName.trim() || !String(draft.writer_name || "").trim()} className="gap-1">
              <CheckCircle2 className="w-4 h-4" /> Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send dialog */}
      <Dialog open={sendDialog} onOpenChange={setSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to Support Coordinator</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Record where and how this quarter's summary went to the support coordinator. It is sent outside
              CareFlow for now.
            </p>
            <div>
              <Label className="text-xs">Support coordinator</Label>
              <Input
                value={sendTo}
                onChange={e => setSendTo(e.target.value)}
                placeholder="Name of the support coordinator"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Method</Label>
                <Select value={sendMethod} onValueChange={setSendMethod}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Date sent</Label>
                <Input type="date" value={sendDate} onChange={e => setSendDate(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialog(false)}>Cancel</Button>
            <Button onClick={send} disabled={busy === "send" || !sendTo.trim()} className="gap-1">
              <Send className="w-4 h-4" /> Record send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}