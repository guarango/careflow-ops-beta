import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { QOL_DOMAINS } from "@/lib/qolEngine";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const FORMATS = ["Verbal Interview", "Picture-Based", "AAC-Supported", "Observational", "Proxy Input"];
const PRIORITY_OPTS = ["high", "medium", "low"];

const VOICE_QUESTIONS = [
  { key: "good_day", question: "What makes a good day for you?" },
  { key: "bad_day", question: "What makes a bad day?" },
  { key: "important_people", question: "Who are the most important people in your life right now?" },
  { key: "community_activities", question: "What do you do in your community?" },
  { key: "wishes_could_do", question: "What do you wish you could do that you cannot right now?" },
  { key: "feels_safe", question: "Do you feel safe where you live and where you spend your days?" },
  { key: "feels_listened_to", question: "Do you feel like people listen to you and respect your choices?" },
  { key: "most_proud_of", question: "What are you most proud of?" },
  { key: "wants_different", question: "What do you want to be different?" },
  { key: "good_life_looks_like", question: "What does a good life look like to you?" },
];

export default function QoLInterview({ client, existingAssessment, onSave }) {
  const [format, setFormat] = useState(existingAssessment?.interview_format || "Verbal Interview");
  const [conductedBy, setConductedBy] = useState(existingAssessment?.conducted_by || "");
  const [assessmentDate, setAssessmentDate] = useState(existingAssessment?.assessment_date || new Date().toISOString().split("T")[0]);
  const [proxyName, setProxyName] = useState(existingAssessment?.proxy_name || "");
  const [proxyRel, setProxyRel] = useState(existingAssessment?.proxy_relationship || "");
  const [voice, setVoice] = useState(existingAssessment?.persons_voice || {});
  const [domainRatings, setDomainRatings] = useState(existingAssessment?.domain_ratings || {});
  const [domainPriorities, setDomainPriorities] = useState(existingAssessment?.domain_person_priorities || {});
  const [saved, setSaved] = useState(false);

  const setVoiceField = (k, v) => setVoice(prev => ({ ...prev, [k]: v }));
  const setRating = (domain, val) => setDomainRatings(prev => ({ ...prev, [domain]: Number(val) }));
  const setPriority = (domain, val) => setDomainPriorities(prev => ({ ...prev, [domain]: val }));

  const handleSave = () => {
    onSave({
      client_id: client.id,
      client_name: `${client.first_name} ${client.last_name}`,
      assessment_type: "Annual Interview",
      assessment_date: assessmentDate,
      conducted_by: conductedBy,
      interview_format: format,
      proxy_name: proxyName,
      proxy_relationship: proxyRel,
      persons_voice: voice,
      domain_ratings: domainRatings,
      domain_person_priorities: domainPriorities,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isProxy = format === "Proxy Input";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-900">
        <strong>This is {client.first_name}'s interview — not a survey about them.</strong> Capture their perspective in their own words. If you are using a proxy, label all input as proxy and preserve any original communication alongside it.
      </div>

      {/* Setup */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Interview Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} />
        </div>
        <div>
          <Label>Conducted By</Label>
          <Input value={conductedBy} onChange={e => setConductedBy(e.target.value)} placeholder="Name of interviewer / support person" />
        </div>
        {isProxy && <>
          <div>
            <Label>Proxy Name</Label>
            <Input value={proxyName} onChange={e => setProxyName(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Proxy Relationship</Label>
            <Input value={proxyRel} onChange={e => setProxyRel(e.target.value)} placeholder="e.g. mother, long-term caregiver" />
          </div>
          <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />All responses below are <strong>proxy input</strong> — not {client.first_name}'s own voice. This must be labeled clearly in all reports.
          </div>
        </>}
      </div>

      {/* Open-ended questions */}
      <div className="space-y-4">
        <p className="font-semibold text-sm">Part 1 — {client.first_name}'s Own Words {isProxy ? "(via proxy)" : ""}</p>
        {VOICE_QUESTIONS.map(q => (
          <div key={q.key}>
            <Label className="text-sm font-normal text-foreground leading-snug">{q.question}</Label>
            <Textarea
              rows={2}
              value={voice[q.key] || ""}
              onChange={e => setVoiceField(q.key, e.target.value)}
              placeholder={isProxy ? `What does ${client.first_name}'s proxy say about this?` : `Capture ${client.first_name}'s words verbatim...`}
              className="text-sm mt-1"
            />
          </div>
        ))}
      </div>

      {/* Domain ratings + priorities */}
      <div>
        <p className="font-semibold text-sm mb-3">Part 2 — Domain Ratings (1–10 scale, {isProxy ? "proxy-estimated" : "person's own rating"})</p>
        <p className="text-xs text-muted-foreground mb-4">Use a visual scale, faces scale, or color scale as appropriate for {client.first_name}'s communication style.</p>
        <div className="space-y-3">
          {QOL_DOMAINS.map(d => (
            <div key={d.id} className={cn("border-2 rounded-xl p-3", d.borderClass, d.bgClass)}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className={cn("font-semibold text-sm", d.colorClass)}>{d.label}</p>
                  <p className="text-xs text-muted-foreground">{d.subjective_question}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Rating</Label>
                    <div className="flex gap-1 mt-0.5">
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(d.id, n)}
                          className={cn(
                            "w-6 h-6 rounded text-xs font-bold transition-all",
                            domainRatings[d.id] === n
                              ? "bg-primary text-white"
                              : n <= 3 ? "bg-red-50 hover:bg-red-100 text-red-600"
                              : n <= 6 ? "bg-amber-50 hover:bg-amber-100 text-amber-600"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                          )}
                        >{n}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Person's Priority</Label>
                    <div className="flex gap-1 mt-0.5">
                      {PRIORITY_OPTS.map(p => (
                        <button key={p} type="button" onClick={() => setPriority(d.id, p)}
                          className={cn("text-[10px] px-2 py-0.5 rounded-full border capitalize transition-all",
                            domainPriorities[d.id] === p ? "bg-primary text-white border-primary" : "border-border hover:bg-muted"
                          )}>{p}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} className="w-full gap-2">
        {saved ? <><CheckCircle2 className="w-4 h-4" />Saved</> : "Save Interview"}
      </Button>
    </div>
  );
}