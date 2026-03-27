import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { QOL_DOMAINS, EMPLOYMENT_STATUS_LABELS } from "@/lib/qolEngine";
import { Badge } from "@/components/ui/badge";
import { Plus, Star, Heart, Globe, Briefcase, Users, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const MILESTONE_TYPES = ["Domain Best Score", "New Relationship", "Community Connection", "Employment", "Goal Mastered", "Life Vision Progress", "Self-Advocacy Moment", "Other"];
const MILESTONE_ICONS = {
  "Domain Best Score": Star,
  "New Relationship": Users,
  "Community Connection": Globe,
  "Employment": Briefcase,
  "Goal Mastered": Award,
  "Life Vision Progress": Heart,
  "Self-Advocacy Moment": Star,
  "Other": Star,
};

export default function LifeStoryPage({ client, assessments, lifeVision, milestones, contacts, employment, goals, onCreateMilestone }) {
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const name = `${client.first_name} ${client.last_name}`;
  const first = client.first_name;

  const latest = assessments[0];
  const firstAssessment = assessments[assessments.length - 1];

  const masteredGoals = goals.filter(g => g.status === "Mastered");
  const empCfg = employment ? EMPLOYMENT_STATUS_LABELS[employment.status] : null;
  const naturalContacts = contacts.filter(c => c.is_natural_support).length;

  // Best domain scores ever
  const bestScores = {};
  assessments.forEach(a => {
    QOL_DOMAINS.forEach(d => {
      const s = a.domain_ratings?.[d.id];
      if (s != null && (!bestScores[d.id] || s > bestScores[d.id])) bestScores[d.id] = s;
    });
  });

  const currentScores = latest?.domain_ratings || {};
  const atBest = QOL_DOMAINS.filter(d => currentScores[d.id] != null && bestScores[d.id] != null && currentScores[d.id] >= bestScores[d.id]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header — the humanity */}
      <div className="bg-gradient-to-br from-violet-50 via-blue-50 to-emerald-50 border-2 border-violet-200 rounded-2xl p-6 text-center">
        {client.photo_url && (
          <img src={client.photo_url} alt={name} className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 border-white shadow-md" />
        )}
        <h2 className="text-2xl font-bold">{name}</h2>
        {firstAssessment && (
          <p className="text-xs text-muted-foreground mt-1">In our records since {firstAssessment.assessment_date}</p>
        )}
        {lifeVision?.five_year_vision && (
          <div className="bg-white/70 rounded-xl px-4 py-3 mt-4 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 mb-1">What a Good Life Looks Like to {first}</p>
            <p className="text-sm italic text-foreground">"{lifeVision.five_year_vision}"</p>
          </div>
        )}
      </div>

      {/* This year's highlights — lead with what got better */}
      {(masteredGoals.length > 0 || atBest.length > 0 || milestones.length > 0) && (
        <div>
          <p className="font-bold text-base mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />What {first} Accomplished</p>
          <div className="space-y-2">
            {atBest.map((d, i) => (
              <div key={i} className={cn("border-2 rounded-xl px-4 py-3 flex items-center gap-3", d.borderClass, d.bgClass)}>
                <Star className={cn("w-4 h-4 shrink-0", d.colorClass)} />
                <p className="text-sm"><strong className={d.colorClass}>{d.label}:</strong> {first} rated this area at {currentScores[d.id]}/10 — their personal best score ever.</p>
              </div>
            ))}
            {masteredGoals.map((g, i) => (
              <div key={i} className="border-2 border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3 flex items-center gap-3">
                <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-sm"><strong className="text-emerald-700">Goal Mastered:</strong> {g.goal_title}</p>
              </div>
            ))}
            {milestones.filter(m => m.is_featured).map((m, i) => {
              const Icon = MILESTONE_ICONS[m.milestone_type] || Star;
              return (
                <div key={i} className="border-2 border-blue-200 bg-blue-50 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{m.title}</p>
                    {m.in_persons_words && <p className="text-xs italic text-muted-foreground mt-0.5">"{m.in_persons_words}"</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Life Vision summary */}
      {lifeVision && (
        <div>
          <p className="font-bold text-base mb-3 flex items-center gap-2"><Heart className="w-4 h-4 text-rose-500" />{first}'s Life Vision</p>
          <div className="space-y-2">
            {[
              { label: "Living Situation", value: lifeVision.where_live },
              { label: "Work & Meaningful Activity", value: lifeVision.meaningful_activity },
              { label: "Relationships", value: lifeVision.relationships_wanted },
              { label: "Places to Go", value: lifeVision.places_to_go },
              { label: "What People Should Know", value: lifeVision.what_to_know_about_me },
            ].filter(f => f.value).map((f, i) => (
              <div key={i} className="border border-border rounded-xl px-4 py-3 bg-white">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{f.label}</p>
                <p className="text-sm mt-0.5 italic">"{f.value}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network growth */}
      {contacts.length > 0 && (
        <div>
          <p className="font-bold text-base mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" />{first}'s People</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {["Family", "Friend", "Neighbor", "Community Member"].map(type => {
              const count = contacts.filter(c => c.relationship_type === type).length;
              return (
                <div key={type} className="border border-border rounded-xl p-3 text-center bg-white">
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{type}</p>
                </div>
              );
            })}
          </div>
          {naturalContacts > 0 && (
            <p className="text-xs text-muted-foreground">
              {first} has <strong>{naturalContacts} natural support relationship{naturalContacts !== 1 ? "s" : ""}</strong> — people who are in their life because they choose to be, not because they are paid to be.
            </p>
          )}
        </div>
      )}

      {/* Employment */}
      {employment && empCfg && (
        <div>
          <p className="font-bold text-base mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4 text-amber-500" />Work & Meaningful Activity</p>
          <div className="border-2 border-border rounded-xl p-4 bg-white">
            <Badge className={empCfg.color}>{empCfg.label}</Badge>
            {employment.employer_name && <p className="font-semibold mt-2">{employment.employer_name}</p>}
            {employment.job_title && <p className="text-sm text-muted-foreground">{employment.job_title}</p>}
            {employment.hours_per_week && <p className="text-sm mt-1">{employment.hours_per_week} hours/week</p>}
          </div>
        </div>
      )}

      {/* QoL voice over time */}
      {assessments.length > 0 && latest?.persons_voice?.good_life_looks_like && (
        <div>
          <p className="font-bold text-base mb-3">In {first}'s Own Words</p>
          <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 mb-2">What a good life looks like to {first}</p>
            <p className="text-base italic leading-relaxed">"{latest.persons_voice.good_life_looks_like}"</p>
            <p className="text-[10px] text-muted-foreground mt-2">{latest.assessment_date}</p>
          </div>
        </div>
      )}

      {/* Full milestone timeline */}
      {milestones.length > 0 && (
        <div>
          <p className="font-bold text-base mb-3">Life Milestones</p>
          <div className="space-y-2">
            {[...milestones].sort((a, b) => new Date(b.milestone_date) - new Date(a.milestone_date)).map((m, i) => {
              const Icon = MILESTONE_ICONS[m.milestone_type] || Star;
              return (
                <div key={i} className="flex items-start gap-3 border border-border rounded-xl p-3 bg-white">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-[10px] text-muted-foreground">{m.milestone_date} · {m.milestone_type}</p>
                    {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                    {m.in_persons_words && <p className="text-xs italic text-foreground mt-1">"{m.in_persons_words}"</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={() => setShowMilestoneDialog(true)} className="gap-1">
        <Plus className="w-3.5 h-3.5" />Add Milestone
      </Button>

      {showMilestoneDialog && (
        <MilestoneDialog
          client={client}
          onSave={data => { onCreateMilestone({ ...data, client_id: client.id, client_name: `${client.first_name} ${client.last_name}` }); setShowMilestoneDialog(false); }}
          onClose={() => setShowMilestoneDialog(false)}
        />
      )}
    </div>
  );
}

function MilestoneDialog({ client, onSave, onClose }) {
  const [form, setForm] = useState({
    milestone_date: new Date().toISOString().split("T")[0],
    milestone_type: "Other", title: "", description: "", in_persons_words: "", is_featured: false,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Milestone for {client.first_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Date</Label><Input type="date" value={form.milestone_date} onChange={e => set("milestone_date", e.target.value)} /></div>
          <div><Label>Type</Label>
            <Select value={form.milestone_type} onValueChange={v => set("milestone_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MILESTONE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Started job at Safeway" /></div>
          <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => set("description", e.target.value)} className="text-sm" /></div>
          <div><Label>In {client.first_name}'s Own Words</Label><Textarea rows={2} value={form.in_persons_words} onChange={e => set("in_persons_words", e.target.value)} placeholder="Verbatim..." className="text-sm" /></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_featured} onChange={e => set("is_featured", e.target.checked)} />
            Feature on life story page
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.title}>Save Milestone</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}