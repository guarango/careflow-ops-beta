import React, { useContext, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PortalContext } from "@/pages/Portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle2, Send, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const YEAR = new Date().getFullYear().toString();

const QUESTIONS = [
  { key: "seeing_at_home", label: "What are you seeing at home or in the community that you think the team should know?" },
  { key: "what_is_going_well", label: "What do you think is going well in the current plan?" },
  { key: "needs_different_approach", label: "What do you think needs more attention or a different approach?" },
  { key: "priorities_coming_year", label: "What are your priorities for the coming year?" },
  { key: "good_life_perspective", label: "What does a good life look like for this person, from your perspective?" },
  { key: "items_for_meeting", label: "Is there anything you want to raise at the planning meeting?" },
  { key: "what_team_is_missing", label: "Is there anything the team may be missing about who this person is?" },
];

export default function PortalISPInput() {
  const { portalUser } = useContext(PortalContext);
  const qc = useQueryClient();
  const firstName = portalUser?.client_name?.split(" ")[0] || "them";

  const { data: existing = [] } = useQuery({
    queryKey: ["family-input", portalUser?.client_id, portalUser?.id],
    queryFn: () => base44.entities.FamilyInputForm.filter({
      client_id: portalUser?.client_id,
      portal_user_id: portalUser?.id,
    }),
  });

  const current = existing.find(e => e.isp_cycle_year === YEAR);
  const [form, setForm] = useState({
    seeing_at_home: current?.seeing_at_home || "",
    what_is_going_well: current?.what_is_going_well || "",
    needs_different_approach: current?.needs_different_approach || "",
    priorities_coming_year: current?.priorities_coming_year || "",
    good_life_perspective: current?.good_life_perspective || "",
    items_for_meeting: current?.items_for_meeting || "",
    what_team_is_missing: current?.what_team_is_missing || "",
    will_attend_meeting: current?.will_attend_meeting ?? true,
    attendance_method: current?.attendance_method || "In Person",
  });
  const [submitted, setSubmitted] = useState(!!current && current.status !== "Pending");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: (data) =>
      current
        ? base44.entities.FamilyInputForm.update(current.id, data)
        : base44.entities.FamilyInputForm.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-input"] });
      setSubmitted(true);
    },
  });

  const handleSubmit = () => {
    save.mutate({
      ...form,
      client_id: portalUser?.client_id,
      client_name: portalUser?.client_name,
      portal_user_id: portalUser?.id,
      portal_user_name: portalUser?.full_name,
      isp_cycle_year: YEAR,
      submitted_date: new Date().toISOString(),
      status: "Submitted",
    });
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">ISP Planning Input</h2>
          <p className="text-sm text-slate-500 mt-0.5">Your perspective for {firstName}'s {YEAR} planning meeting</p>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
            <p className="text-lg font-semibold text-slate-800">Input received — thank you</p>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              Your perspective has been sent to {firstName}'s case manager. It will be presented at the planning meeting alongside the clinical team's observations and — most importantly — alongside what {firstName} has said they want.
            </p>
            <p className="text-xs text-slate-400 mt-3">If family priorities and {firstName}'s own priorities differ, that will be named and discussed at the meeting rather than resolved quietly behind the scenes.</p>
          </CardContent>
        </Card>

        {/* Show submitted answers */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Your Submitted Responses</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {QUESTIONS.map(q => form[q.key] ? (
              <div key={q.key}>
                <p className="text-xs font-semibold text-slate-500 mb-1">{q.label}</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{form[q.key]}</p>
              </div>
            ) : null)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">ISP Planning Input</h2>
        <p className="text-sm text-slate-500 mt-0.5">Your perspective for {firstName}'s {YEAR} planning meeting</p>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
        <div className="text-sm text-violet-800 space-y-1">
          <p className="font-semibold">Your input matters here — not as a formality, but as real information.</p>
          <p>You have irreplaceable knowledge about who {firstName} is across every part of their life, not just the hours spent in services. The planning team cannot see what you see at home, in the community, and in private moments. Please share it candidly.</p>
          <p className="text-xs text-violet-600">Where your priorities and {firstName}'s own stated priorities differ, that difference will be named at the meeting and {firstName}'s voice will take precedence — as it should. Your input helps ensure the team has the full picture before that conversation happens.</p>
        </div>
      </div>

      <div className="space-y-5">
        {QUESTIONS.map(q => (
          <div key={q.key}>
            <Label className="text-sm font-medium text-slate-700">{q.label}</Label>
            <Textarea
              rows={3}
              className="mt-1.5 text-sm"
              value={form[q.key]}
              onChange={e => set(q.key, e.target.value)}
              placeholder="Share your thoughts…"
            />
          </div>
        ))}

        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
          <p className="text-sm font-semibold text-slate-700">Meeting Attendance</p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.will_attend_meeting} onChange={e => set("will_attend_meeting", e.target.checked)} />
              I plan to attend the planning meeting
            </label>
          </div>
          {form.will_attend_meeting && (
            <div>
              <Label className="text-xs">How will you attend?</Label>
              <Select value={form.attendance_method} onValueChange={v => set("attendance_method", v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["In Person", "Video", "Phone", "Written Input Only"].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={save.isPending}
        className="w-full gap-2 bg-sky-600 hover:bg-sky-700"
      >
        <Send className="w-4 h-4" />
        {save.isPending ? "Sending…" : "Submit My Input"}
      </Button>
      <p className="text-xs text-slate-400 text-center">Your responses go directly to {firstName}'s case manager and are compiled into the family perspective section of the planning document.</p>
    </div>
  );
}