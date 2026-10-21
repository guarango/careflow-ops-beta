import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Save, Wifi, WifiOff, Heart, Lock, Clock, History } from "lucide-react";
import HealthSafetyFlags from "./HealthSafetyFlags";
import GoalDataCard from "./GoalDataCard";
import AddendumDialog from "./AddendumDialog";
import DictationButton from "@/components/shared/DictationButton";
import CleanUpButton from "@/components/shared/CleanUpButton";
import { cn } from "@/lib/utils";
import { useOffline } from "@/hooks/useOffline";
import { format } from "date-fns";

const LOCATIONS = ["Day Program", "Community Outing", "Residence", "Vocational Site", "Telehealth", "Other"];

export default function SessionEntryForm({ client, goals, existingNote, staffName, serviceCodes = [], shifts = [], onSave, onAutosave, onCancel, saving, canAddAddendum = false, onAddendum }) {
  const { isOnline } = useOffline();
  const [sigChecked, setSigChecked] = useState(false);
  const [sigTimestamp, setSigTimestamp] = useState("");
  const [showAddendum, setShowAddendum] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);
  const autosaveTimer = useRef(null);

  const buildInitialGoalData = () => {
    const active = goals.filter(g => g.status === "Active").sort((a, b) => {
      const p = { High: 0, Medium: 1, Low: 2 };
      return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
    });
    if (existingNote?.goal_data?.length) return existingNote.goal_data;
    return active.map(g => ({
      goal_id: g.id,
      goal_title: g.goal_title,
      skipped: false,
      skip_reason: "",
      trials_total: "",
      trials_correct: "",
      percentage: null,
      prompt_level: g.prompt_level_baseline || "",
      mastery_met: "",
      narrative: "",
      person_expressed_preference: null,
      preference_detail: "",
      person_communication: "",
      session_highlight: "",
      engagement: "",
    }));
  };

  const [form, setForm] = useState({
    client_id: client.id,
    client_name: `${client.first_name} ${client.last_name}`,
    staff_name: existingNote?.staff_name || staffName || "",
    shift_id: existingNote?.shift_id || "",
    service_code_id: existingNote?.service_code_id || "",
    service_code: existingNote?.service_code || "",
    date: existingNote?.date || today,
    start_time: existingNote?.start_time || now,
    end_time: existingNote?.end_time || "",
    location: existingNote?.location || "",
    location_other: existingNote?.location_other || "",
    summary: existingNote?.summary || "",
    original_summary: existingNote?.original_summary || "",
    ai_cleaned_summary: existingNote?.ai_cleaned_summary || "",
    ai_cleaned_at: existingNote?.ai_cleaned_at || "",
    health_safety_flags: existingNote?.health_safety_flags || {},
    goal_data: buildInitialGoalData(),
    session_overall_notes: existingNote?.session_overall_notes || "",
    status: existingNote?.status || "Draft",
    submitted_at: existingNote?.submitted_at || "",
    addenda: existingNote?.addenda || [],
    version: existingNote?.version || 1,
    version_history: existingNote?.version_history || [],
    offline_created: !isOnline,
  });

  // Whether this note is locked (Approved) — no editing
  const isLocked = form.status === "Approved";
  // Whether the current user can edit (Draft or Returned)
  const canEdit = form.status === "Draft" || form.status === "Returned" || form.status === "Needs Revision";

  const setGoalData = (i, updated) => {
    const newGoalData = [...form.goal_data];
    newGoalData[i] = updated;
    setForm(f => ({ ...f, goal_data: newGoalData }));
  };

  const goalForEntry = (entry) => goals.find(g => g.id === entry.goal_id);

  // ── Autosave drafts ──
  const formRef = useRef(form);
  formRef.current = form;

  const triggerAutosave = useCallback(() => {
    if (!onAutosave) return;
    if (formRef.current.status !== "Draft" && formRef.current.status !== "Returned" && formRef.current.status !== "Needs Revision") return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      onAutosave(formRef.current);
    }, 3000);
  }, [onAutosave]);

  useEffect(() => {
    if (canEdit) triggerAutosave();
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [form, canEdit, triggerAutosave]);

  const hasFlags = Object.values(form.health_safety_flags).some(v => v === true);
  const completedGoals = form.goal_data.filter(g => !g.skipped && (g.trials_total || g.narrative)).length;
  const totalGoals = form.goal_data.length;

  const handleSummaryChange = (val) => setForm(f => ({ ...f, summary: val }));

  const handleCleanUpAccept = ({ original, cleaned }) => {
    setForm(f => ({
      ...f,
      summary: cleaned,
      original_summary: original,
      ai_cleaned_summary: cleaned,
      ai_cleaned_at: new Date().toISOString(),
    }));
  };

  const handleSubmit = () => {
    onSave({ ...form, status: "Submitted", submitted_at: new Date().toISOString() });
  };
  const handleDraft = () => {
    onSave({ ...form, status: "Draft" });
  };

  const handleAddendum = ({ text, reason }) => {
    if (onAddendum) {
      const newAddendum = {
        text,
        added_by: staffName || "Admin",
        added_at: new Date().toISOString(),
        reason,
      };
      const newVersion = (form.version || 1) + 1;
      const newHistory = [...(form.version_history || []), {
        version: newVersion,
        saved_at: new Date().toISOString(),
        saved_by: staffName || "Admin",
        summary_of_changes: `Addendum: ${reason}`,
      }];
      onAddendum({
        id: existingNote?.id,
        addenda: [...(form.addenda || []), newAddendum],
        version: newVersion,
        version_history: newHistory,
      });
    }
    setShowAddendum(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border pb-3 mb-5 pt-1">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onCancel} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />Back
          </button>
          <div className="text-center flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">{client.first_name} {client.last_name}</p>
            <p className="text-xs text-muted-foreground">{form.date}</p>
          </div>
          <div className="flex items-center gap-2">
            {isLocked && (
              <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                <Lock className="w-3 h-3" />Locked
              </span>
            )}
            {form.status === "Returned" && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                Returned — revise & resubmit
              </span>
            )}
            {!isOnline ? (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                <WifiOff className="w-3 h-3" />Offline
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Wifi className="w-3 h-3" />Online
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{completedGoals} of {totalGoals} goals entered</span>
            {hasFlags && <span className="text-red-600 font-semibold">⚠ Health/Safety flagged</span>}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: totalGoals > 0 ? `${Math.round((completedGoals / totalGoals) * 100)}%` : "0%" }} />
          </div>
        </div>
      </div>

      <div className="space-y-5 pb-24">
        {/* Returned comment */}
        {form.status === "Returned" && form.returned_comment && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-700 mb-1">Manager Feedback:</p>
            <p className="text-sm text-amber-800">{form.returned_comment}</p>
            <p className="text-[10px] text-amber-600 mt-1">— {form.returned_by}, {form.returned_at ? format(new Date(form.returned_at), "MM/dd/yyyy h:mm aa") : ""}</p>
          </div>
        )}

        {/* Section 1: Session Info */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Session Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Your Name *</Label>
              <Input value={form.staff_name} disabled={isLocked} onChange={e => setForm(f => ({ ...f, staff_name: e.target.value }))} placeholder="Your name" className="h-9" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Service Code *</Label>
              <Select value={form.service_code_id} disabled={isLocked} onValueChange={v => {
                const sc = serviceCodes.find(s => s.id === v);
                setForm(f => ({ ...f, service_code_id: v, service_code: sc?.code || "" }));
              }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select service code" /></SelectTrigger>
                <SelectContent>{serviceCodes.map(s => <SelectItem key={s.id} value={s.id}>{s.code} — {s.description}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Linked Shift (optional)</Label>
              <Select value={form.shift_id} disabled={isLocked} onValueChange={v => setForm(f => ({ ...f, shift_id: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Link to a scheduled shift" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {shifts.filter(s => s.client_id === client.id).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.date} {s.start_time}–{s.end_time} ({s.service_code || "Shift"})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.date} disabled={isLocked} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Select value={form.location} disabled={isLocked} onValueChange={v => setForm(f => ({ ...f, location: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Where?" /></SelectTrigger>
                <SelectContent>{LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Start Time *</Label>
              <Input type="time" value={form.start_time} disabled={isLocked} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">End Time *</Label>
              <Input type="time" value={form.end_time} disabled={isLocked} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="h-9" />
            </div>
          </div>
        </div>

        {/* Section 2: Summary */}
        <div className="bg-white border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Session Summary *</p>
            {canEdit && (
              <CleanUpButton
                text={form.summary}
                onAccept={handleCleanUpAccept}
                goalTitles={form.goal_data.filter(g => !g.skipped).map(g => g.goal_title)}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-2">A written summary of what was done during this session.</p>
          <div className="relative">
            <Textarea
              value={form.summary}
              onChange={e => handleSummaryChange(e.target.value)}
              disabled={isLocked}
              rows={4}
              placeholder="Describe what you did during this session..."
              className="text-sm resize-none pr-12"
            />
            {canEdit && (
              <div className="absolute right-2 top-2">
                <DictationButton value={form.summary} onChange={handleSummaryChange} />
              </div>
            )}
          </div>
          {form.ai_cleaned_summary && form.original_summary && (
            <p className="text-[10px] text-violet-600 mt-1">✓ AI-cleaned version saved</p>
          )}
        </div>

        {/* Section 3: Health & Safety */}
        <div className="bg-white border border-border rounded-xl p-4">
          <HealthSafetyFlags
            flags={form.health_safety_flags}
            onChange={flags => setForm(f => ({ ...f, health_safety_flags: flags }))}
          />
        </div>

        {/* Section 4: Goal Cards */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Goals for Today ({totalGoals})
            </p>
            {canEdit && (() => {
              const today = new Date();
              const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];
              const prnGoals = goals.filter(g => g.status === "Active" && g.charting_mode === "PRN" && !form.goal_data.some(gd => gd.goal_id === g.id));
              if (prnGoals.length === 0) return null;
              return (
                <Select value="" onValueChange={(v) => {
                  const g = goals.find(x => x.id === v);
                  if (g) {
                    setForm(f => ({
                      ...f,
                      goal_data: [...f.goal_data, {
                        goal_id: g.id,
                        goal_title: g.goal_title,
                        skipped: false,
                        skip_reason: "",
                        trials_total: "",
                        trials_correct: "",
                        percentage: null,
                        prompt_level: g.prompt_level_baseline || "",
                        mastery_met: "",
                        narrative: "",
                        person_expressed_preference: null,
                        preference_detail: "",
                        person_communication: "",
                        session_highlight: "",
                        engagement: "",
                      }],
                    }));
                  }
                }}>
                  <SelectTrigger className="h-7 text-xs w-auto gap-1"><SelectValue placeholder="+ Add PRN Goal" /></SelectTrigger>
                  <SelectContent>
                    {prnGoals.map(g => <SelectItem key={g.id} value={g.id}>{g.goal_title}</SelectItem>)}
                  </SelectContent>
                </Select>
              );
            })()}
          </div>
          {form.goal_data.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              No active goals found for {client.first_name}.<br />
              <span className="text-xs">Ask your supervisor to add goals in the Goals module.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {form.goal_data.map((entry, i) => {
                const fullGoal = goalForEntry(entry);
                return (
                  <GoalDataCard
                    key={entry.goal_id || i}
                    goalEntry={entry}
                    onChange={(updated) => setGoalData(i, updated)}
                    clientName={client.first_name}
                    priority={fullGoal?.priority}
                    index={i}
                    chartingMode={fullGoal?.charting_mode}
                    scheduleDays={fullGoal?.schedule_days}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Section 5: Overall Session Note */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Overall Session Note</p>
          <p className="text-xs text-muted-foreground mb-2">Anything else worth noting about today's session that doesn't fit in a specific goal?</p>
          <div className="relative">
            <Textarea
              value={form.session_overall_notes}
              onChange={e => setForm(f => ({ ...f, session_overall_notes: e.target.value }))}
              disabled={isLocked}
              rows={3}
              placeholder="Overall observations, team communications, environmental notes, or anything meaningful from today..."
              className="text-sm resize-none pr-12"
            />
            {canEdit && (
              <div className="absolute right-2 top-2">
                <DictationButton
                  value={form.session_overall_notes}
                  onChange={(val) => setForm(f => ({ ...f, session_overall_notes: val }))}
                />
              </div>
            )}
          </div>
        </div>

        {/* Addenda (for locked notes) */}
        {form.addenda && form.addenda.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Addenda ({form.addenda.length})</p>
            </div>
            {form.addenda.map((a, i) => (
              <div key={i} className="mb-3 pb-3 border-b border-blue-200 last:border-0 last:pb-0 last:mb-0">
                <p className="text-sm text-foreground">{a.text}</p>
                <p className="text-[10px] text-blue-600 mt-1">— {a.added_by}, {a.added_at ? format(new Date(a.added_at), "MM/dd/yyyy h:mm aa") : ""} · {a.reason}</p>
              </div>
            ))}
          </div>
        )}

        {/* Version history */}
        {form.version_history && form.version_history.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <History className="w-3.5 h-3.5" /> Version history ({form.version})
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1">
                {form.version_history.map((v, i) => (
                  <div key={i} className="text-xs bg-muted/40 rounded-lg px-3 py-1.5">
                    <span className="font-medium">v{v.version}</span> — {v.summary_of_changes}
                    <span className="text-muted-foreground"> · {v.saved_by} · {v.saved_at ? format(new Date(v.saved_at), "MM/dd/yyyy") : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Warm sign-off */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <Heart className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-700 leading-relaxed">
            <strong>Thank you for the care you bring to this work.</strong> The data you enter today helps {client.first_name}'s team make better decisions about their support. Your observations matter — every note is a gift to {client.first_name}'s future.
          </p>
        </div>

        {/* Signature confirmation — required before submit */}
        {canEdit && (
          <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sigChecked}
                onChange={e => {
                  const checked = e.target.checked;
                  setSigChecked(checked);
                  if (checked) {
                    const now = new Date();
                    const name = form.staff_name || staffName || "Staff";
                    const ts = `Documented by ${name} on ${format(now, "MM/dd/yyyy")} at ${format(now, "h:mm aa")}`;
                    setSigTimestamp(ts);
                  } else {
                    setSigTimestamp("");
                  }
                }}
                className="w-4 h-4 accent-primary mt-0.5 cursor-pointer"
              />
              <span className="text-sm text-foreground leading-snug">
                I confirm this note is accurate
              </span>
            </label>
            {sigTimestamp && (
              <p className="text-[11px] text-muted-foreground pl-6">{sigTimestamp}</p>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border px-4 py-3 flex gap-3 justify-end max-w-2xl mx-auto">
        {isLocked ? (
          <>
            {canAddAddendum && (
              <Button size="sm" onClick={() => setShowAddendum(true)} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                <History className="w-4 h-4" />Add Addendum
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onCancel}>Close</Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={handleDraft} disabled={saving} className="gap-1.5">
              <Save className="w-4 h-4" />Save Draft
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={saving || !form.client_id || !form.date || !form.staff_name || !form.service_code_id || !form.start_time || !form.end_time || !form.summary || !sigChecked} className="gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {saving ? "Submitting..." : form.status === "Returned" ? "Resubmit Note" : "Submit Session Note"}
            </Button>
          </>
        )}
      </div>

      {showAddendum && (
        <AddendumDialog
          open={showAddendum}
          onOpenChange={setShowAddendum}
          onAdd={handleAddendum}
        />
      )}
    </div>
  );
}