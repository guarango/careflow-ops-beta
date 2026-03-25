import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AIBadge from "./AIBadge";
import { Sparkles, AlertTriangle, ShieldAlert, ChevronRight, RotateCcw } from "lucide-react";

const INTAKE_QUESTIONS = [
  { key: "what_happened", label: "What happened? (describe the incident in detail)", placeholder: "Describe the incident as it occurred..." },
  { key: "antecedent", label: "What was the antecedent? (what happened immediately before?)", placeholder: "e.g., Client was asked to transition from preferred activity..." },
  { key: "who_involved", label: "Who was involved? (staff, clients, others)", placeholder: "List all individuals present..." },
  { key: "response", label: "What was the immediate response/intervention?", placeholder: "e.g., Staff implemented de-escalation protocol..." },
  { key: "outcome", label: "What was the outcome? (injuries, property damage, medical attention?)", placeholder: "e.g., No injuries sustained. Client de-escalated within 10 minutes..." },
  { key: "follow_up", label: "What follow-up actions are planned?", placeholder: "e.g., Behavioral team to review antecedent data..." },
];

const STATE_REPORTING_THRESHOLDS = {
  "Physical Aggression": "May require mandatory reporting — review injury status and state protocol.",
  "Self-Injurious Behavior": "May require mandatory reporting if injury occurred.",
  "Abuse/Neglect": "MANDATORY STATE REPORTING REQUIRED within 24 hours.",
  "Emergency Medical": "May require reporting if 911 was called or hospitalization occurred.",
  "Elopement": "MANDATORY STATE REPORTING REQUIRED.",
  "Medication Error": "Review for severity — report if medical attention was required.",
  "Property Destruction": "Report if damage exceeds agency threshold.",
  "Other": "Review agency policy for reporting thresholds.",
};

export default function IncidentReportAssistant({ clientName = "", incidentType = "", onDraftGenerated }) {
  const [answers, setAnswers] = useState({});
  const [draft, setDraft] = useState("");
  const [editedDraft, setEditedDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [suggestions, setSuggestions] = useState([]);

  const mandatoryReporting = STATE_REPORTING_THRESHOLDS[incidentType];
  const isMandatory = mandatoryReporting?.includes("MANDATORY");

  const generateDraft = async () => {
    setLoading(true);
    try {
      const answersText = INTAKE_QUESTIONS.map(q => `${q.label}\n${answers[q.key] || "Not provided"}`).join("\n\n");

      const prompt = `You are a clinical documentation specialist for an I/DD care agency. 

Generate a complete, professional incident report based on the following structured intake. The report must:
- Be written in objective, third-person clinical language
- Include all required sections: Date/Time, Description, Antecedent, Response, Outcome, Follow-up
- Be factual and avoid speculation
- Note any required notifications (supervisor, guardian, state)

Client: ${clientName}
Incident Type: ${incidentType}

Intake Responses:
${answersText}

Write the incident report:`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setDraft(result);
      setEditedDraft(result);

      // Generate de-escalation suggestions
      const suggestPrompt = `Based on this incident type and antecedent, suggest 3-5 specific de-escalation or follow-up clinical recommendations for the treatment team. Be specific and actionable.
Incident type: ${incidentType}
Antecedent: ${answers["antecedent"] || "Unknown"}
Response JSON: {"suggestions": ["...", "..."]}`;

      const sugResult = await base44.integrations.Core.InvokeLLM({ prompt: suggestPrompt, response_json_schema: { type: "object", properties: { suggestions: { type: "array", items: { type: "string" } } } } });
      setSuggestions(sugResult?.suggestions || []);
      setStep(2);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Card className="border-violet-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Incident Report Assistant</CardTitle>
          <AIBadge />
        </div>
        {incidentType && (
          <div className={`mt-2 p-2.5 rounded-lg text-xs flex items-start gap-2 ${isMandatory ? "bg-red-500/15 border border-red-500/30 text-red-400" : "bg-amber-500/10 border border-amber-500/20 text-amber-400"}`}>
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span><strong>State Reporting:</strong> {mandatoryReporting || "Review agency policy."}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">Answer the intake questions — the AI will generate a complete incident report.</p>
            <div className="space-y-4">
              {INTAKE_QUESTIONS.map(q => (
                <div key={q.key}>
                  <label className="text-sm font-medium text-foreground block mb-1">{q.label}</label>
                  <Textarea placeholder={q.placeholder} value={answers[q.key] || ""} onChange={e => setAnswers(p => ({ ...p, [q.key]: e.target.value }))} className="text-sm h-20 resize-none" />
                </div>
              ))}
            </div>
            <Button className="w-full mt-4 bg-violet-600 hover:bg-violet-700" onClick={generateDraft} disabled={loading}>
              {loading ? <><span className="animate-spin mr-2">⟳</span>Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Report Draft</>}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            {suggestions.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs font-semibold text-blue-400 mb-2">AI Clinical Recommendations:</p>
                <ul className="space-y-1">
                  {suggestions.map((s, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5"><ChevronRight className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />{s}</li>)}
                </ul>
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Review and edit the AI-generated report:</p>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setStep(1)}><RotateCcw className="w-3 h-3 mr-1" />Redo</Button>
            </div>
            <Textarea value={editedDraft} onChange={e => setEditedDraft(e.target.value)} className="min-h-64 text-sm font-mono" />
            <p className="text-xs text-muted-foreground mt-2">✓ AI-generated content. Your submission confirms clinical accuracy.</p>
            <Button className="w-full mt-3 bg-orange-600 hover:bg-orange-700" onClick={() => onDraftGenerated && onDraftGenerated(editedDraft)}>
              Use This Draft
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}