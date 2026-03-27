import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Send, Plus, Edit, AlertTriangle, CheckCircle2, Wand2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { cn } from "@/lib/utils";

const JARGON = ["BSP", "HCBS", "ISP", "IDD", "DSP", "QIDP", "STO", "LTO", "ADL", "IADL", "FBA", "ABA", "EBP", "BCBA", "prompting hierarchy", "task analysis", "errorless learning", "reinforcement schedule", "percentage of trials", "successive approximations"];

function checkPlainLanguage(text) {
  const issues = [];
  const foundJargon = JARGON.filter(j => text.toLowerCase().includes(j.toLowerCase()));
  if (foundJargon.length > 0) issues.push(`Clinical jargon: ${foundJargon.join(", ")}`);
  const longSentences = text.split(/[.!?]/).filter(s => s.trim().split(" ").length > 25);
  if (longSentences.length > 0) issues.push(`${longSentences.length} sentence(s) over 25 words`);
  if (/was (done|completed|achieved|attempted) by/.test(text)) issues.push("Passive voice detected — be clear about who did what");
  if (/\d{1,3}%/.test(text)) issues.push("Percentage scores found — describe what happened, not what percentage was achieved");
  return issues;
}

export default function HighlightReportManager({ clientId, clientName }) {
  const qc = useQueryClient();
  const [showEditor, setShowEditor] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const firstName = clientName?.split(" ")[0] || clientName;

  const weekStart = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [form, setForm] = useState({
    report_week_start: weekStart,
    report_week_end: weekEnd,
    report_body: "",
    goal_progress_narrative: "",
    community_activities_narrative: "",
    new_skills_narrative: "",
    upcoming_preview: "",
    highlights: [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: reports = [] } = useQuery({
    queryKey: ["highlight-reports", clientId],
    queryFn: () => base44.entities.FamilyHighlightReport.filter({ client_id: clientId }),
  });

  const { data: sessionNotes = [] } = useQuery({
    queryKey: ["session-notes-for-report", clientId],
    queryFn: () => base44.entities.SessionNote.filter({ client_id: clientId }),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goals-for-report", clientId],
    queryFn: () => base44.entities.ClientGoal.filter({ client_id: clientId }),
  });

  const save = useMutation({
    mutationFn: (data) => editingReport
      ? base44.entities.FamilyHighlightReport.update(editingReport.id, data)
      : base44.entities.FamilyHighlightReport.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["highlight-reports", clientId] }); setShowEditor(false); setEditingReport(null); },
  });

  const markSent = useMutation({
    mutationFn: (id) => base44.entities.FamilyHighlightReport.update(id, { status: "Sent", sent_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["highlight-reports", clientId] }),
  });

  const plainLanguageIssues = checkPlainLanguage(form.report_body);

  const handleAutoAssemble = async () => {
    setGenerating(true);
    // Pull highlights from recent session notes
    const weekNotes = sessionNotes.filter(n => n.date >= form.report_week_start && n.date <= form.report_week_end);
    const highlights = weekNotes
      .flatMap(n => n.goal_data?.filter(g => g.session_highlight).map(g => ({
        date: n.date, staff_name: n.staff_name || "Your support team",
        highlight: g.session_highlight, choices_made: g.preference_detail || "",
        memorable_quote: g.person_communication || "",
      })) || [])
      .filter(h => h.highlight);

    const activeGoals = goals.filter(g => g.status === "Active").slice(0, 3);
    const goalSummary = activeGoals.length > 0
      ? activeGoals.map(g => `${g.goal_title}`).join("; ")
      : "working on personal goals";

    const prompt = `You are writing a warm, personal weekly update letter for the family of ${firstName}, an adult with intellectual disabilities. Write it like a caring staff member who genuinely knows ${firstName} — not a clinical report.

RULES:
- Start with "${firstName}" by name, never "the client"
- No clinical jargon, no percentages, no clinical scores
- Focus on what ${firstName} did, said, tried, chose, or enjoyed
- If something was hard, mention it with warmth and what helped
- Plain language, short sentences, warm tone
- End with something to look forward to

This week's session highlights to incorporate:
${highlights.length > 0 ? highlights.map(h => `- ${h.date}: ${h.highlight}`).join("\n") : "(No specific highlights logged this week — write a warm general update)"}

Goals being worked on (translate to plain language, no scores):
${goalSummary}

Write a 150-250 word letter. Do not include subject line or sign-off — just the letter body.`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setForm(f => ({ ...f, report_body: result, highlights }));
    setGenerating(false);
  };

  const handleSave = (status = "Draft") => {
    save.mutate({
      ...form,
      client_id: clientId,
      client_name: clientName,
      status,
      plain_language_flagged: plainLanguageIssues.length > 0,
      plain_language_issues: plainLanguageIssues,
      generated_date: new Date().toISOString(),
    });
  };

  const sorted = [...reports].sort((a, b) => new Date(b.report_week_start) - new Date(a.report_week_start));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Weekly Highlight Reports — {firstName}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Warm, plain-language updates sent to approved family contacts each week</p>
        </div>
        <Button size="sm" onClick={() => { setEditingReport(null); setForm({ report_week_start: weekStart, report_week_end: weekEnd, report_body: "", goal_progress_narrative: "", community_activities_narrative: "", new_skills_narrative: "", upcoming_preview: "", highlights: [] }); setShowEditor(true); }} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />New Report
        </Button>
      </div>

      {showEditor && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              {editingReport ? "Edit Report" : "Draft Weekly Report"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Week Start</Label>
                <Input type="date" value={form.report_week_start} onChange={e => set("report_week_start", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Week End</Label>
                <Input type="date" value={form.report_week_end} onChange={e => set("report_week_end", e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleAutoAssemble} disabled={generating} className="gap-2">
                <Wand2 className="w-3.5 h-3.5" />
                {generating ? "Assembling…" : "Auto-Assemble from Session Notes"}
              </Button>
              <p className="text-xs text-slate-400 self-center">Pulls highlights from this week's documented sessions</p>
            </div>

            <div>
              <Label>Report Body *</Label>
              <p className="text-xs text-slate-400 mt-0.5 mb-1">Write like a letter from someone who genuinely knows {firstName}. No clinical language.</p>
              <Textarea
                rows={10}
                value={form.report_body}
                onChange={e => set("report_body", e.target.value)}
                className="mt-1 text-sm font-mono"
                placeholder={`${firstName} had a really good week...`}
              />
              {plainLanguageIssues.length > 0 && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1"><AlertTriangle className="w-3.5 h-3.5" />Plain Language Check</p>
                  {plainLanguageIssues.map((issue, i) => (
                    <p key={i} className="text-xs text-amber-700">• {issue}</p>
                  ))}
                </div>
              )}
              {form.report_body && plainLanguageIssues.length === 0 && (
                <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Plain language check passed</p>
              )}
            </div>

            <div>
              <Label>What's coming up / looking forward to?</Label>
              <Textarea rows={2} value={form.upcoming_preview} onChange={e => set("upcoming_preview", e.target.value)} className="mt-1 text-sm" placeholder="Next week's outing, upcoming event..." />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => handleSave("Draft")} variant="outline" size="sm" disabled={!form.report_body || save.isPending}>Save as Draft</Button>
              <Button onClick={() => handleSave("Pending Review")} size="sm" disabled={!form.report_body || save.isPending || plainLanguageIssues.length > 0} className="bg-amber-500 hover:bg-amber-600 gap-1.5">
                Submit for Review
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowEditor(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sorted.length === 0 && !showEditor ? (
        <div className="border-dashed border-2 border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400">
          No weekly reports yet for {firstName}. Create the first one above.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(r => (
            <div key={r.id} className="border border-slate-200 rounded-xl p-4 bg-white flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium">
                    Week of {format(new Date(r.report_week_start), "MMM d")} – {format(new Date(r.report_week_end), "MMM d, yyyy")}
                  </p>
                  <Badge className={cn("text-xs",
                    r.status === "Sent" ? "bg-emerald-100 text-emerald-700" :
                    r.status === "Pending Review" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-600"
                  )}>{r.status}</Badge>
                  {r.plain_language_flagged && <Badge className="bg-red-100 text-red-700 text-xs">Plain Language Issues</Badge>}
                </div>
                <p className="text-xs text-slate-400">{r.sent_at ? `Sent ${format(new Date(r.sent_at), "MMM d, yyyy")}` : `Draft — ${format(new Date(r.generated_date || r.created_date), "MMM d")}`}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => { setEditingReport(r); setForm({ ...r }); setShowEditor(true); }} className="h-7 w-7 p-0">
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                {r.status !== "Sent" && (
                  <Button size="sm" onClick={() => markSent.mutate(r.id)} className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1">
                    <Send className="w-3 h-3" />Mark Sent
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}