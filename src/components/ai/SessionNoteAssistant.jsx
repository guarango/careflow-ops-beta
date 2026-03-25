import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AIBadge from "./AIBadge";
import { Sparkles, CheckCircle2, AlertTriangle, RotateCcw, Send, ChevronRight } from "lucide-react";

const STRUCTURED_QUESTIONS = [
  { key: "activities", label: "What activities or tasks were addressed during this session?", placeholder: "e.g., practiced meal prep, worked on community navigation..." },
  { key: "client_mood", label: "How was the client's mood and engagement level?", placeholder: "e.g., Client was cooperative and in good spirits..." },
  { key: "challenges", label: "Were there any challenges, refusals, or behavioral concerns?", placeholder: "e.g., No behavioral concerns noted. Client required 2 verbal prompts..." },
  { key: "progress", label: "Describe progress on targeted goals (include specific data if possible):", placeholder: "e.g., Completed 3/4 steps independently on meal prep goal..." },
  { key: "follow_up", label: "Any follow-up needed or observations to communicate to the team?", placeholder: "e.g., Guardian mentioned client is having trouble sleeping..." },
];

const PROGRESS_OPTIONS = ["Significant Progress", "Moderate Progress", "Minimal Progress", "No Change", "Regression", "N/A - Goal not addressed"];

export default function SessionNoteAssistant({ clientName = "", goalsList = [], onNoteGenerated }) {
  const [step, setStep] = useState(1); // 1=goals, 2=questions, 3=review
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [goalProgress, setGoalProgress] = useState({});
  const [answers, setAnswers] = useState({});
  const [generatedNote, setGeneratedNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [flags, setFlags] = useState([]);
  const [editedNote, setEditedNote] = useState("");

  const toggleGoal = (goalId) => {
    setSelectedGoals(prev => prev.includes(goalId) ? prev.filter(g => g !== goalId) : [...prev, goalId]);
  };

  const generateNote = async () => {
    setLoading(true);
    try {
      const goalsText = selectedGoals.map(gid => {
        const goal = goalsList.find(g => g.id === gid);
        return goal ? `${goal.goal_title || goal.goal_description}: Progress = ${goalProgress[gid] || "Not rated"}` : "";
      }).join("\n");

      const answersText = STRUCTURED_QUESTIONS.map(q => `${q.label}\nAnswer: ${answers[q.key] || "Not provided"}`).join("\n\n");

      const prompt = `You are a professional clinical documentation specialist for an I/DD (Intellectual and Developmental Disabilities) residential care agency.

Write a complete, professional session note for a direct support professional (DSP) visit. The note must:
- Be written in third person, objective, professional clinical language
- Follow SOAP or narrative format suitable for Medicaid billing documentation
- Include observations, goal-specific progress, and follow-up recommendations
- Be specific and measurable — avoid vague language like "had a good day"
- Be 150-300 words
- Never include PHI like SSNs or insurance numbers

Client: ${clientName || "Client"}
Goals Addressed:
${goalsText || "General support provided"}

Staff Responses to Structured Questions:
${answersText}

Write the session note now:`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setGeneratedNote(result);
      setEditedNote(result);

      // Check for flags
      const flagPrompt = `Review this session note for compliance issues. Return JSON with array of flags. Each flag: {"type": "warning"|"error", "message": string}.
Check for: vague language, missing goal data, non-compliant terms, too brief (<100 words), missing required elements.

Note: ${result}

Return only valid JSON: {"flags": [...]}`;
      const flagResult = await base44.integrations.Core.InvokeLLM({ prompt: flagPrompt, response_json_schema: { type: "object", properties: { flags: { type: "array", items: { type: "object", properties: { type: { type: "string" }, message: { type: "string" } } } } } } });
      setFlags(flagResult?.flags || []);
      setStep(3);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSubmit = () => {
    if (onNoteGenerated) onNoteGenerated(editedNote);
  };

  return (
    <Card className="border-violet-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Session Note Assistant</CardTitle>
          <AIBadge />
        </div>
        <div className="flex gap-2 mt-2">
          {[1,2,3].map(s => (
            <div key={s} className={`flex items-center gap-1 text-xs ${step >= s ? "text-violet-400" : "text-muted-foreground"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step > s ? "bg-violet-500 text-white" : step === s ? "border-2 border-violet-500 text-violet-400" : "border border-border"}`}>
                {step > s ? <CheckCircle2 className="w-3 h-3" /> : s}
              </div>
              {s === 1 ? "Goals" : s === 2 ? "Questions" : "Review"}
              {s < 3 && <ChevronRight className="w-3 h-3" />}
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">Select the goals addressed during this session:</p>
            {goalsList.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No active goals found for this client. You can still continue.</p>
            )}
            <div className="space-y-2 mb-4">
              {goalsList.map(goal => (
                <div key={goal.id} className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedGoals.includes(goal.id) ? "border-violet-500 bg-violet-500/10" : "border-border hover:border-muted-foreground"}`}
                  onClick={() => toggleGoal(goal.id)}>
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 ${selectedGoals.includes(goal.id) ? "bg-violet-500 border-violet-500" : "border-border"}`}>
                      {selectedGoals.includes(goal.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{goal.goal_title || goal.goal_description}</p>
                      {selectedGoals.includes(goal.id) && (
                        <Select value={goalProgress[goal.id] || ""} onValueChange={v => setGoalProgress(p => ({ ...p, [goal.id]: v }))}>
                          <SelectTrigger className="mt-2 h-8 text-xs"><SelectValue placeholder="Rate progress..." /></SelectTrigger>
                          <SelectContent>{PROGRESS_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>Continue to Questions <ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">Answer a few quick questions — the AI will handle the writing.</p>
            <div className="space-y-4">
              {STRUCTURED_QUESTIONS.map(q => (
                <div key={q.key}>
                  <label className="text-sm font-medium text-foreground block mb-1">{q.label}</label>
                  <Textarea placeholder={q.placeholder} value={answers[q.key] || ""} onChange={e => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))} className="text-sm h-20 resize-none" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={generateNote} disabled={loading}>
                {loading ? <><span className="animate-spin mr-2">⟳</span>Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Note</>}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            {flags.length > 0 && (
              <div className="mb-4 space-y-2">
                {flags.map((f, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${f.type === "error" ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-amber-500/10 border border-amber-500/20 text-amber-400"}`}>
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {f.message}
                  </div>
                ))}
              </div>
            )}
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Review and edit the AI-generated note before submitting:</p>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setStep(2); setGeneratedNote(""); }}>
                <RotateCcw className="w-3 h-3 mr-1" />Regenerate
              </Button>
            </div>
            <Textarea value={editedNote} onChange={e => setEditedNote(e.target.value)} className="min-h-48 text-sm font-mono" />
            <p className="text-xs text-muted-foreground mt-2">✓ You are reviewing AI-generated content. Submitting confirms your clinical accuracy attestation.</p>
            <Button className="w-full mt-3 bg-green-600 hover:bg-green-700" onClick={handleSubmit}>
              <Send className="w-4 h-4 mr-2" />Submit Note
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}