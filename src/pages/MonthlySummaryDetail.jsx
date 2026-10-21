import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Sparkles, CheckCircle2, RotateCcw, FileText, Link2 } from "lucide-react";
import { format } from "date-fns";
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
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [howMonthWent, setHowMonthWent] = useState("");
  const [notableEvents, setNotableEvents] = useState("");
  const [signDialog, setSignDialog] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
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
    }
  }, [summary]);

  const { data: sourceNotes = [] } = useQuery({
    queryKey: ["summary-source-notes", summary?.source_note_ids],
    queryFn: async () => {
      if (!summary?.source_note_ids?.length) return [];
      const notes = await base44.entities.SessionNote.list("-date", 200);
      return notes.filter(n => summary.source_note_ids.includes(n.id));
    },
    enabled: !!summary?.source_note_ids?.length,
  });

  const isManager = user?.role === "admin" || user?.role === "manager";
  const canEdit = isManager && summary?.status !== "Signed";

  const handleSaveEdits = async () => {
    try {
      await base44.entities.MonthlySummary.update(id, {
        how_month_went: howMonthWent,
        notable_events: notableEvents,
      });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["monthly-summary", id] });
      toast.success("Edits saved");
    } catch (e) {
      toast.error("Failed to save");
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await base44.functions.invoke("generateMonthlySummaries", {
        client_id: summary.client_id,
        force_regenerate: true,
      });
      queryClient.invalidateQueries({ queryKey: ["monthly-summary", id] });
      toast.success("AI draft regenerated");
    } catch (e) {
      toast.error("Failed to regenerate");
    }
    setRegenerating(false);
  };

  const handleSign = async () => {
    try {
      const now = new Date().toISOString();
      await base44.entities.MonthlySummary.update(id, {
        status: "Signed",
        signed_by_name: signerName,
        signed_by_role: signerRole,
        signed_at: now,
        signature_timestamp: now,
        how_month_went: howMonthWent,
        notable_events: notableEvents,
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/summaries/monthly")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{summary.client_name}</h1>
            <Badge className={STATUS_STYLES[summary.status]}>{summary.status}</Badge>
            {summary.ai_generated && <Badge variant="outline" className="gap-1"><Sparkles className="w-3 h-3" /> AI Drafted</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{summary.month_year} · {summary.period_start} to {summary.period_end}</p>
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
                <Button size="sm" onClick={() => setSignDialog(true)} className="gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Review & Sign
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {summary.source_data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <SourceStat label="Session Notes" value={summary.source_data.note_count} />
          <SourceStat label="Incidents" value={summary.source_data.incident_count} />
          <SourceStat label="Med Passes" value={summary.source_data.med_pass_count} />
          <SourceStat label="Goals Charted" value={summary.source_data.goals_charted_count} />
        </div>
      )}

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How the Month Went</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea value={howMonthWent} onChange={e => setHowMonthWent(e.target.value)} rows={6} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{howMonthWent || "No data recorded."}</p>
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{g.goal_title}</span>
                    <Badge variant="secondary" className="text-xs">{g.sessions_charted} sessions</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{g.progress_summary}</p>
                  {g.source_note_ids && g.source_note_ids.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Link2 className="w-3 h-3" />
                      {g.source_note_ids.length} source note(s)
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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

        {summary.signed_by_name && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Signed by</p>
                <p className="font-medium">{summary.signed_by_name} ({summary.signed_by_role})</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Signed at</p>
                <p className="font-medium">{summary.signed_at ? format(new Date(summary.signed_at), "MMM d, yyyy h:mm a") : "N/A"}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </CardContent>
          </Card>
        )}

        {sourceNotes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Source Session Notes ({sourceNotes.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sourceNotes.map(n => (
                <div key={n.id} className="border rounded-md p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{n.date}</span>
                    <Badge variant="secondary" className="text-xs">{n.status}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 line-clamp-2">{n.summary || n.ai_cleaned_summary || "No summary text"}</p>
                </div>
              ))}
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
              By signing, you confirm this summary is accurate and complete. Your name and role will be recorded as the staff member who wrote it.
            </p>
            <div>
              <label className="text-xs font-medium">Your Name</label>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background mt-1"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Your Role</label>
              <input
                type="text"
                value={signerRole}
                onChange={e => setSignerRole(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background mt-1"
                placeholder="e.g. Program Manager"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialog(false)}>Cancel</Button>
            <Button onClick={handleSign} disabled={!signerName || !signerRole} className="gap-1">
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
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}