import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AIBadge from "./AIBadge";
import { Sparkles, AlertTriangle, CheckCircle2, User, Calendar, Clock, TrendingUp, Users } from "lucide-react";

const MOCK_SUGGESTIONS = [
  { staff_name: "Maria Santos", match_score: 96, reasons: ["Client preference match", "Certified for required supports", "0.3 mi from client address", "Low current caseload (4 clients)"], conflicts: [] },
  { staff_name: "James Okafor", match_score: 88, reasons: ["Strong performance record", "Familiar with client", "All certifications current"], conflicts: ["Approaching weekly overtime threshold"] },
  { staff_name: "Destiny Brown", match_score: 71, reasons: ["Certified for required supports", "Available this shift"], conflicts: ["No prior history with this client", "2 other visits this day"] },
];

const MOCK_CONFLICTS = [
  { type: "error", message: "James Okafor is double-booked on Tuesday 2–4pm — conflicts with Client Maria G." },
  { type: "warning", message: "Tom Chen is scheduled without required Level 2 Behavior Support cert for Client Jaylen T." },
  { type: "warning", message: "Client Rosita M. has 18 hours authorized this week — only 12 are currently scheduled." },
  { type: "error", message: "3 visits scheduled outside active authorization period for Client Aaron B." },
];

const MOCK_GAP_REPORT = [
  { client: "Rosita Martinez", authorized_hrs: 20, scheduled_hrs: 12, gap: 8, priority: "high" },
  { client: "Jaylen Thomas", authorized_hrs: 16, scheduled_hrs: 14, gap: 2, priority: "medium" },
  { client: "Aaron Burgess", authorized_hrs: 24, scheduled_hrs: 18, gap: 6, priority: "high" },
  { client: "Linda Pham", authorized_hrs: 8, scheduled_hrs: 8, gap: 0, priority: "low" },
];

export default function SchedulingAssistant() {
  const [activeSection, setActiveSection] = useState("suggestions");
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState("");

  const optimizeSchedule = async () => {
    setOptimizing(true);
    try {
      const prompt = `You are an I/DD agency scheduling optimizer. Provide 3 specific, actionable recommendations to optimize this week's schedule to:
1. Minimize overtime while maintaining required service hours
2. Ensure client preference matching
3. Fill authorization gaps

Format as a bulleted list of concrete recommendations.`;
      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setOptimizeResult(result);
    } catch (e) {
      console.error(e);
    }
    setOptimizing(false);
  };

  return (
    <Card className="border-violet-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Intelligent Scheduling Assistant</CardTitle>
          <AIBadge label="AI-Powered" />
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {[
            { key: "suggestions", label: "Staff Suggestions" },
            { key: "conflicts", label: `Conflicts (${MOCK_CONFLICTS.filter(c => c.type === "error").length})` },
            { key: "gaps", label: "Gap Report" },
            { key: "optimize", label: "Optimize" },
          ].map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${activeSection === s.key ? "bg-violet-600 border-violet-600 text-white" : "border-border text-muted-foreground hover:border-violet-500/50"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {activeSection === "suggestions" && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">AI-ranked staff matches based on client preference, certifications, proximity, and caseload:</p>
            <div className="space-y-3">
              {MOCK_SUGGESTIONS.map((s, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-card/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-violet-400" />
                      </div>
                      <span className="text-sm font-semibold">{s.staff_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${s.match_score >= 90 ? "text-green-400" : s.match_score >= 75 ? "text-amber-400" : "text-muted-foreground"}`}>{s.match_score}%</div>
                        <div className="text-xs text-muted-foreground">match</div>
                      </div>
                      <Button size="sm" className="h-7 text-xs bg-violet-600 hover:bg-violet-700">Assign</Button>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {s.reasons.map((r, ri) => <p key={ri} className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{r}</p>)}
                    {s.conflicts.map((c, ci) => <p key={ci} className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{c}</p>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "conflicts" && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">Automatically detected scheduling conflicts and compliance issues:</p>
            <div className="space-y-2">
              {MOCK_CONFLICTS.map((c, i) => (
                <div key={i} className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${c.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {c.message}
                </div>
              ))}
              {MOCK_CONFLICTS.length === 0 && (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No scheduling conflicts detected</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "gaps" && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">Clients with unscheduled authorized hours this week:</p>
            <div className="divide-y divide-border">
              {MOCK_GAP_REPORT.map((g, i) => (
                <div key={i} className="py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{g.client}</p>
                    <p className="text-xs text-muted-foreground">{g.scheduled_hrs}h scheduled / {g.authorized_hrs}h authorized</p>
                  </div>
                  {g.gap > 0 && (
                    <div className="text-right">
                      <p className={`text-sm font-bold ${g.priority === "high" ? "text-red-400" : "text-amber-400"}`}>-{g.gap}h gap</p>
                      <Badge variant="outline" className={`text-xs ${g.priority === "high" ? "border-red-500/30 text-red-400" : "border-amber-500/30 text-amber-400"}`}>{g.priority}</Badge>
                    </div>
                  )}
                  {g.gap === 0 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                </div>
              ))}
            </div>
            <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <strong>Revenue at Risk:</strong> {MOCK_GAP_REPORT.reduce((s, g) => s + g.gap, 0)} unscheduled hours = ~${(MOCK_GAP_REPORT.reduce((s, g) => s + g.gap, 0) * 18.5).toFixed(0)} estimated unbilled revenue this week
            </div>
          </div>
        )}

        {activeSection === "optimize" && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">Get AI recommendations to optimize this week's schedule for compliance, cost, and client outcomes:</p>
            <Button className="w-full bg-violet-600 hover:bg-violet-700 mb-4" onClick={optimizeSchedule} disabled={optimizing}>
              {optimizing ? <><span className="animate-spin mr-2">⟳</span>Analyzing Schedule...</> : <><Sparkles className="w-4 h-4 mr-2" />Optimize This Week's Schedule</>}
            </Button>
            {optimizeResult && (
              <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <AIBadge className="mb-2" />
                <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-2">{optimizeResult}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}