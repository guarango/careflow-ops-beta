import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Save, Wifi, WifiOff, Heart } from "lucide-react";
import HealthSafetyFlags from "./HealthSafetyFlags";
import GoalDataCard from "./GoalDataCard";
import { cn } from "@/lib/utils";
import { useOffline } from "@/hooks/useOffline";

const LOCATIONS = ["Day Program", "Community Outing", "Residence", "Vocational Site", "Telehealth", "Other"];

export default function SessionEntryForm({ client, goals, existingNote, staffName, onSave, onCancel, saving }) {
  const isOffline = useOffline();
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

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
    date: existingNote?.date || today,
    start_time: existingNote?.start_time || now,
    end_time: existingNote?.end_time || "",
    location: existingNote?.location || "",
    location_other: existingNote?.location_other || "",
    health_safety_flags: existingNote?.health_safety_flags || {},
    goal_data: buildInitialGoalData(),
    session_overall_notes: existingNote?.session_overall_notes || "",
    status: existingNote?.status || "Draft",
    offline_created: isOffline,
  });

  const setGoalData = (i, updated) => {
    const newGoalData = [...form.goal_data];
    newGoalData[i] = updated;
    setForm(f => ({ ...f, goal_data: newGoalData }));
  };

  const goalForEntry = (entry) => goals.find(g => g.id === entry.goal_id);

  const hasFlags = Object.values(form.health_safety_flags).some(v => v === true);
  const completedGoals = form.goal_data.filter(g => !g.skipped && (g.trials_total || g.narrative)).length;
  const totalGoals = form.goal_data.length;

  const handleSubmit = () => {
    onSave({ ...form, status: "Submitted" });
  };
  const handleDraft = () => {
    onSave({ ...form, status: "Draft" });
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
            {isOffline ? (
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
        {/* Section 1: Session Info */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Session Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Your Name</Label>
              <Input value={form.staff_name} onChange={e => setForm(f => ({ ...f, staff_name: e.target.value }))} placeholder="Your name" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Select value={form.location} onValueChange={v => setForm(f => ({ ...f, location: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Where?" /></SelectTrigger>
                <SelectContent>{LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Start Time</Label>
              <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">End Time</Label>
              <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="h-9" />
            </div>
          </div>
        </div>

        {/* Section 2: Health & Safety */}
        <div className="bg-white border border-border rounded-xl p-4">
          <HealthSafetyFlags
            flags={form.health_safety_flags}
            onChange={flags => setForm(f => ({ ...f, health_safety_flags: flags }))}
          />
        </div>

        {/* Section 3: Goal Cards */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3 px-1">
            Goals for Today ({totalGoals})
          </p>
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
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Section 4: Overall Session Note */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Overall Session Note</p>
          <p className="text-xs text-muted-foreground mb-2">Anything else worth noting about today's session that doesn't fit in a specific goal?</p>
          <Textarea
            value={form.session_overall_notes}
            onChange={e => setForm(f => ({ ...f, session_overall_notes: e.target.value }))}
            rows={3}
            placeholder="Overall observations, team communications, environmental notes, or anything meaningful from today..."
            className="text-sm resize-none"
          />
        </div>

        {/* Warm sign-off */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <Heart className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-700 leading-relaxed">
            <strong>Thank you for the care you bring to this work.</strong> The data you enter today helps {client.first_name}'s team make better decisions about their support. Your observations matter — every note is a gift to {client.first_name}'s future.
          </p>
        </div>
      </div>

      {/* Sticky bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border px-4 py-3 flex gap-3 justify-end max-w-2xl mx-auto">
        <Button variant="outline" size="sm" onClick={handleDraft} disabled={saving} className="gap-1.5">
          <Save className="w-4 h-4" />Save Draft
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={saving || !form.client_id || !form.date || !form.staff_name} className="gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          {saving ? "Submitting..." : "Submit Session Note"}
        </Button>
      </div>
    </div>
  );
}