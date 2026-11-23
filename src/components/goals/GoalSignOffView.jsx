import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Circle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { measurementKind, computeScore, hasMeasurement, PROMPT_HIERARCHY } from "@/lib/goalData";
import { goalsScheduledOn, isSignedOn, signedEntryOn } from "@/lib/goalSchedule";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700", "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700", "bg-rose-100 text-rose-700",
];
function getColor(id = "") {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const num = (v) => (v === "" || v === null || v === undefined ? null : Math.round(Number(v)));

const emptyDraft = (goal) => ({
  trials_correct: "",
  trials_total: "",
  duration_minutes: "",
  frequency_count: "",
  rating: "",
  prompt_level: goal?.prompt_level_baseline || "",
  notes: "",
});

/** A draft is signable when it carries a valid measurement for the goal's method. */
function draftIsValid(draft, goal) {
  const kind = measurementKind(goal);
  if (kind === "trials") {
    const total = num(draft.trials_total);
    const correct = num(draft.trials_correct);
    return total !== null && total >= 1 && correct !== null && correct >= 0 && correct <= total;
  }
  if (kind === "duration") {
    const d = num(draft.duration_minutes);
    return d !== null && d >= 0;
  }
  if (kind === "frequency") {
    const c = num(draft.frequency_count);
    return c !== null && c >= 0;
  }
  const r = num(draft.rating);
  return r !== null && r >= 1 && r <= 5;
}

function GoalSignOffRow({ goal, date, draft, onChange, signedEntry, expanded, onExpand }) {
  const kind = measurementKind(goal);
  const signed = !!signedEntry;
  const showInputs = !signed || expanded;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 transition-colors",
        signed && !expanded ? "border-emerald-200" : "border-border"
      )}
    >
      <div className="flex items-start gap-2.5">
        {signed ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
        ) : (
          <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{goal.goal_title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {goal.domain}
            {goal.mastery_criteria ? ` · Target: ${goal.mastery_criteria}` : ""}
          </p>
          {signed && (
            <p className="mt-1 text-[11px] font-medium text-emerald-700">
              Signed off — {signedEntry.score || "recorded"}
              {signedEntry.prompt_level ? ` · ${signedEntry.prompt_level}` : ""}
              {signedEntry.recorded_by ? ` · ${signedEntry.recorded_by}` : ""}
            </p>
          )}
          {signed && signedEntry.notes && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{signedEntry.notes}</p>
          )}
        </div>
        {signed && !expanded && (
          <Button variant="ghost" size="sm" className="h-7 flex-shrink-0 gap-1 text-xs" onClick={onExpand}>
            <Plus className="h-3 w-3" /> Entry
          </Button>
        )}
      </div>

      {showInputs && (
        <div className="mt-2.5 space-y-2 pl-6">
          {kind === "trials" && (
            <div className="flex items-end gap-2">
              <div className="w-20">
                <Label className="text-[10px] text-muted-foreground">Correct</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.trials_correct}
                  onChange={(e) => onChange({ trials_correct: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <span className="pb-2 text-sm text-muted-foreground">/</span>
              <div className="w-20">
                <Label className="text-[10px] text-muted-foreground">Trials</Label>
                <Input
                  type="number"
                  min={1}
                  value={draft.trials_total}
                  onChange={(e) => onChange({ trials_total: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              {draft.trials_total !== "" && Number(draft.trials_total) > 0 && draft.trials_correct !== "" && (
                <span className="pb-2 text-xs font-semibold text-primary">
                  {Math.round((Number(draft.trials_correct) / Number(draft.trials_total)) * 100)}%
                </span>
              )}
            </div>
          )}

          {kind === "duration" && (
            <div className="w-28">
              <Label className="text-[10px] text-muted-foreground">Minutes</Label>
              <Input
                type="number"
                min={0}
                value={draft.duration_minutes}
                onChange={(e) => onChange({ duration_minutes: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
          )}

          {kind === "frequency" && (
            <div className="w-28">
              <Label className="text-[10px] text-muted-foreground">Occurrences</Label>
              <Input
                type="number"
                min={0}
                value={draft.frequency_count}
                onChange={(e) => onChange({ frequency_count: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
          )}

          {kind === "rating" && (
            <div className="w-32">
              <Label className="text-[10px] text-muted-foreground">Rating (1–5)</Label>
              <Select value={draft.rating} onValueChange={(v) => onChange({ rating: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((r) => <SelectItem key={r} value={String(r)}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <div className="w-44">
              <Label className="text-[10px] text-muted-foreground">Prompt level</Label>
              <Select value={draft.prompt_level} onValueChange={(v) => onChange({ prompt_level: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {PROMPT_HIERARCHY.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px] flex-1">
              <Label className="text-[10px] text-muted-foreground">Observation (optional)</Label>
              <Textarea
                value={draft.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                rows={1}
                placeholder="What you saw this session…"
                className="min-h-8 resize-none text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GoalSignOffView({ client, goals = [], date, onBack }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState({});
  const [expanded, setExpanded] = useState({});
  const [signature, setSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const signerName = user?.full_name || user?.email || "Staff";
  const scheduled = goalsScheduledOn(goals, date).sort((a, b) => a.goal_title.localeCompare(b.goal_title));
  const signedCount = scheduled.filter((g) => isSignedOn(g, date)).length;

  const draftFor = (goal) => drafts[goal.id] || emptyDraft(goal);
  const changeDraft = (goal, patch) =>
    setDrafts((prev) => ({ ...prev, [goal.id]: { ...(prev[goal.id] || emptyDraft(goal)), ...patch } }));

  const ready = scheduled.filter((g) => {
    const draft = drafts[g.id];
    return draft && draftIsValid(draft, g);
  });

  const displayDate = (() => {
    try { return format(new Date(`${date}T12:00:00`), "EEEE, MMMM d, yyyy"); } catch { return date; }
  })();

  const handleSave = async () => {
    if (!ready.length) return;
    setSaving(true);
    setSaveError("");
    const now = new Date();
    const signatureTimestamp = `Signed by ${signerName} on ${format(now, "MM/dd/yyyy")} at ${format(now, "h:mm aa")}`;
    try {
      for (const goal of ready) {
        const draft = drafts[goal.id];
        const score = computeScore(draft, goal);
        const entry = {
          date,
          charting_mode: goal.charting_mode || "Scheduled",
          trials_correct: num(draft.trials_correct),
          trials_total: num(draft.trials_total),
          duration_minutes: num(draft.duration_minutes),
          frequency_count: num(draft.frequency_count),
          rating: num(draft.rating),
          percentage: score?.percentage ?? null,
          computed_score: score?.value ?? null,
          score: score?.label || "",
          prompt_level: draft.prompt_level || "",
          notes: draft.notes || "",
          recorded_by: signerName,
          staff_name: signerName,
          recorded_at: now.toISOString(),
          signature_timestamp: signatureTimestamp,
          status: "Valid",
        };
        if (!hasMeasurement(entry, goal)) continue;
        await base44.entities.ClientGoal.update(goal.id, {
          progress_entries: [...(goal.progress_entries || []), entry],
        });
      }
      setDrafts({});
      setExpanded({});
      setSignature(false);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    } catch (err) {
      setSaveError(err?.message || "Could not save the sign-off. Nothing was recorded.");
    } finally {
      setSaving(false);
    }
  };

  const initials = `${client?.first_name?.[0] || ""}${client?.last_name?.[0] || ""}`.toUpperCase();

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {client?.photo_url ? (
            <img src={client.photo_url} alt={initials} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold", getColor(client?.id))}>
              {initials}
            </div>
          )}
          <div>
            <p className="text-lg font-bold">{client?.first_name} {client?.last_name}</p>
            <p className="text-xs text-muted-foreground">{displayDate}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">
            {signedCount} of {scheduled.length} signed off
          </p>
          <p className="text-xs text-muted-foreground">Goal sign-off</p>
        </div>
      </div>

      {scheduled.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
          No active scheduled goals for this date.
        </div>
      ) : (
        <>
          <div className="space-y-2.5">
            {scheduled.map((goal) => {
              const signedEntry = signedEntryOn(goal, date);
              return (
                <GoalSignOffRow
                  key={goal.id}
                  goal={goal}
                  date={date}
                  draft={draftFor(goal)}
                  onChange={(patch) => changeDraft(goal, patch)}
                  signedEntry={signedEntry}
                  expanded={!!expanded[goal.id]}
                  onExpand={() => setExpanded((prev) => ({ ...prev, [goal.id]: true }))}
                />
              );
            })}
          </div>

          {/* Signature + save */}
          <div className="mt-5 space-y-3 rounded-xl border border-border bg-card p-4">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={signature}
                onChange={(e) => setSignature(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
              />
              <span className="text-sm leading-snug">
                I confirm this goal data was collected as recorded
              </span>
            </label>
            {saveError && <p className="text-xs font-medium text-red-600">{saveError}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleSave} disabled={saving || !signature || ready.length === 0}>
                {saving ? "Signing off…" : `Sign Off ${ready.length || ""} Goal${ready.length === 1 ? "" : "s"}`.trim()}
              </Button>
              <span className="text-xs text-muted-foreground">
                {signerName} · {format(new Date(), "h:mm a")}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}