import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Sparkles, CheckCircle2, RotateCcw, AlertTriangle, Link2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import SentenceCitations from "@/components/summaries/SentenceCitations";
import DataNeedingReview from "@/components/summaries/DataNeedingReview";
import SummaryVersionHistory from "@/components/summaries/SummaryVersionHistory";
import { logAudit } from "@/lib/auditLog";
import toast from "react-hot-toast";

const STATUS_STYLES = {
  "Draft": "bg-gray-100 text-gray-700",
  "Pending Review": "bg-amber-100 text-amber-700",
  "Signed": "bg-green-100 text-green-700",
  "Returned": "bg-red-100 text-red-700",
};

export default function MonthlySummaryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = useRole();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [howMonthWent, setHowMonthWent] = useState("");
  const [notableEvents, setNotableEvents] = useState("");
  const [signDialog, setSignDialog] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [writerName, setWriterName] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["monthly-summary", id],
    queryFn: () => base44.entities.MonthlySummary.get(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (summary) {
      setHowMonthWent(summary.how_month_went || "");
      setNotableEvents(summary.notable_events || "");
      setWriterName(summary.writer_name || "");
      setSignerName(prev => prev || user?.full_name || "");
    }
  }, [summary, user?.full_name]);

  const { data: sourceNotes = [] } = useQuery({
    queryKey: ["summary-source-notes", summary?.source_note_ids],
    queryFn: async () => {
      const rows = await Promise.all(
        (summary.source_note_ids || []).map(noteId =>
          base44.entities.SessionNote.get(noteId).catch(() => null)
        )
      );
      return rows.filter(Boolean);
    },
    enabled: !!summary?.source_note_ids?.length,
  });

  const isManager = can("approveSummaries");
  const canEdit = isManager && summary?.status !== "Signed";
  const signBlockedReason = summary?.sign_blocked_reason || "";

  const handleSaveEdits = async () => {
    try {
      await base44.entities.MonthlySummary.update(id, {
        how_month_went: howMonthWent,
        notable_events: notableEvents,
      });
      await logAudit({
        action: "summary_edited",
        target_type: "MonthlySummary",
        target_id: id,
        target_name: `${summary.client_name} — ${summary.month_year}`,
        details: "Manual edits saved to the monthly summary",
      });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["monthly-summary", id] });
      toast.success("Edits saved");
    } catch (e) {
      toast.error("Failed to save");
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm("Regenerate this draft from the period's approved records? The current version is kept in history.")) return;
    setRegenerating(true);
    try {
      await base44.functions.invoke("generateMonthlySummaries", {
        client_id: summary.client_id,
        year: summary.period_start ? Number(summary.period_start.slice(0, 4)) : undefined,
        month: summary.period_start ? Number(summary.period_start.slice(5, 7)) - 1 : undefined,
        force_regenerate: true,
      });
      queryClient.invalidateQueries({ queryKey: ["monthly-summary", id] });
      toast.success("Draft regenerated from approved records");
    } catch (e) {
      toast.error("Failed to regenerate");
    }
    setRegenerating(false);
  };

  const openSign = () => {
    if (signBlockedReason) {
      toast.error(signBlockedReason);
      return;
    }
    setSignDialog(true);
  };

  const handleSign = async () => {
    if (!writerName.trim()) {
      toast.error("The staff member who wrote this summary must be named");
      return;
    }
    try {
      const now = new Date().toISOString();
      await base44.entities.MonthlySummary.update(id, {
        status: "Signed",
        writer_name: writerName,
        signed_by_name: signerName,
        signed_by_role: signerRole,
        signed_at: now,
        signature_timestamp: now,
        how_month_went: howMonthWent,
        notable_events: notableEvents,
      });
      await logAudit({
        action: "summary_signed",
        target_type: "MonthlySummary",
        target_id: id,
        target_name: `${summary.client_name} — ${summary.month_year}`,
        old_value: summary.status,
        new_value: "Signed",
        details: `Signed by ${signerName}${signerRole ? ` (${signerRole})` : ""}; writer ${writerName}`,
      });
      setSignDialog(false);
      queryClient.invalidateQueries({ queryKey: ["monthly-summary", id] });
      toast.success("Summary signed");
    } catch (e) {
      toast.error("Failed to sign");
    }
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!summary) return <div className="text-center py-12">Summary not found</div>;

  const citations = summary.citations || [];
  const nonAiNarrative = summary.ai_generated ? "" : howMonthWent;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/summaries/monthly")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{summary.client_name}</h1>
            <Badge className={STATUS_STYLES[summary.status]}>{summary.status}</Badge>
            {summary.ai_generated && <Badge variant="outline" className="gap-1"><Sparkles className="w-3 h-3" /> AI Drafted</Badge>}
            <Badge variant="outline" className={summary.deliverable === false ? "border-slate-300 text-muted-foreground" : "border-primary/40 text-primary"}>
              {summary.deliverable === false ? "Internal monthly note" : "Due to support coordinator"}
            </Badge>
            {summary.version > 1 && <Badge variant="secondary">v{summary.version}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{summary.month_year} · {summary.period_start} to {summary.period_end}</p>
          {summary.generation && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Drafted by AI ({summary.generation.model}) · {summary.generation.input_note_ids?.length || 0} approved note(s) as input ·
              hash {String(summary.generation.output_hash || "").slice(0, 10)}
            </p>
          )}
        </div>
        {isManager && (
          <div className="flex gap-2">
            {summary.status !== "Signed" && (
              <>
                <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating} className="gap-1">
                  <RotateCcw className="w-3 h-3" /> {regenerating ? "Regenerating..." : "Regenerate"}
                </Button>
                {editing ? (
                  <Button size="sm" onClick={handleSaveEdits}>Save Edits</Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
                )}
                <Button size="sm" onClick={openSign} disabled={!!signBlockedReason} className="gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Review & Sign
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {signBlockedReason && summary.status !== "Signed" && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardContent className="p-3 flex items-start gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{signBlockedReason}</span>
          </CardContent>
        </Card>
      )}

      {summary.source_data && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <SourceStat label="Approved Notes" value={summary.source_data.note_count} />
          <SourceStat label="Incidents" value={summary.source_data.incident_count} />
          <SourceStat label="Med Passes" value={summary.source_data.med_pass_count} />
          <SourceStat label="Goals Charted" value={summary.source_data.goals_charted_count} />
          <SourceStat label="Needs Review" value={summary.source_data.goal_entries_flagged} />
        </div>
      )}

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How the Month Went</CardTitle>
            <p className="text-xs text-muted-foreground">
              Hover a sentence to highlight the approved session notes it draws on.
            </p>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea value={howMonthWent} onChange={e => setHowMonthWent(e.target.value)} rows={7} />
            ) : summary.ai_generated ? (
              <SentenceCitations citations={citations} notes={sourceNotes} fallbackText={howMonthWent} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{nonAiNarrative || "No data recorded."}</p>
            )}
          </CardContent>
        </Card>

        {summary.goals_summary && summary.goals_summary.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Goal Progress ({summary.goals_summary.length} goals)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.goals_summary.map((g, i) => (
                <div key={i} className="border-l-2 border-primary/30 pl-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">{g.goal_title}</span>
                    <Badge variant="secondary" className="text-xs">{g.data_points ?? g.sessions_charted} data point(s)</Badge>
                    {g.prompt_trend && <Badge variant="outline" className="text-xs">{g.prompt_trend}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{g.progress_summary}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Link2 className="w-3 h-3" />
                    {g.source_note_ids && g.source_note_ids.length > 0 ? (
                      <span>
                        {g.source_note_ids.length} source note(s):{" "}
                        {(g.source_note_dates || []).map(d => (d ? format(parseISO(d), "MMM d") : "")).filter(Boolean).join(", ")}
                      </span>
                    ) : (
                      <span>No approved notes this period</span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <DataNeedingReview items={summary.data_needing_review || []} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notable Events</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea value={notableEvents} onChange={e => setNotableEvents(e.target.value)} rows={4} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{notableEvents || "No data recorded."}</p>
            )}
          </CardContent>
        </Card>

        <SummaryVersionHistory current={summary.version} history={summary.version_history || []} />

        {summary.signed_by_name && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Signed by</p>
                <p className="font-medium">{summary.signed_by_name} ({summary.signed_by_role})</p>
                {summary.writer_name && summary.writer_name !== summary.signed_by_name && (
                  <p className="text-xs text-muted-foreground mt-1">Written by {summary.writer_name}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Signed at</p>
                <p className="font-medium">{summary.signed_at ? format(new Date(summary.signed_at), "MMM d, yyyy h:mm a") : "N/A"}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={signDialog} onOpenChange={setSignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review & Sign Monthly Summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              By signing, you confirm this summary cites its sources and is accurate. Your name, role and the time are recorded.
            </p>
            <div>
              <Label className="text-xs">Staff member who wrote this summary</Label>
              <Input value={writerName} onChange={e => setWriterName(e.target.value)} className="mt-1" placeholder="Full name" />
            </div>
            <div>
              <Label className="text-xs">Your name (signer)</Label>
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
            <Button
              onClick={handleSign}
              disabled={!signerName.trim() || !signerRole.trim() || !writerName.trim()}
              className="gap-1"
            >
              <CheckCircle2 className="w-4 h-4" /> Sign Summary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SourceStat({ label, value }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-2xl font-bold">{value ?? 0}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}