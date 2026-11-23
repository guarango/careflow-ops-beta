import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Save, Wifi, WifiOff, Heart, Lock, Clock, History, AlertTriangle, BookOpen } from "lucide-react";
import HealthSafetyFlags, { FLAGS } from "./HealthSafetyFlags";
import GoalDataCard from "./GoalDataCard";
import AddendumDialog from "./AddendumDialog";
import DictationButton from "@/components/shared/DictationButton";
import CleanUpButton from "@/components/shared/CleanUpButton";
import { cn } from "@/lib/utils";
import { isNoteLocked } from "@/lib/noteVersioning";
import { useOffline } from "@/hooks/useOffline";
import { todayISO } from "@/lib/dateUtils";
import {
  MIN_SUMMARY_WORDS,
  SETTING_OPTIONS,
  DEFAULT_EVV_TOLERANCE_MINUTES,
  countWords,
  missingElements,
  timeOrderError,
  planServiceCodes,
  requiresSetting,
  isGroupCode,
  overlapWarnings,
  findEvvLog,
  evvMismatch,
  noteMinutes,
} from "@/lib/serviceNote";
import { goalsForService, hasMeasurement, validateEntry } from "@/lib/goalData";
import { useAuth } from "@/lib/AuthContext";
import { useMyStaffRecord } from "@/hooks/useMyStaffRecord";
import { needsAcknowledgment, planVersionLabel } from "@/lib/planAcknowledgment";
import { SL_CODES, supportedLivingWarnings } from "@/lib/supportedLivingValidations";
import SupportedLivingChecks from "./SupportedLivingChecks";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { addDays, format, parseISO } from "date-fns";
import toast from "react-hot-toast";

