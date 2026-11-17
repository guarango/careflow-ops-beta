import React, { useState } from "react";
import { ChevronDown, ChevronUp, SkipForward, Calendar, Target, Plus, Minus, AlertTriangle, Hand, Grab, HandMetal, Pointer, MessageSquare, Lightbulb, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PROMPT_HIERARCHY, computeScore, measurementKind, validateEntry } from "@/lib/goalData";

const PROMPT_ICONS = {
  "Full Physical Assist": { icon: Hand, short: "FA", color: "bg-red-100 text-red-700 border-red-300" },
  "Hand-Over-Hand": { icon: Grab, short: "HOH", color: "bg-orange-100 text-orange-700 border-orange-300" },
  "Physical Prompt": { icon: HandMetal, short: "PP", color: "bg-amber-100 text-amber-700 border-amber-300" },
  "Gestural Prompt": { icon: Pointer, short: "GP", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  "Verbal Prompt": { icon: MessageSquare, short: "VP", color: "bg-lime-100 text-lime-700 border-lime-300" },
  "Indirect Verbal Cue": { icon: Lightbulb, short: "IV", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  "Independent": { icon: CheckCircle2, short: "IND", color: "bg-sky-100 text-sky-700 border-sky-300" },
};

const MASTERY_OPTIONS = [
  { value: "Yes", label: "✓ Yes", color: "bg-emerald-500 text-white border-emerald-500" },
  { value: "Partial", label: "~ Partial", color: "bg-amber-400 text-white border-amber-400" },
  { value: "No", label: "✗ No", color: "bg-red-400 text-white border-red-400" },
  { value: "Not Enough Trials", label: "⋯ N/A", color: "bg-slate-200 text-slate-600 border-slate-300" },
];

const ENGAGEMENT = ["Motivated", "Neutral", "Resistant", "Distressed", "Variable"];
const ENGAGEMENT_EMOJI = { Motivated: "😊", Neutral: "😐", Resistant: "😤", Distressed: "😟", Variable: "🔄" };
const SKIP_REASONS = ["No opportunity arose", "Person refused", "Health issue", "Environmental barrier", "Other"];

const num = (v) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v));

