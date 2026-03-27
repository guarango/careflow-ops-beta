import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { QOL_DOMAINS } from "@/lib/qolEngine";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, format } from "date-fns";

export default function QuarterlyCheckIn({ client, assessments, onSave }) {
  const lastCheckIn = assessments.find(a => a.assessment_type === "Quarterly Check-In");
  const lastAnnual = assessments.find(a => a.assessment_type === "Annual Interview");
  const daysSinceCheckIn = lastCheckIn ? differenceInDays(new Date(), new Date(lastCheckIn.assessment_date)) : null;
  const checkInOverdue = daysSinceCheckIn === null || daysSinceCheckIn >= 90;

  const [ratings, setRatings] = useState({});
  const [wantsToChange, setWantsToChange] = useState("");
  const [newConnections, setNewConnections] = useState("");
  const [concerns, setConcerns] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saved, setSaved] = useState(false);

  const prevRatings = lastCheckIn?.domain_ratings || lastAnnual?.domain_ratings || {};

  const drops = Object.entries(ratings).filter(([id, score]) => {
    const prev = prevRatings[id];
    return prev != null && score != null && (prev - score) >= 2;
  });

  const handleSave = () => {
    onSave({
      client_id: client.id,
      client_name: `${client.first_name} ${client.last_name}`,
      assessment_type: "Quarterly Check-In",
      assessment_date: date,
      domain_ratings: ratings,
      wants_to_change_next_quarter: wantsToChange,
      new_connections_or_activities: newConnections,
      concerns_raised: concerns,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className={cn("border-2 rounded-2xl px-4 py-3 flex items-start gap-3", checkInOverdue ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50")}>
        {checkInOverdue ? <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />}
        <div>
          <p className="text-sm font-semibold">{checkInOverdue ? "Quarterly check-in is due" : "Check-in is current"}</p>
          <p className="text-xs text-muted-foreground">
            {lastCheckIn ? `Last check-in: ${lastCheckIn.assessment_date} (${daysSinceCheckIn} days ago)` : "No check-in on file yet"}
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-900">
        This check-in should be completed <strong>with {client.first_name}</strong>, not about them. It takes 10–15 minutes. Ask each question directly.
      </div>

      <div>
        <Label>Check-in Date</Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div>
        <p className="font-semibold text-sm mb-2">How is {client.first_name} feeling about each area of their life right now?</p>
        <p className="text-xs text-muted-foreground mb-3">Use a visual scale if helpful. Compare to the previous rating shown in gray.</p>
        <div className="space-y-2">
          {QOL_DOMAINS.map(d => {
            const prev = prevRatings[d.id];
            const current = ratings[d.id];
            const drop = prev != null && current != null && (prev - current) >= 2;
            return (
              <div key={d.id} className={cn("border rounded-xl p-3 flex items-center gap-3", drop ? "border-red-300 bg-red-50" : "border-border bg-white")}>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", d.colorClass)}>{d.label}</p>
                  {prev != null && <p className="text-[10px] text-muted-foreground">Previous: {prev}/10</p>}
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} type="button"
                      onClick={() => setRatings(r => ({ ...r, [d.id]: n }))}
                      className={cn("w-5 h-5 rounded text-[10px] font-bold transition-all",
                        current === n ? "bg-primary text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      )}>{n}</button>
                  ))}
                </div>
                {drop && <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {drops.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3">
          <p className="text-sm font-bold text-red-800 mb-1">Significant Drop Detected</p>
          {drops.map(([id]) => {
            const d = QOL_DOMAINS.find(dom => dom.id === id);
            return <p key={id} className="text-xs text-red-700">• {d?.label}: dropped 2+ points from previous check-in. <strong>Do not schedule an intervention — first ask {client.first_name} what has changed.</strong></p>;
          })}
        </div>
      )}

      <div>
        <Label>Is there anything you want to change or try in the next three months?</Label>
        <Textarea rows={2} value={wantsToChange} onChange={e => setWantsToChange(e.target.value)} className="mt-1 text-sm" placeholder={`${client.first_name}'s words...`} />
      </div>

      <div>
        <Label>Any new relationships, activities, or community connections since the last check-in?</Label>
        <Textarea rows={2} value={newConnections} onChange={e => setNewConnections(e.target.value)} className="mt-1 text-sm" />
      </div>

      <div>
        <Label>Any concerns {client.first_name} wants to raise?</Label>
        <Textarea rows={2} value={concerns} onChange={e => setConcerns(e.target.value)} className="mt-1 text-sm" />
      </div>

      <Button onClick={handleSave} className="w-full gap-2">
        {saved ? <><CheckCircle2 className="w-4 h-4" />Saved</> : "Save Check-in"}
      </Button>
    </div>
  );
}