export default function SessionEntryForm({ client, goals, existingNote, staffId, staffName, serviceCodes = [], shifts = [], pcsp = null, evvLogs = [], siblingNotes = [], evvTolerance = DEFAULT_EVV_TOLERANCE_MINUTES, onSave, onAutosave, onCancel, saving, canAddAddendum = false, onAddendum }) {
  const { isOnline } = useOffline();
  const [sigChecked, setSigChecked] = useState(false);
  const [sigTimestamp, setSigTimestamp] = useState("");
  const [showAddendum, setShowAddendum] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const today = todayISO();
  const now = new Date().toTimeString().slice(0, 5);
  const autosaveTimer = useRef(null);

  const blankGoalEntry = (g) => ({
    goal_id: g.id,
    goal_title: g.goal_title,
    skipped: false,
    skip_reason: "",
    trials_total: 0,
    trials_correct: 0,
    duration_minutes: "",
    frequency_count: 0,
    rating: "",
    percentage: null,
    prompt_level: g.prompt_level_baseline || "",
    mastery_met: "",
    narrative: "",
    person_expressed_preference: null,
    preference_detail: "",
    person_communication: "",
    session_highlight: "",
    engagement: "",
  });

  // Only goals whose Support Strategy covers the note's service code are offered (T3).
  const buildInitialGoalData = () => {
    if (existingNote?.goal_data?.length) return existingNote.goal_data;
    const active = goalsForService(
      goals.filter(g => g.status === "Active"),
      existingNote?.service_code_id
    ).sort((a, b) => {
      const p = { High: 0, Medium: 1, Low: 2 };
      return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
    });
    return active.map(blankGoalEntry);
  };

  const [form, setForm] = useState({
    client_id: client.id,
    client_name: `${client.first_name} ${client.last_name}`,
    staff_id: existingNote?.staff_id || staffId || "",
    staff_name: existingNote?.staff_name || staffName || "",
    shift_id: existingNote?.shift_id || "",
    evv_log_id: existingNote?.evv_log_id || "",
    service_code_id: existingNote?.service_code_id || "",
    service_code: existingNote?.service_code || "",
    date: existingNote?.date || today,
    start_time: existingNote?.start_time || now,
    end_time: existingNote?.end_time || "",
    end_date: existingNote?.end_date || "",
    caregiver_relationship: existingNote?.caregiver_relationship || "",
    asleep_minutes: existingNote?.asleep_minutes ?? "",
    documented_need: existingNote?.documented_need || "",
    setting: existingNote?.setting || "",
    location: existingNote?.location || "",
    location_other: existingNote?.location_other || "",
    summary: existingNote?.summary_note || existingNote?.summary || "",
    late_entry: existingNote?.late_entry || false,
    original_summary: existingNote?.original_summary || "",
    ai_cleaned_summary: existingNote?.ai_cleaned_summary || "",
    ai_cleaned_at: existingNote?.ai_cleaned_at || "",
    health_safety_flags: existingNote?.health_safety_flags || {},
    goal_data: buildInitialGoalData(),
    session_overall_notes: existingNote?.session_overall_notes || "",
    status: existingNote?.status || "Draft",
    submitted_at: existingNote?.submitted_at || null,
    addenda: existingNote?.addenda || [],
    version: existingNote?.version || 1,
    version_history: existingNote?.version_history || [],
    offline_created: !isOnline,
  });

  // A submitted note is locked — only Draft and Returned notes stay editable
  const isLocked = isNoteLocked(form.status);

  // Plan acknowledgment — a staff member records reading this exact plan version
  // before charting for this client. Asked once per version, never again.
  const { user } = useAuth();
  const { data: myStaff } = useMyStaffRecord();
  const [ackRecorded, setAckRecorded] = useState(false);
  const [ackSaving, setAckSaving] = useState(false);
  const { data: planAcks = [], refetch: refetchAcks } = useQuery({
    queryKey: ["plan-acks", pcsp?.id],
    queryFn: () => base44.entities.PlanAcknowledgment.filter({ plan_id: pcsp.id }),
    enabled: !!pcsp?.id,
  });
  const needsPlanAck =
    !isLocked && !!pcsp?.id && !!myStaff?.id &&
    needsAcknowledgment(planAcks, pcsp, myStaff.id) && !ackRecorded;

  const acknowledgePlan = async () => {
    if (!myStaff?.id) return;
    setAckSaving(true);
    try {
      await base44.entities.PlanAcknowledgment.create({
        client_id: client.id,
        client_name: `${client.first_name} ${client.last_name}`,
        plan_id: pcsp.id,
        plan_version: Number(pcsp.version || 1),
        plan_label: planVersionLabel(pcsp),
        staff_id: myStaff.id,
        staff_name: `${myStaff.first_name} ${myStaff.last_name}`,
        staff_email: myStaff.email || user?.email || "",
        acknowledged_at: new Date().toISOString(),
      });
      setAckRecorded(true);
      refetchAcks();
    } catch (err) {
      setSubmitError("Could not record the plan acknowledgment. Please try again.");
    } finally {
      setAckSaving(false);
    }
  };
  const canEdit = !isLocked;

  // Service codes come from the active PCSP; codes with no daily note are skipped.
  const eligibleCodes = useMemo(
    () => (pcsp
      ? planServiceCodes(pcsp, serviceCodes, form.date)
      : serviceCodes.filter(c => c.active !== false && c.daily_note_required !== false)),
    [pcsp, serviceCodes, form.date]
  );
  const selectedCode = eligibleCodes.find(c => c.id === form.service_code_id)
    || serviceCodes.find(c => c.id === form.service_code_id)
    || null;
  const codeOffPlan = !!(form.service_code_id && selectedCode && pcsp && !eligibleCodes.some(c => c.id === form.service_code_id));
  const summaryWords = countWords(form.summary);
  const missing = missingElements({ ...form, summary_note: form.summary }, { code: selectedCode });
  const orderError = timeOrderError(form);
  const evvLog = findEvvLog(form, evvLogs);
  const evvWarning = evvMismatch(form, evvLog, evvTolerance);
  const overlapList = overlapWarnings(form, siblingNotes, selectedCode);
  const isDsi = String(selectedCode?.code || "").toUpperCase() === "DSI";
  const noteLengthMinutes = noteMinutes(form);

  // ── Supported Living (SOW Article 35) ──
  const isSlCode = SL_CODES.includes(String(selectedCode?.code || "").toUpperCase());
  const { data: staffTraining = [] } = useQuery({
    queryKey: ["staff-training-records", form.staff_id],
    queryFn: () => base44.entities.TrainingRecord.filter({ staff_id: form.staff_id }),
    enabled: !!form.staff_id,
  });
  const slWarnings = useMemo(
    () => supportedLivingWarnings({
      note: { ...form, service_code: selectedCode?.code || form.service_code },
      client,
      siblingNotes,
      staffTraining,
    }),
    [form, selectedCode, client, siblingNotes, staffTraining]
  );

  // Goal data must be internally valid before the note can be submitted.
  const goalDataErrors = useMemo(() => {
    const out = [];
    for (const entry of form.goal_data) {
      if (!entry.goal_id) continue;
      const goal = goals.find(g => g.id === entry.goal_id);
      const { errors } = validateEntry(entry, {
        goal,
        minutes: noteLengthMinutes,
        serviceCodeId: form.service_code_id,
      });
      for (const e of errors) out.push({ key: `goal-${entry.goal_id}`, label: `${entry.goal_title}: ${e}` });
    }
    return out;
  }, [form.goal_data, form.service_code_id, noteLengthMinutes, goals]);

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
    if (submittingRef.current) return;
    if (formRef.current.status !== "Draft" && formRef.current.status !== "Returned" && formRef.current.status !== "Needs Revision") return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      if (submittingRef.current) return;
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

  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [submitError, setSubmitError] = useState(null);
  const [flagErrors, setFlagErrors] = useState({});

  const validateFlags = () => {
    const errors = {};
    for (const f of FLAGS) {
      if (form.health_safety_flags?.[f.key] && !(form.health_safety_flags?.[f.detailKey] || "").trim()) {
        errors[f.detailKey] = `Please describe the ${f.label.toLowerCase()} or uncheck it`;
      }
    }
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateFlags();
    setFlagErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSubmitError("Please fill in all required health & safety details before submitting.");
      return;
    }
    if (orderError) {
      setSubmitError(orderError);
      return;
    }
    if (codeOffPlan) {
      setSubmitError("That service code is not authorized on the active PCSP for this date. Choose an authorized code.");
      return;
    }
    if (needsPlanAck) {
      setSubmitError("Acknowledge the current plan version before submitting this note.");
      return;
    }
    if (goalDataErrors.length > 0) {
      setSubmitError(`Goal data needs attention: ${goalDataErrors[0].label}`);
      return;
    }
    if (missing.length > 0) {
      setSubmitError(`Required before submitting: ${missing.map(m => m.label).join(", ")}.`);
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    submittingRef.current = true;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    try {
      console.log("[SessionNote] handleSubmit — calling onSave");
      await onSave({ ...form, summary_note: form.summary, status: "Submitted", submitted_at: new Date().toISOString() });
      console.log("[SessionNote] handleSubmit — onSave resolved");
    } catch (e) {
      console.error("[SessionNote] handleSubmit — caught error:", e?.status, e?.message, e?.data, e);
      const msg = e?.message || "Failed to submit session note. Please try again.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };
  const handleDraft = async () => {
    setSubmitting(true);
    submittingRef.current = true;
    setSubmitError(null);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    try {
      console.log("[SessionNote] handleDraft — calling onSave");
      await onSave({ ...form, summary_note: form.summary, status: "Draft", submitted_at: null });
      console.log("[SessionNote] handleDraft — onSave resolved");
    } catch (e) {
      console.error("[SessionNote] handleDraft — caught error:", e?.status, e?.message, e?.data, e);
      const msg = e?.message || "Failed to save draft. Please try again.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleAddendum = async ({ text, reason }) => {
    if (!onAddendum) return;
    const saved = await onAddendum({ id: existingNote?.id, text, reason });
    if (saved?.addenda) {
      setForm(f => ({
        ...f,
        addenda: saved.addenda,
        version: saved.version,
        version_history: saved.version_history || f.version_history,
      }));
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
                <Lock className="w-3 h-3" />
                {form.status === "Approved" ? "Approved — locked" : form.status === "Flagged for Review" ? "Flagged — locked" : "Submitted — locked"}
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

      <div className="space-y-5 pb-40">
        {/* Returned comment */}
        {form.status === "Returned" && form.returned_comment && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-700 mb-1">Manager Feedback:</p>
            <p className="text-sm text-amber-800">{form.returned_comment}</p>
            <p className="text-[10px] text-amber-600 mt-1">— {form.returned_by}, {form.returned_at ? format(new Date(form.returned_at), "MM/dd/yyyy h:mm aa") : ""}</p>
          </div>
        )}

        {/* Locked notice */}
        {isLocked && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />This note is locked
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Submitted on {form.submitted_at ? format(new Date(form.submitted_at), "MM/dd/yyyy h:mm aa") : form.date} by {form.staff_name || "the DSP"}. The submitted record can't be edited.
              {canAddAddendum ? " Use Add Addendum below to append a correction — the original text stays intact." : " Ask a supervisor to return it, or have a manager add an addendum."}
            </p>
          </div>
        )}

        {/* Section 1: Session Info */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Session Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Staff Name *</Label>
              <Input value={form.staff_name} readOnly disabled className="h-9 bg-muted/50" />
              <p className="text-[11px] text-muted-foreground mt-1">Taken from your login — only a manager can change it.</p>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Service Code *</Label>
              <Select value={form.service_code_id} disabled={isLocked || eligibleCodes.length === 0} onValueChange={v => {
                const sc = eligibleCodes.find(s => s.id === v) || serviceCodes.find(s => s.id === v);
                setForm(f => ({ ...f, service_code_id: v, service_code: sc?.code || "" }));
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={eligibleCodes.length ? "Select service code" : "No service authorized for this date"} />
                </SelectTrigger>
                <SelectContent>
                  {eligibleCodes.map(s => <SelectItem key={s.id} value={s.id}>{s.code} — {s.description}</SelectItem>)}
                  {form.service_code_id && !eligibleCodes.some(s => s.id === form.service_code_id) && (
                    <SelectItem value={form.service_code_id} disabled>
                      {form.service_code || "Unknown"} (not authorized on the active PCSP for this date)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!pcsp ? (
                <p className="text-[11px] text-amber-700 mt-1">
                  No active PCSP on file for {client.first_name} — service codes are not verified against a plan.
                </p>
              ) : eligibleCodes.length === 0 ? (
                <p className="text-[11px] text-red-600 mt-1">
                  The active PCSP has no service authorizing this date that requires a daily note. Check the authorization dates or the code's daily-note setting.
                </p>
              ) : codeOffPlan ? (
                <p className="text-[11px] text-red-600 mt-1">This code is not on the active PCSP.</p>
              ) : null}
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Linked Shift (optional)</Label>
              <Select value={form.shift_id} disabled={isLocked} onValueChange={v => {
                const log = evvLogs.find(l => l.shift_id === v);
                setForm(f => ({ ...f, shift_id: v, evv_log_id: log?.id || "" }));
              }}>
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
              <Label className="text-xs">Date of Service *</Label>
              <Input type="date" value={form.date} disabled={isLocked} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">
                Setting {requiresSetting(selectedCode) ? "*" : <span className="text-muted-foreground">(optional)</span>}
              </Label>
              <Select value={form.setting} disabled={isLocked} onValueChange={v => setForm(f => ({ ...f, setting: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Where was the service delivered?" /></SelectTrigger>
                <SelectContent>{SETTING_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              {requiresSetting(selectedCode) && (
                <p className="text-[11px] text-muted-foreground mt-1">Required for {selectedCode?.code}.</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Start Time *</Label>
              <Input type="time" value={form.start_time} disabled={isLocked} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">End Time *</Label>
              <Input type="time" value={form.end_time} disabled={isLocked} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="h-9" />
              {form.start_time && form.end_time && form.end_time <= form.start_time && (
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.end_date}
                    disabled={isLocked}
                    onChange={e => setForm(f => ({
                      ...f,
                      end_date: e.target.checked ? format(addDays(parseISO(f.date || today), 1), "yyyy-MM-dd") : "",
                    }))}
                    className="w-3.5 h-3.5 accent-primary"
                  />
                  Ends the next day (overnight)
                </label>
              )}
            </div>
          </div>
          {orderError && (
            <p className="text-[11px] text-red-600 font-medium mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />{orderError}
            </p>
          )}
        </div>

        {/* Supported Living checks (SOW Article 35) */}
        {isSlCode && (
          <SupportedLivingChecks
            form={form}
            setForm={setForm}
            client={client}
            isLocked={isLocked}
            code={selectedCode?.code || form.service_code}
            warnings={slWarnings}
          />
        )}

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
          <p className="text-xs text-muted-foreground mb-2">
            Required: at least {MIN_SUMMARY_WORDS} words about the substantive service activities delivered. Write to the service, not just that the visit happened.
          </p>
          {selectedCode?.description && (
            <p className="text-xs bg-primary/5 border border-primary/15 rounded-lg px-2.5 py-2 mb-2 leading-relaxed">
              <span className="font-semibold">{selectedCode.code}:</span> {selectedCode.description}
            </p>
          )}
          <div className="relative">
            <Textarea
              value={form.summary}
              onChange={e => handleSummaryChange(e.target.value)}
              disabled={isLocked}
              rows={5}
              placeholder={selectedCode?.description
                ? `Describe how you delivered ${selectedCode.code}: ${selectedCode.description}`
                : "Describe what you did during this session..."}
              className="text-sm resize-none pr-12"
            />
            {canEdit && (
              <div className="absolute right-2 top-2">
                <DictationButton value={form.summary} onChange={handleSummaryChange} />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-1.5 gap-2">
            <span className={cn("text-[11px] font-medium", summaryWords < MIN_SUMMARY_WORDS ? "text-red-600" : "text-emerald-600")}>
              {summaryWords}/{MIN_SUMMARY_WORDS} words
            </span>
            {form.ai_cleaned_summary && form.original_summary && (
              <span className="text-[10px] text-violet-600">✓ AI-cleaned version saved</span>
            )}
          </div>
        </div>

        {/* Section 3: Health & Safety */}
        <div className="bg-white border border-border rounded-xl p-4">
          <fieldset disabled={isLocked}>
            <HealthSafetyFlags
              flags={form.health_safety_flags}
              onChange={flags => setForm(f => ({ ...f, health_safety_flags: flags }))}
            />
          </fieldset>
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
              const prnGoals = goalsForService(
                goals.filter(g => g.status === "Active" && g.charting_mode === "PRN" && !form.goal_data.some(gd => gd.goal_id === g.id)),
                form.service_code_id
              );
              if (prnGoals.length === 0) return null;
              return (
                <Select value="" onValueChange={(v) => {
                  const g = goals.find(x => x.id === v);
                  if (g) {
                    setForm(f => ({ ...f, goal_data: [...f.goal_data, blankGoalEntry(g)] }));
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
            <div className={cn("space-y-3", isLocked && "pointer-events-none opacity-80")}>
              {form.goal_data.map((entry, i) => {
                const fullGoal = goalForEntry(entry);
                return (
                  <GoalDataCard
                    key={entry.goal_id || i}
                    goalEntry={entry}
                    onChange={(updated) => setGoalData(i, updated)}
                    goal={fullGoal}
                    clientName={client.first_name}
                    priority={fullGoal?.priority}
                    index={i}
                    chartingMode={fullGoal?.charting_mode}
                    scheduleDays={fullGoal?.schedule_days}
                    noteContext={{
                      date: form.date,
                      start_time: form.start_time,
                      end_time: form.end_time,
                      staff_name: form.staff_name,
                      service_code: form.service_code,
                      service_code_id: form.service_code_id,
                      minutes: noteLengthMinutes,
                    }}
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
        {canEdit && (overlapList.length > 0 || evvWarning || (selectedCode?.is_evv_required && !evvLog)) && (
          <div className="space-y-2">
            {selectedCode?.is_evv_required && !evvLog && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800">
                  <strong>{selectedCode.code} requires EVV.</strong> Clock in and out on the shift so the visit links to this note.
                </p>
              </div>
            )}
            {overlapList.length > 0 && isDsi && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-red-800">
                  <strong>DSI is at least one staff to one person.</strong> You documented {overlapList.join(", ")} at the same time. Only group codes (DSG, DSP, SED) may overlap (SOW 8.1).
                </p>
              </div>
            )}
            {overlapList.length > 0 && !isDsi && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>Overlapping time</strong> with {overlapList.join(", ")}. Two people can't be documented at once unless this is a group code (DSG, DSP, SED) — check your times.
                </p>
              </div>
            )}
            {evvWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>Time doesn't match EVV.</strong> This note is {evvWarning.note} minutes; the EVV visit is {evvWarning.evv} minutes ({evvWarning.diff} apart, agency tolerance {evvTolerance}).
                </p>
              </div>
            )}
          </div>
        )}

        {canEdit && needsPlanAck && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
              <BookOpen className="w-3.5 h-3.5" />Read this plan before charting
            </p>
            <p className="text-[11px] text-amber-800 mb-2">
              Acknowledge {planVersionLabel(pcsp)} for this client. You will not be asked again for this version.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-amber-400 text-amber-900 hover:bg-amber-100"
              onClick={acknowledgePlan}
              disabled={ackSaving}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {ackSaving ? "Recording…" : "I have read this plan"}
            </Button>
          </div>
        )}

        {canEdit && goalDataErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs font-bold text-red-700 mb-1.5">Goal data needs attention ({goalDataErrors.length})</p>
            <div className="space-y-1">
              {goalDataErrors.map(e => (
                <p key={e.key} className="text-[11px] text-red-700 leading-snug">{e.label}</p>
              ))}
            </div>
          </div>
        )}

        {canEdit && missing.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs font-bold text-red-700 mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Missing required elements ({missing.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missing.map(m => (
                <span key={m.key} className="text-[11px] bg-white border border-red-200 text-red-700 rounded-full px-2 py-0.5">
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom actions */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3 justify-end">
          {submitError && (
            <span role="alert" className="text-xs text-destructive font-medium self-center mr-auto">{submitError}</span>
          )}
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
              <Button variant="outline" size="sm" onClick={handleDraft} disabled={submitting || saving} className="gap-1.5">
                <Save className="w-4 h-4" />Save Draft
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting || saving || missing.length > 0 || goalDataErrors.length > 0 || !!orderError || codeOffPlan || !sigChecked || needsPlanAck} className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {submitting || saving ? "Submitting..." : form.status === "Returned" ? "Resubmit Note" : "Submit Session Note"}
              </Button>
            </>
          )}
        </div>
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