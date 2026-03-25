import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Brain, FileText, Calendar, TrendingUp, Zap, DollarSign, Settings } from "lucide-react";
import AIBadge from "@/components/ai/AIBadge";
import ClinicalRiskDashboard from "@/components/ai/ClinicalRiskDashboard";
import SessionNoteAssistant from "@/components/ai/SessionNoteAssistant";
import SchedulingAssistant from "@/components/ai/SchedulingAssistant";
import TurnoverRiskDashboard from "@/components/ai/TurnoverRiskDashboard";
import BillingScrubber from "@/components/ai/BillingScrubber";
import AutomationBuilder from "@/components/ai/AutomationBuilder";
import AIFeatureManager from "@/components/ai/AIFeatureManager";

export default function AIHub() {
  const [activeTab, setActiveTab] = useState("risk");

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-foreground">AI & Automation Hub</h1>
          <AIBadge label="Phase 7" />
        </div>
        <p className="text-muted-foreground text-sm">
          Intelligent automation, clinical risk intelligence, and AI-assisted documentation — reducing administrative burden and surfacing early warnings.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="risk" className="gap-2">
            <Brain className="w-4 h-4" /> Clinical Risk
          </TabsTrigger>
          <TabsTrigger value="documentation" className="gap-2">
            <FileText className="w-4 h-4" /> Documentation AI
          </TabsTrigger>
          <TabsTrigger value="scheduling" className="gap-2">
            <Calendar className="w-4 h-4" /> Scheduling AI
          </TabsTrigger>
          <TabsTrigger value="workforce" className="gap-2">
            <TrendingUp className="w-4 h-4" /> Workforce Prediction
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <DollarSign className="w-4 h-4" /> Billing Scrubber
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Zap className="w-4 h-4" /> Automations
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" /> AI Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="risk">
          <ClinicalRiskDashboard />
        </TabsContent>

        <TabsContent value="documentation">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                Session Note Assistant <AIBadge />
              </h3>
              <SessionNoteAssistant
                clientName="Demo Client"
                goalsList={[
                  { id: "1", goal_title: "Meal Preparation Independence (3-step sequence)" },
                  { id: "2", goal_title: "Community Navigation — Bus Route #12" },
                  { id: "3", goal_title: "Social Interaction Skills — Initiating Greetings" },
                ]}
                onNoteGenerated={(note) => console.log("Note generated:", note)}
              />
            </div>
            <div>
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                Incident Report Assistant <AIBadge />
              </h3>
              <IncidentAssistantDemo />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scheduling">
          <SchedulingAssistant />
        </TabsContent>

        <TabsContent value="workforce">
          <TurnoverRiskDashboard />
        </TabsContent>

        <TabsContent value="billing">
          <BillingScrubber />
        </TabsContent>

        <TabsContent value="automation">
          <AutomationBuilder />
        </TabsContent>

        <TabsContent value="settings">
          <AIFeatureManager isSuperAdmin={false} agencyId={null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Inline demo wrapper for IncidentReportAssistant
function IncidentAssistantDemo() {
  const [incidentType, setIncidentType] = useState("Physical Aggression");
  const { default: IncidentReportAssistant } = { default: require("@/components/ai/IncidentReportAssistant").default };

  return (
    <div>
      <div className="mb-3">
        <label className="text-xs text-muted-foreground block mb-1">Incident Type (for demo):</label>
        <select
          value={incidentType}
          onChange={e => setIncidentType(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
        >
          {["Physical Aggression", "Self-Injurious Behavior", "Elopement", "Medication Error", "Emergency Medical", "Property Destruction", "Other"].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <IncidentReportAssistant clientName="Demo Client" incidentType={incidentType} onDraftGenerated={(d) => console.log("Draft:", d)} />
    </div>
  );
}