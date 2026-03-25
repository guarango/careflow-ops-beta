import React, { useState } from "react";
import { ChevronLeft, Mic, CheckCircle2, Loader2, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useOffline } from "@/hooks/useOffline";
import { cn } from "@/lib/utils";

const GOALS = [
  { id: "g1", name: "Community Navigation — Bus Route #12", method: "steps" },
  { id: "g2", name: "Daily Living Skills — Meal Preparation", method: "frequency" },
  { id: "g3", name: "Social Communication — Initiating Greetings", method: "trials" },
];

const PROGRESS = [
  { value: "improving", label: "Improving", color: "bg-green-500" },
  { value: "maintaining", label: "Maintaining", color: "bg-blue-500" },
  { value: "declining", label: "Declining", color: "bg-red-500" },
];

export default function MobileSessionNote({ client, onClose }) {
  const [step, setStep] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [goalProgress, setGoalProgress] = useState({});
  const [answers, setAnswers] = useState({});
  const [incidents, setIncidents] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { enqueueAction, isOnline } = useOffline();

  const clientName = client?.client || client?.name || "Client";

  function toggleGoal(id) {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  function setProgress(goalId, val) {
    setGoalProgress((prev) => ({ ...prev, [goalId]: val }));
  }

  async function generateDraft() {
    setGenerating(true);
    setStep(5);
    try {
      const goalSummary = selectedGoals.map((id) => {
        const g = GOALS.find((x) => x.id === id);
        return `${g?.name}: ${goalProgress[id] || "maintaining"}`;
      }).join(", ");
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a professional DSP session note for ${clientName}. Goals addressed: ${goalSummary}. Additional context: ${answers.q1 || ""} ${answers.q2 || ""} ${incidents ? "Incidents/events: " + incidents : ""}. Keep it 3-4 sentences, clinical, person-centered, and suitable for Medicaid billing documentation.`,
      });
      setNoteDraft(typeof res === "string" ? res : res?.text || "Session completed as scheduled. Goals were addressed per the individual support plan.");
    } catch {
      setNoteDraft(`Session completed with ${clientName}. The following goals were addressed: ${selectedGoals.map((id) => GOALS.find((g) => g.id === id)?.name).join(", ")}. Client was cooperative and engaged throughout the session. No incidents to report.`);
    }
    setGenerating(false);
  }

  async function submitNote() {
    const payload = {
      type: "create",
      entity: "SessionNote",
      data: {
        client_name: clientName,
        note_text: noteDraft,
        goals_addressed: selectedGoals,
        status: "Submitted",
        submitted_at: new Date().toISOString(),
      },
    };
    if (isOnline) {
      try { await base44.entities.SessionNote.create(payload.data); } catch {}
    } else {
      enqueueAction(payload);
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Note Submitted</h2>
        <p className="text-muted-foreground text-sm mt-2 mb-6">
          {isOnline ? "Sent for supervisor co-signature." : "Saved offline — will sync when connected."}
        </p>
        <button onClick={onClose} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <button onClick={step === 1 ? onClose : () => setStep((s) => s - 1)} className="w-8 h-8 rounded-full flex items-center justify-center -ml-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Session Note — {clientName}</p>
          <p className="text-sm font-semibold">Step {step} of 5</p>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={cn("w-2 h-2 rounded-full", s <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 overflow-y-auto">
        {/* Step 1: Goals */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-1">Goals Addressed</h2>
            <p className="text-sm text-muted-foreground mb-5">Select all goals worked on during this visit.</p>
            <div className="space-y-3">
              {GOALS.map((g) => {
                const selected = selectedGoals.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGoal(g.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all active:scale-95",
                      selected ? "border-primary bg-primary/5" : "border-border bg-card"
                    )}
                  >
                    <div className={cn("w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center", selected ? "border-primary bg-primary" : "border-muted-foreground")}>
                      {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-foreground leading-snug">{g.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Progress ratings */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-1">Goal Progress</h2>
            <p className="text-sm text-muted-foreground mb-5">Rate progress for each goal today.</p>
            <div className="space-y-5">
              {selectedGoals.map((id) => {
                const g = GOALS.find((x) => x.id === id);
                return (
                  <div key={id}>
                    <p className="text-sm font-semibold text-foreground mb-2">{g?.name}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {PROGRESS.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => setProgress(id, p.value)}
                          className={cn(
                            "py-3 rounded-xl text-xs font-semibold border-2 transition-all active:scale-95",
                            goalProgress[id] === p.value ? `${p.color} text-white border-transparent` : "border-border text-foreground bg-card"
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Prompts */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-1">Session Details</h2>
            <p className="text-sm text-muted-foreground mb-5">Answer to help AI generate an accurate note.</p>
            <div className="space-y-5">
              {[
                { key: "q1", prompt: "How did the client engage with today's activities? Any notable responses?" },
                { key: "q2", prompt: "Were there any challenges, barriers, or strategies used during this visit?" },
                { key: "q3", prompt: "Describe the client's overall mood and affect at the start and end of the visit." },
              ].map(({ key, prompt }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-foreground block mb-2">{prompt}</label>
                  <div className="relative">
                    <textarea
                      value={answers[key] || ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder="Tap to type or use voice…"
                      rows={3}
                      className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none pr-12"
                    />
                    <button className="absolute right-3 top-3 text-muted-foreground">
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Incidents */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-1">Incidents & Events</h2>
            <p className="text-sm text-muted-foreground mb-5">Note any incidents, behavioral events, or medication administrations.</p>
            <div className="relative">
              <textarea
                value={incidents}
                onChange={(e) => setIncidents(e.target.value)}
                placeholder="No incidents to report (leave blank if none)…"
                rows={5}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none pr-12"
              />
              <button className="absolute right-3 top-3 text-muted-foreground">
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Need to file a formal incident? Use the Incident Report flow.</p>
          </div>
        )}

        {/* Step 5: AI Draft */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-1">Review & Submit</h2>
            <p className="text-sm text-muted-foreground mb-4">AI-generated draft — edit before submitting.</p>
            {generating ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating note…</p>
              </div>
            ) : (
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={8}
                className="w-full rounded-xl border-2 border-primary bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            )}
            <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 font-medium">AI-generated — review carefully before submitting. You are responsible for accuracy.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="px-4 pb-6 pt-3 border-t border-border bg-card">
        {step < 4 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 1 && selectedGoals.length === 0}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-95 transition-transform"
          >
            Continue
          </button>
        )}
        {step === 4 && (
          <button
            onClick={generateDraft}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            Generate Note Draft
          </button>
        )}
        {step === 5 && !generating && (
          <button
            onClick={submitNote}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Send className="w-4 h-4" />
            Submit Note
          </button>
        )}
      </div>
    </div>
  );
}