function Counter({ label, value, tone, onAdd, onRemove }) {
  return (
    <div className={cn("flex-1 rounded-xl border-2 bg-white px-2 py-1.5", tone)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center">{label}</p>
      <div className="flex items-center justify-between mt-1">
        <button type="button" onClick={onRemove} className="w-8 h-8 rounded-lg border border-border bg-white flex items-center justify-center text-muted-foreground hover:bg-muted" aria-label={`Remove one ${label}`}>
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-2xl font-black tabular-nums">{value}</span>
        <button type="button" onClick={onAdd} className="w-8 h-8 rounded-lg border border-border bg-white flex items-center justify-center text-foreground hover:bg-muted" aria-label={`Add one ${label}`}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function GoalDataCard({ goalEntry, onChange, goal, clientName, priority, chartingMode, scheduleDays, noteContext = {} }) {
  const [showSkip, setShowSkip] = useState(false);
  const [skipReason, setSkipReason] = useState(goalEntry.skip_reason || "");
  const [customSkip, setCustomSkip] = useState("");
  const [expanded, setExpanded] = useState(true);

  const g = goalEntry;
  const set = (k, v) => onChange({ ...g, [k]: v });
  const kind = measurementKind(goal);
  const score = computeScore(g, goal);
  const { errors, warnings } = validateEntry(g, {
    goal,
    minutes: noteContext.minutes,
    serviceCodeId: noteContext.service_code_id,
  });

  const correct = num(g.trials_correct);
  const total = Math.max(num(g.trials_total), correct);
  const incorrect = Math.max(0, total - correct);
  const pct = total > 0 ? Math.round((correct / total) * 100) : null;

  const addCorrect = () => onChange({ ...g, trials_correct: correct + 1, trials_total: total + 1, percentage: Math.round(((correct + 1) / (total + 1)) * 100) });
  const removeCorrect = () => {
    const c = Math.max(0, correct - 1);
    onChange({ ...g, trials_correct: c, trials_total: total, percentage: total > 0 ? Math.round((c / total) * 100) : null });
  };
  const addIncorrect = () => onChange({ ...g, trials_correct: correct, trials_total: total + 1, percentage: Math.round((correct / (total + 1)) * 100) });
  const removeIncorrect = () => {
    const t = Math.max(correct, total - 1);
    onChange({ ...g, trials_correct: correct, trials_total: t, percentage: t > 0 ? Math.round((correct / t) * 100) : null });
  };

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
            <p className="text-xs text-muted-foreground mt-0.5">Missed — {g.skip_reason}</p>
          </div>
          <button type="button" onClick={() => onChange({ ...g, skipped: false, skip_reason: "" })} className="text-xs text-primary hover:underline">Undo</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border border-border rounded-xl bg-white shadow-sm border-l-4", priorityColor)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left"
      >
        <Target className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {priority && <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0", priority === "High" ? "bg-red-100 text-red-700" : priority === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")}>{priority}</span>}
            <p className="font-semibold text-sm leading-snug truncate">{g.goal_title}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {chartingMode && (
              <Badge variant="outline" className={cn("text-[9px] h-4 py-0", chartingMode === "Scheduled" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                {chartingMode === "Scheduled" ? "Scheduled" : "PRN"}
              </Badge>
            )}
            {chartingMode === "Scheduled" && scheduleDays && scheduleDays.length > 0 && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" /> {scheduleDays.map(d => d.slice(0, 3)).join(", ")}
              </span>
            )}
            {g.prompt_level && <span className="text-[9px] text-muted-foreground">{g.prompt_level}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {score ? (
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md bg-muted", pct === null ? "text-foreground" : pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-600")}>
              {score.label}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">No data</span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-border/40 pt-2.5">
          {/* Inherited from the note — read only */}
          <p className="text-[10px] text-muted-foreground bg-muted/40 rounded-lg px-2 py-1 leading-relaxed">
            From this note: <span className="font-medium text-foreground">{noteContext.staff_name || "Staff"}</span>
            {noteContext.start_time && noteContext.end_time ? ` · ${noteContext.start_time}–${noteContext.end_time}` : ""}
            {noteContext.service_code ? ` · ${noteContext.service_code}` : ""}
            {noteContext.date ? ` · ${noteContext.date}` : ""}
          </p>

          {/* Measurement */}
          {kind === "trials" && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Trials — tap + for each try</p>
              <div className="flex items-center gap-2">
                <Counter label="Correct" value={correct} tone="border-emerald-200" onAdd={addCorrect} onRemove={removeCorrect} />
                <Counter label="Incorrect" value={incorrect} tone="border-rose-200" onAdd={addIncorrect} onRemove={removeIncorrect} />
                <div className={cn("w-16 text-center text-2xl font-black", pct === null ? "text-muted-foreground" : pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-600")}>
                  {pct === null ? "—" : `${pct}%`}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Total tries: {total}{goal?.minimum_trials_per_session ? ` · minimum ${goal.minimum_trials_per_session}` : ""} — the score is calculated, never typed.
              </p>
            </div>
          )}

          {kind === "duration" && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                Minutes engaged {noteContext.minutes ? `(note is ${noteContext.minutes} min)` : ""}
              </p>
              <div className="flex items-center gap-2">
                <Counter
                  label="Minutes"
                  value={num(g.duration_minutes)}
                  tone="border-sky-200"
                  onAdd={() => set("duration_minutes", num(g.duration_minutes) + 5)}
                  onRemove={() => set("duration_minutes", Math.max(0, num(g.duration_minutes) - 5))}
                />
                <Input
                  type="number" min={0} max={noteContext.minutes || undefined}
                  value={g.duration_minutes ?? ""}
                  onChange={e => set("duration_minutes", e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-24 h-9 text-center font-bold"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {kind === "frequency" && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">How many times did it happen?</p>
              <Counter
                label="Occurrences"
                value={num(g.frequency_count)}
                tone="border-violet-200"
                onAdd={() => set("frequency_count", num(g.frequency_count) + 1)}
                onRemove={() => set("frequency_count", Math.max(0, num(g.frequency_count) - 1))}
              />
            </div>
          )}

          {kind === "rating" && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Rating (1 low — 5 high)</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => set("rating", n)}
                    className={cn("w-9 h-9 rounded-lg border-2 text-sm font-bold", num(g.rating) === n ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-muted-foreground")}
                  >{n}</button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt level as icon chips */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Level of help given</p>
            <div className="flex flex-wrap gap-1.5">
              {PROMPT_HIERARCHY.map(level => {
                const meta = PROMPT_ICONS[level];
                const Icon = meta.icon;
                return (
                  <button
                    key={level}
                    type="button"
                    title={level}
                    onClick={() => set("prompt_level", level)}
                    className={cn(
                      "flex items-center gap-1 rounded-lg border-2 px-2 py-1 text-[10px] font-bold transition-all",
                      g.prompt_level === level ? `${meta.color} shadow-sm` : "bg-muted/40 border-transparent text-muted-foreground hover:border-border"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {meta.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Validation */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 space-y-0.5">
              {errors.map((e, i) => (
                <p key={i} className="text-[11px] text-red-700 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{e}
                </p>
              ))}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 space-y-0.5">
              {warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-800 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{w}
                </p>
              ))}
            </div>
          )}

          {/* Mastery */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Met the goal criteria today?</p>
            <div className="flex gap-1.5 flex-wrap">
              {MASTERY_OPTIONS.map(m => (
                <button key={m.value} type="button" onClick={() => set("mastery_met", m.value)}
                  className={cn("px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all",
                    g.mastery_met === m.value ? `${m.color} shadow-sm` : "bg-white border-border text-muted-foreground hover:border-primary/30")}
                >{m.label}</button>
              ))}
            </div>
          </div>

          {/* Engagement */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Energy / mood</p>
            <div className="flex gap-1.5 flex-wrap">
              {ENGAGEMENT.map(e => (
                <button key={e} type="button" onClick={() => set("engagement", e)}
                  className={cn("px-2.5 py-1 rounded-lg border-2 text-xs font-medium transition-all",
                    g.engagement === e ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-muted-foreground hover:border-primary/30")}
                >{ENGAGEMENT_EMOJI[e]} {e}</button>
              ))}
            </div>
          </div>

          {/* Narrative */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-muted-foreground">What happened during this goal?</p>
              {!g.narrative && (
                <button type="button" onClick={() => set("narrative", buildNarrative())} className="text-[11px] text-primary hover:underline">
                  Use template →
                </button>
              )}
            </div>
            <Textarea
              value={g.narrative || ""}
              onChange={e => set("narrative", e.target.value)}
              rows={2}
              placeholder={`What did ${clientName || "the person"} do? What worked? What was hard?`}
              className="text-sm resize-none"
            />
          </div>

          {/* Person choices + highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Expressed a preference?</p>
              <div className="flex gap-1.5">
                {["Yes", "No"].map(v => (
                  <button key={v} type="button"
                    onClick={() => set("person_expressed_preference", v === "Yes")}
                    className={cn("flex-1 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all",
                      (g.person_expressed_preference === true && v === "Yes") || (g.person_expressed_preference === false && v === "No")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-white text-muted-foreground")}
                  >{v}</button>
                ))}
              </div>
              {g.person_expressed_preference && (
                <Input
                  value={g.preference_detail || ""}
                  onChange={e => set("preference_detail", e.target.value)}
                  placeholder="What did they choose?"
                  className="mt-1.5 text-sm h-8"
                />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Highlight</p>
              <Input
                value={g.session_highlight || ""}
                onChange={e => set("session_highlight", e.target.value)}
                placeholder="Any win, no matter how small"
                className="text-sm h-8"
              />
            </div>
          </div>

          {/* Missed */}
          {!showSkip ? (
            <button type="button" onClick={() => setShowSkip(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <SkipForward className="w-3.5 h-3.5" /> Goal not charted today
            </button>
          ) : (
            <div className="bg-muted/40 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold">Why was this goal not charted?</p>
              <div className="flex flex-wrap gap-1.5">
                {SKIP_REASONS.map(r => (
                  <button key={r} type="button"
                    onClick={() => setSkipReason(r)}
                    className={cn("px-2.5 py-1 rounded-lg border text-xs transition-all",
                      skipReason === r ? "border-primary bg-primary/10 text-primary font-medium" : "border-border bg-white text-muted-foreground")}
                  >{r}</button>
                ))}
              </div>
              {skipReason === "Other" && (
                <Input value={customSkip} onChange={e => setCustomSkip(e.target.value)} placeholder="Describe reason..." className="text-sm h-8" />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={handleConfirmSkip} disabled={!skipReason || (skipReason === "Other" && !customSkip)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-40">Confirm</button>
                <button type="button" onClick={() => setShowSkip(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}