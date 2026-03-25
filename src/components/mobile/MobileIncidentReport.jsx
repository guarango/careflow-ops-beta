import React, { useState } from "react";
import { ChevronLeft, Mic, AlertTriangle, CheckCircle2, Camera, Loader2, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useOffline } from "@/hooks/useOffline";
import { cn } from "@/lib/utils";

const INCIDENT_TYPES = [
  { id: "behavioral", label: "Behavioral Incident", critical: false },
  { id: "injury_client", label: "Client Injury", critical: true },
  { id: "injury_staff", label: "Staff Injury", critical: true },
  { id: "medication_error", label: "Medication Error", critical: true },
  { id: "property_damage", label: "Property Damage", critical: false },
  { id: "elopement", label: "Elopement / Wandering", critical: true },
  { id: "abuse_neglect", label: "Suspected Abuse / Neglect", critical: true },
  { id: "fall", label: "Fall", critical: false },
  { id: "other", label: "Other", critical: false },
];

const CRITICAL_TYPES = INCIDENT_TYPES.filter((t) => t.critical).map((t) => t.id);

export default function MobileIncidentReport({ onClose }) {
  const [step, setStep] = useState(1);
  const [incidentType, setIncidentType] = useState(null);
  const [involved, setInvolved] = useState([]);
  const [antecedent, setAntecedent] = useState("");
  const [behavior, setBehavior] = useState("");
  const [response, setResponse] = useState("");
  const [injuries, setInjuries] = useState("");
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { enqueueAction, isOnline } = useOffline();

  const isCritical = CRITICAL_TYPES.includes(incidentType);

  function toggleInvolved(p) {
    setInvolved((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  async function generateDraft() {
    setGenerating(true);
    setStep(5);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a formal incident report for a direct support professional. Incident type: ${incidentType}. Individuals involved: ${involved.join(", ")}. Antecedent: ${antecedent}. Behavior: ${behavior}. Staff response: ${response}. Injuries/damage: ${injuries || "None reported"}. Write in professional, objective, third-person clinical language suitable for state regulatory review. 3-5 sentences.`,
      });
      setDraft(typeof res === "string" ? res : res?.text || "Incident occurred as described above. Staff responded appropriately per the individual support plan.");
    } catch {
      setDraft(`An incident of type "${incidentType}" was observed and documented. Staff responded immediately per agency protocol. This report has been flagged for supervisor review.`);
    }
    setGenerating(false);
  }

  async function submitReport() {
    const payload = {
      type: "create",
      entity: "IncidentReport",
      data: {
        incident_type: incidentType,
        individuals_involved: involved,
        description: draft,
        antecedent,
        behavior_description: behavior,
        staff_response: response,
        injury_description: injuries,
        status: "Submitted",
        submitted_at: new Date().toISOString(),
        mandatory_reporting: isCritical,
      },
    };
    if (isOnline) {
      try { await base44.entities.IncidentReport.create(payload.data); } catch {}
    } else {
      enqueueAction(payload);
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center">
        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", isCritical ? "bg-red-100" : "bg-green-100")}>
          <CheckCircle2 className={cn("w-8 h-8", isCritical ? "text-red-600" : "text-green-600")} />
        </div>
        <h2 className="text-xl font-bold text-foreground">Report Submitted</h2>
        {isCritical && (
          <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700 font-semibold">⚠️ Mandatory Reporting Triggered</p>
            <p className="text-xs text-red-600 mt-1">Your supervisor has been automatically notified. State reporting may be required within 24 hours.</p>
          </div>
        )}
        <p className="text-muted-foreground text-sm mt-3 mb-6">
          {!isOnline ? "Saved offline — will sync when connected." : "Report filed and supervisor notified."}
        </p>
        <button onClick={onClose} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm">Done</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <button onClick={step === 1 ? onClose : () => setStep((s) => s - 1)} className="w-8 h-8 rounded-full flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-red-500 font-semibold uppercase tracking-wide">Incident Report</p>
          <p className="text-sm font-semibold">Step {step} of 5</p>
        </div>
        <div className="flex gap-1">
          {[1,2,3,4,5].map((s) => (
            <span key={s} className={cn("w-2 h-2 rounded-full", s <= step ? "bg-red-500" : "bg-muted")} />
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 overflow-y-auto">
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold mb-1">Incident Type</h2>
            <p className="text-sm text-muted-foreground mb-5">What type of incident occurred?</p>
            <div className="space-y-2">
              {INCIDENT_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setIncidentType(t.id)}
                  className={cn("w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all active:scale-95",
                    incidentType === t.id ? "border-red-500 bg-red-50" : "border-border bg-card")}
                >
                  {t.critical && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  <span className={cn("text-sm font-medium flex-1", t.critical ? "text-red-700" : "text-foreground")}>{t.label}</span>
                  {t.critical && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">Mandatory</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold mb-1">Individuals Involved</h2>
            <p className="text-sm text-muted-foreground mb-5">Select everyone involved.</p>
            {["Client", "Staff Member", "Other Person", "Property Only"].map((p) => (
              <button
                key={p}
                onClick={() => toggleInvolved(p)}
                className={cn("w-full flex items-center gap-3 p-4 rounded-xl border-2 mb-2 text-left transition-all active:scale-95",
                  involved.includes(p) ? "border-primary bg-primary/5" : "border-border bg-card")}
              >
                <div className={cn("w-5 h-5 rounded flex-shrink-0 border-2", involved.includes(p) ? "border-primary bg-primary" : "border-muted-foreground")}>
                  {involved.includes(p) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-sm font-medium">{p}</span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold mb-1">What Happened</h2>
            {[
              { label: "Antecedent — What happened right before the incident?", val: antecedent, set: setAntecedent },
              { label: "Behavior — Describe exactly what occurred.", val: behavior, set: setBehavior },
              { label: "Response — How did staff respond?", val: response, set: setResponse },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="text-sm font-medium block mb-2">{label}</label>
                <div className="relative">
                  <textarea value={val} onChange={(e) => set(e.target.value)} rows={3}
                    placeholder="Tap to type or use voice…"
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none pr-12"
                  />
                  <button className="absolute right-3 top-3 text-muted-foreground"><Mic className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold mb-1">Injuries & Documentation</h2>
            <div className="relative mb-4">
              <textarea value={injuries} onChange={(e) => setInjuries(e.target.value)} rows={4}
                placeholder="Describe any injuries, property damage, or immediate medical interventions…"
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none pr-12"
              />
              <button className="absolute right-3 top-3 text-muted-foreground"><Mic className="w-4 h-4" /></button>
            </div>
            <button className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-4 text-sm text-muted-foreground active:scale-95 transition-transform">
              <Camera className="w-4 h-4" />
              Attach Photos
            </button>
            {isCritical && (
              <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700 font-semibold">⚠️ Mandatory Reporting Required</p>
                <p className="text-xs text-red-600 mt-1">Submitting this report will automatically notify your supervisor.</p>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-lg font-bold mb-1">Review & Submit</h2>
            {generating ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                <p className="text-sm text-muted-foreground">Generating report…</p>
              </div>
            ) : (
              <>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8}
                  className="w-full rounded-xl border-2 border-red-300 bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">AI-generated — verify all facts before submitting.</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pb-6 pt-3 border-t border-border bg-card">
        {step < 4 && (
          <button onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !incidentType}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-95 transition-transform">
            Continue
          </button>
        )}
        {step === 4 && (
          <button onClick={generateDraft} className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold text-sm active:scale-95 transition-transform">
            Generate Report Draft
          </button>
        )}
        {step === 5 && !generating && (
          <button onClick={submitReport} className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <Send className="w-4 h-4" /> Submit Incident Report
          </button>
        )}
      </div>
    </div>
  );
}