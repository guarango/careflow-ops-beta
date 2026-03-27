import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertTriangle, Star } from "lucide-react";

const EMP_OPTIONS = ["Competitive Integrated Employment", "Supported Employment", "Volunteer Work", "Day Program", "Other Meaningful Activity", "No Interest in Employment", "Unsure"];

const VISION_FIELDS = [
  { key: "where_live", label: "Where do you want to live, and with whom?", placeholder: "In my own apartment with a roommate I choose..." },
  { key: "meaningful_activity", label: "What kind of work or meaningful activity do you want to do?", placeholder: "I want to work at a grocery store..." },
  { key: "relationships_wanted", label: "What relationships do you want to have?", placeholder: "I want a best friend who I can call when I need to talk..." },
  { key: "places_to_go", label: "What places do you want to go?", placeholder: "The lake, concerts, the library..." },
  { key: "experiences_to_have", label: "What experiences do you want to have?", placeholder: "I want to travel to see the ocean..." },
  { key: "what_to_know_about_me", label: "What do you want people to know about you?", placeholder: "That I am funny and smart and I have a lot to offer..." },
  { key: "five_year_vision", label: "What do you want your life to look like in five years?", placeholder: "I want to have a job I like and people who care about me..." },
];

export default function LifeVisionEditor({ client, lifeVision, goals, onSave }) {
  const [form, setForm] = useState({
    employment_aspiration: "Unsure",
    ...lifeVision,
  });
  const [saved, setSaved] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Detect employment aspiration gap
  const aspiresEmployment = form.employment_aspiration && !["Day Program", "No Interest in Employment", "Unsure"].includes(form.employment_aspiration);
  const hasEmploymentGoal = goals.some(g =>
    g.domain === "Vocational/Employment" ||
    g.goal_title?.toLowerCase().includes("employ") ||
    g.goal_title?.toLowerCase().includes("job") ||
    g.goal_title?.toLowerCase().includes("work")
  );
  const employmentGap = aspiresEmployment && !hasEmploymentGoal;

  const handleSave = () => {
    onSave({
      client_id: client.id,
      client_name: `${client.first_name} ${client.last_name}`,
      captured_date: new Date().toISOString().split("T")[0],
      ...form,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-4">
        <div className="flex items-start gap-2 mb-2">
          <Star className="w-4 h-4 text-violet-700 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-sm text-violet-900">{client.first_name}'s Life Vision</p>
            <p className="text-xs text-violet-700">This is not a clinical goal. It is {client.first_name}'s answer to the question: what kind of life do I want? It belongs to them, and everything else on this platform should be measured against it.</p>
          </div>
        </div>
      </div>

      {employmentGap && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">Employment Aspiration Gap</p>
            <p className="text-xs text-amber-700">{client.first_name} has expressed interest in "{form.employment_aspiration}" but has no active employment-related goal. This discrepancy must be addressed at the next planning meeting.</p>
          </div>
        </div>
      )}

      {lifeVision?.version_history?.length > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-xl px-3 py-2">
          This life vision has been updated {lifeVision.version_history.length} time{lifeVision.version_history.length !== 1 ? "s" : ""}. First captured: {lifeVision.captured_date}.
        </div>
      )}

      <div>
        <Label>Employment Aspiration</Label>
        <Select value={form.employment_aspiration} onValueChange={v => set("employment_aspiration", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{EMP_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {VISION_FIELDS.map(field => (
        <div key={field.key}>
          <Label className="text-sm font-medium text-foreground">{field.label}</Label>
          <Textarea
            rows={3}
            value={form[field.key] || ""}
            onChange={e => set(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="mt-1 text-sm"
          />
        </div>
      ))}

      {/* Goal linkage check */}
      <div className="border border-border rounded-xl p-4 bg-white">
        <p className="text-sm font-semibold mb-2">Goal Linkage Check</p>
        <p className="text-xs text-muted-foreground mb-3">Every active goal should connect to something {client.first_name} said they want. Goals that cannot be linked to a life vision element should be reconsidered.</p>
        {goals.length === 0 && <p className="text-xs text-muted-foreground italic">No active goals on file.</p>}
        {goals.map((g, i) => {
          const linked = g.connection_to_personal_outcome || g.persons_own_words;
          return (
            <div key={i} className={`flex items-center gap-2 text-xs py-1.5 border-b border-border last:border-0 ${!linked ? "text-amber-700" : "text-foreground"}`}>
              {linked ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
              <span className="flex-1">{g.goal_title}</span>
              {!linked && <span className="text-amber-600 font-medium">No life vision link — review this goal</span>}
            </div>
          );
        })}
      </div>

      <Button onClick={handleSave} className="w-full gap-2">
        {saved ? <><CheckCircle2 className="w-4 h-4" />Saved</> : "Save Life Vision"}
      </Button>
    </div>
  );
}