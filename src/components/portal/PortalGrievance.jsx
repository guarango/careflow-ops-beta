import React, { useContext, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PortalContext } from "@/pages/Portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, CheckCircle2, Clock, ChevronDown, ChevronUp, Plus, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const TYPES = ["Service Quality", "Staff Conduct", "Communication", "Safety Concern", "Rights Violation", "Medical/Health", "Billing", "Other"];
const SEVERITY = ["Concern", "Complaint", "Formal Grievance"];

const statusColors = {
  "Submitted": "bg-blue-100 text-blue-700",
  "Acknowledged": "bg-amber-100 text-amber-700",
  "Under Investigation": "bg-violet-100 text-violet-700",
  "Resolved": "bg-emerald-100 text-emerald-700",
  "Escalated": "bg-red-100 text-red-700",
};

const SURVEY_QUESTIONS = [
  { key: "feel_informed", label: "Do you feel informed about the care and services?" },
  { key: "feel_heard", label: "Do you feel heard by the team?" },
  { key: "trust_team", label: "Do you trust the team supporting your family member?" },
  { key: "would_recommend", label: "Would you recommend this agency to another family?" },
];

function GrievanceItem({ g }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="border-0 shadow-sm">
      <button className="w-full text-left" onClick={() => setExpanded(e => !e)}>
        <div className="p-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={statusColors[g.status]}>{g.status}</Badge>
              <Badge variant="outline" className="text-xs">{g.grievance_type}</Badge>
              <Badge variant="outline" className="text-xs">{g.severity}</Badge>
            </div>
            <p className="text-sm text-slate-700 line-clamp-1">{g.description}</p>
            <p className="text-xs text-slate-400 mt-1">{g.submitted_date ? format(new Date(g.submitted_date), "MMM d, yyyy") : ""}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <div>
            <p className="text-xs text-slate-500 font-medium">Your concern:</p>
            <p className="text-sm text-slate-700 mt-0.5">{g.description}</p>
          </div>
          {g.desired_resolution && (
            <div>
              <p className="text-xs text-slate-500 font-medium">Desired resolution:</p>
              <p className="text-sm text-slate-700 mt-0.5">{g.desired_resolution}</p>
            </div>
          )}
          {g.acknowledged_at && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
              Acknowledged {format(new Date(g.acknowledged_at), "MMM d, yyyy")}
              {g.assigned_to && ` · Assigned to ${g.assigned_to}`}
              {g.expected_resolution_date && ` · Expected resolution: ${g.expected_resolution_date}`}
            </div>
          )}
          {g.resolution_summary && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-emerald-700 mb-1">Resolution</p>
              <p className="text-sm text-emerald-800">{g.resolution_summary}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function PortalGrievancePage() {
  const { portalUser } = useContext(PortalContext);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [form, setForm] = useState({ grievance_type: "Service Quality", severity: "Complaint", description: "", desired_resolution: "" });
  const [survey, setSurvey] = useState({ feel_informed: 0, feel_heard: 0, trust_team: 0, would_recommend: 0, open_feedback: "" });
  const [surveyDone, setSurveyDone] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSv = (k, v) => setSurvey(s => ({ ...s, [k]: v }));

  const { data: grievances = [] } = useQuery({
    queryKey: ["grievances", portalUser?.id],
    queryFn: () => base44.entities.PortalGrievance.filter({ portal_user_id: portalUser?.id }),
  });

  const submit = useMutation({
    mutationFn: (data) => base44.entities.PortalGrievance.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grievances"] });
      setShowForm(false);
      setForm({ grievance_type: "Service Quality", severity: "Complaint", description: "", desired_resolution: "" });
    },
  });

  const submitSurvey = useMutation({
    mutationFn: (data) => base44.entities.FamilySatisfactionSurvey.create(data),
    onSuccess: () => { setSurveyDone(true); setShowSurvey(false); },
  });

  const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${new Date().getFullYear()}`;

  const handleSubmit = () => {
    submit.mutate({
      ...form,
      client_id: portalUser?.client_id,
      client_name: portalUser?.client_name,
      portal_user_id: portalUser?.id,
      portal_user_name: portalUser?.full_name,
      submitted_date: new Date().toISOString(),
      status: "Submitted",
    });
  };

  const handleSurveySubmit = () => {
    submitSurvey.mutate({
      ...survey,
      client_id: portalUser?.client_id,
      client_name: portalUser?.client_name,
      portal_user_id: portalUser?.id,
      portal_user_name: portalUser?.full_name,
      survey_quarter: quarter,
      submitted_date: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Concerns & Feedback</h2>
        <p className="text-sm text-slate-500 mt-0.5">A protected channel for raising concerns and sharing feedback</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
        <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">This channel is separate from general messages and goes directly to the program director.</p>
          <p className="text-xs mt-1 text-blue-700">Grievances bypass intermediate supervisors who may be involved in the concern. You will receive an acknowledgment within 24 hours with the name of the person responsible and the expected timeline for a response.</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => setShowForm(s => !s)} className="gap-2 bg-sky-600 hover:bg-sky-700">
          <Plus className="w-4 h-4" />Submit a Concern
        </Button>
        <Button variant="outline" onClick={() => setShowSurvey(s => !s)} className="gap-2">
          <MessageSquare className="w-4 h-4" />Quarterly Satisfaction Survey
        </Button>
      </div>

      {/* Grievance form */}
      {showForm && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Submit a Concern or Grievance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type of Concern</Label>
                <Select value={form.grievance_type} onValueChange={v => set("grievance_type", v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Level</Label>
                <Select value={form.severity} onValueChange={v => set("severity", v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{SEVERITY.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Describe your concern *</Label>
              <Textarea rows={4} className="mt-1 text-sm" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Please describe the situation as clearly as you can…" />
            </div>
            <div>
              <Label>What resolution are you hoping for?</Label>
              <Textarea rows={2} className="mt-1 text-sm" value={form.desired_resolution} onChange={e => set("desired_resolution", e.target.value)} placeholder="Optional — share what would make this right…" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={!form.description.trim() || submit.isPending} className="bg-sky-600 hover:bg-sky-700 gap-2">
                <Shield className="w-4 h-4" />Submit Securely
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Satisfaction survey */}
      {showSurvey && !surveyDone && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Quarterly Satisfaction Survey — {quarter}</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <p className="text-xs text-slate-500">Four questions, plain language, optional. Your answers are reviewed by agency leadership and help us understand whether we're serving families well.</p>
            {SURVEY_QUESTIONS.map(q => (
              <div key={q.key}>
                <Label className="text-sm">{q.label}</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setSv(q.key, n)}
                      className={cn("w-9 h-9 rounded-lg border-2 text-sm font-semibold transition-colors",
                        survey[q.key] === n ? "bg-sky-600 border-sky-600 text-white" : "border-slate-200 text-slate-500 hover:border-sky-300"
                      )}>
                      {n}
                    </button>
                  ))}
                  <span className="text-xs text-slate-400 self-center ml-1">1 = strongly disagree · 5 = strongly agree</span>
                </div>
              </div>
            ))}
            <div>
              <Label>Anything else you want to share? (Optional)</Label>
              <Textarea rows={3} className="mt-1 text-sm" value={survey.open_feedback} onChange={e => setSv("open_feedback", e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSurveySubmit} disabled={submitSurvey.isPending} className="bg-sky-600 hover:bg-sky-700">Submit Survey</Button>
              <Button variant="outline" onClick={() => setShowSurvey(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {surveyDone && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          Thank you — your survey for {quarter} has been submitted. Leadership reviews these quarterly.
        </div>
      )}

      {/* Existing grievances */}
      {grievances.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Your Previous Submissions</h3>
          <div className="space-y-2">
            {[...grievances].sort((a, b) => new Date(b.submitted_date) - new Date(a.submitted_date)).map(g => (
              <GrievanceItem key={g.id} g={g} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}