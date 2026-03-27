import React, { useState } from "react";
import { ChevronDown, ChevronUp, SkipForward } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PROMPT_LEVELS = [
  { label: "Full\nAssist", short: "FA", value: "Full Physical Assist", color: "bg-red-100 text-red-700 border-red-200" },
  { label: "Hand\nOver\nHand", short: "HOH", value: "Hand-Over-Hand", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { label: "Physical\nPrompt", short: "PP", value: "Physical Prompt", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { label: "Gestural\nPrompt", short: "GP", value: "Gestural Prompt", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { label: "Verbal\nPrompt", short: "VP", value: "Verbal Prompt", color: "bg-lime-100 text-lime-700 border-lime-200" },
  { label: "Indirect\nVerbal", short: "IV", value: "Indirect Verbal Cue", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { label: "Inde-\npendent", short: "IND", value: "Independent", color: "bg-sky-100 text-sky-700 border-sky-200" },
];

const MASTERY_OPTIONS = [
  { value: "Yes", label: "✓ Yes", color: "bg-emerald-500 text-white border-emerald-500" },
  { value: "Partial", label: "~ Partial", color: "bg-amber-400 text-white border-amber-400" },
  { value: "No", label: "✗ No", color: "bg-red-400 text-white border-red-400" },
  { value: "Not Enough Trials", label: "⋯ N/A", color: "bg-slate-200 text-slate-600 border-slate-300" },
];

const ENGAGEMENT = ["Motivated", "Neutral", "Resistant", "Distressed", "Variable"];
const ENGAGEMENT_EMOJI = { Motivated: "😊", Neutral: "😐", Resistant: "😤", Distressed: "😟", Variable: "🔄" };

const SKIP_REASONS = ["No opportunity arose", "Person refused", "Health issue", "Environmental barrier", "Other"];

export default function GoalDataCard({ goalEntry, onChange, clientName, priority, index }) {
  const [showSkip, setShowSkip] = useState(false);
  const [skipReason, setSkipReason] = useState(goalEntry.skip_reason || "");
  const [customSkip, setCustomSkip] = useState("");
  const [expanded, setExpanded] = useState(true);

  const g = goalEntry;
  const set = (k, v) => onChange({ ...g, [k]: v });

  const pct = g.trials_total > 0 ? Math.round((g.trials_correct / g.trials_total) * 100) : null;

  // Auto-build narrative template
  const buildNarrative = () => {
    const name = clientName || "the person";
    return `Today ${name} worked on "${g.goal_title}". They [describe what happened]. The prompt level used was ${g.prompt_level || "[prompt level]"}. ${name}'s engagement was ${g.engagement || "[engagement]"}. A barrier we noticed was [none or describe]. Something that worked well was [describe].`;
  };

  const handleConfirmSkip = () => {
    const reason = skipReason === "Other" ? customSkip : skipReason;
    onChange({ ...g, skipped: true, skip_reason: reason });
    setShowSkip(false);
  };

  const priorityColor = priority === "High" ? "border-l-red-400" : priority === "Medium" ? "border-l-amber-400" : "border-l-slate-300";

  if (g.skipped) {
    return (
      <div className="border border-border rounded-xl px-4 py-3 bg-muted/40 border-l-4 border-l-slate-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm text-muted-foreground line-through">{g.goal_title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Skipped — {g.skip_reason}</p>
          </div>
          <button type="button" onClick={() => onChange({ ...g, skipped: false, skip_reason: "" })} className="text-xs text-primary hover:underline">Undo</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border-2 border-border rounded-xl bg-white shadow-sm border-l-4", priorityColor, !expanded && "")}>
      {/* Card Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {priority && <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0", priority === "High" ? "bg-red-100 text-red-700" : priority === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")}>{priority}</span>}
            <p className="font-semibold text-sm leading-snug truncate">{g.goal_title}</p>
          </div>
          {pct !== null && <p className="text-xs text-muted-foreground mt-0.5">{g.trials_correct}/{g.trials_total} correct · <span className={cn("font-bold", pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-600")}>{pct}%</span></p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {g.prompt_level && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded hidden sm:block">{g.prompt_level}</span>}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-3">

          {/* Trials */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">How many tries did you give today?</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground block mb-1">Correct / Successful</label>
                <Input
                  type="number" min={0}
                  value={g.trials_correct ?? ""}
                  onChange={e => {
                    const correct = Number(e.target.value);
                    const total = g.trials_total || 0;
                    set("trials_correct", correct);
                    if (total > 0) onChange({ ...g, trials_correct: correct, percentage: Math.round((correct / total) * 100) });
                  }}
                  className="text-center text-lg font-bold h-12 text-emerald-700"
                  placeholder="0"
                />
              </div>
              <div className="text-2xl text-muted-foreground mt-4">/</div>
              <div className="flex-1">
                <label className="text-[11px] text-muted-foreground block mb-1">Total Tries</label>
                <Input
                  type="number" min={0}
                  value={g.trials_total ?? ""}
                  onChange={e => {
                    const total = Number(e.target.value);
                    const correct = g.trials_correct || 0;
                    onChange({ ...g, trials_total: total, percentage: total > 0 ? Math.round((correct / total) * 100) : null });
                  }}
                  className="text-center text-lg font-bold h-12"
                  placeholder="0"
                />
              </div>
              {pct !== null && (
                <div className={cn("text-2xl font-black w-16 text-center mt-4", pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-600")}>
                  {pct}%
                </div>
              )}
            </div>
          </div>

          {/* Prompt Level */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">What level of help did you give?</p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {PROMPT_LEVELS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set("prompt_level", p.value)}
                  className={cn(
                    "rounded-xl border-2 py-2.5 text-center text-[10px] font-bold leading-tight transition-all min-h-[56px]",
                    g.prompt_level === p.value ? `${p.color} border-current shadow-sm scale-105` : "bg-muted/40 border-transparent text-muted-foreground hover:border-border"
                  )}
                >
                  <div className="whitespace-pre-line">{p.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mastery */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Did they meet the goal criteria today?</p>
            <div className="flex gap-2 flex-wrap">
              {MASTERY_OPTIONS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => set("mastery_met", m.value)}
                  className={cn(
                    "px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all",
                    g.mastery_met === m.value ? `${m.color} shadow-sm` : "bg-white border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Engagement */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">How was their energy / mood?</p>
            <div className="flex gap-2 flex-wrap">
              {ENGAGEMENT.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => set("engagement", e)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all",
                    g.engagement === e ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {ENGAGEMENT_EMOJI[e]} {e}
                </button>
              ))}
            </div>
          </div>

          {/* Narrative */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Session note for this goal</p>
              {!g.narrative && (
                <button type="button" onClick={() => set("narrative", buildNarrative())} className="text-[11px] text-primary hover:underline">
                  Use template →
                </button>
              )}
            </div>
            <Textarea
              value={g.narrative || ""}
              onChange={e => set("narrative", e.target.value)}
              rows={3}
              placeholder={`Describe what happened during this goal today. What did ${clientName || "the person"} do? What worked? What was hard?`}
              className="text-sm resize-none"
            />
          </div>

          {/* Person choices + highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Did they make a choice or express a preference?</p>
              <div className="flex gap-2">
                {["Yes", "No"].map(v => (
                  <button key={v} type="button"
                    onClick={() => set("person_expressed_preference", v === "Yes")}
                    className={cn("flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all",
                      (g.person_expressed_preference === true && v === "Yes") || (g.person_expressed_preference === false && v === "No")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-white text-muted-foreground"
                    )}
                  >{v}</button>
                ))}
              </div>
              {g.person_expressed_preference && (
                <Input
                  value={g.preference_detail || ""}
                  onChange={e => set("preference_detail", e.target.value)}
                  placeholder="What did they choose or express?"
                  className="mt-2 text-sm h-8"
                />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">🌟 Highlight of this goal</p>
              <Input
                value={g.session_highlight || ""}
                onChange={e => set("session_highlight", e.target.value)}
                placeholder="Any win, no matter how small..."
                className="text-sm"
              />
            </div>
          </div>

          {/* Skip option */}
          {!showSkip ? (
            <button type="button" onClick={() => setShowSkip(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1">
              <SkipForward className="w-3.5 h-3.5" /> Skip this goal
            </button>
          ) : (
            <div className="bg-muted/40 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold">Why are you skipping this goal?</p>
              <div className="flex flex-wrap gap-2">
                {SKIP_REASONS.map(r => (
                  <button key={r} type="button"
                    onClick={() => setSkipReason(r)}
                    className={cn("px-3 py-1.5 rounded-lg border text-xs transition-all",
                      skipReason === r ? "border-primary bg-primary/10 text-primary font-medium" : "border-border bg-white text-muted-foreground"
                    )}
                  >{r}</button>
                ))}
              </div>
              {skipReason === "Other" && (
                <Input value={customSkip} onChange={e => setCustomSkip(e.target.value)} placeholder="Describe reason..." className="text-sm h-8" />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={handleConfirmSkip} disabled={!skipReason || (skipReason === "Other" && !customSkip)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-40">Confirm Skip</button>
                <button type="button" onClick={() => setShowSkip(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}