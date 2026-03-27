import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import QoLDomainProfiles from "./QoLDomainProfiles";
import QoLInterview from "./QoLInterview";
import LifeVisionEditor from "./LifeVisionEditor";
import NetworkMap from "./NetworkMap";
import CommunityTracker from "./CommunityTracker";
import EmploymentPanel from "./EmploymentPanel";
import LifeStoryPage from "./LifeStoryPage";
import QuarterlyCheckIn from "./QuarterlyCheckIn";

export default function QoLClientView({
  client, assessments, allAssessments, lifeVision, contacts, activities, employment,
  milestones, goals, incidents, onBack,
  onCreateAssessment, onUpdateAssessment, onSaveVision,
  onCreateContact, onUpdateContact, onCreateActivity,
  onSaveEmployment, onCreateMilestone,
}) {
  const [tab, setTab] = useState("story");
  const latest = assessments[0];
  const name = `${client.first_name} ${client.last_name}`;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />All Clients
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-lg leading-tight">{name}</h2>
          {latest && <p className="text-xs text-muted-foreground">Last assessment: {latest.assessment_date} · {latest.assessment_type}</p>}
          {!latest && <p className="text-xs text-amber-600 font-medium">No QoL assessment on file — start with Life Story or Interview</p>}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-5">
          <TabsTrigger value="story">Life Story</TabsTrigger>
          <TabsTrigger value="domains">Domain Profiles</TabsTrigger>
          <TabsTrigger value="interview">QoL Interview</TabsTrigger>
          <TabsTrigger value="checkin">Quarterly Check-in</TabsTrigger>
          <TabsTrigger value="vision">Life Vision</TabsTrigger>
          <TabsTrigger value="network">Network Map</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
        </TabsList>

        <TabsContent value="story">
          <LifeStoryPage
            client={client}
            assessments={assessments}
            lifeVision={lifeVision}
            milestones={milestones}
            contacts={contacts}
            employment={employment}
            goals={goals}
            onCreateMilestone={onCreateMilestone}
          />
        </TabsContent>

        <TabsContent value="domains">
          <QoLDomainProfiles
            client={client}
            assessments={assessments}
            goals={goals}
            incidents={incidents}
            contacts={contacts}
            activities={activities}
            lifeVision={lifeVision}
          />
        </TabsContent>

        <TabsContent value="interview">
          <QoLInterview
            client={client}
            existingAssessment={latest}
            onSave={data => latest ? onUpdateAssessment(latest.id, data) : onCreateAssessment(data)}
          />
        </TabsContent>

        <TabsContent value="checkin">
          <QuarterlyCheckIn
            client={client}
            assessments={assessments}
            onSave={data => onCreateAssessment(data)}
          />
        </TabsContent>

        <TabsContent value="vision">
          <LifeVisionEditor
            client={client}
            lifeVision={lifeVision}
            goals={goals}
            onSave={(data) => onSaveVision(data, lifeVision?.id)}
          />
        </TabsContent>

        <TabsContent value="network">
          <NetworkMap
            client={client}
            contacts={contacts}
            onCreate={onCreateContact}
            onUpdate={onUpdateContact}
          />
        </TabsContent>

        <TabsContent value="community">
          <CommunityTracker
            client={client}
            activities={activities}
            lifeVision={lifeVision}
            onCreate={onCreateActivity}
          />
        </TabsContent>

        <TabsContent value="employment">
          <EmploymentPanel
            client={client}
            employment={employment}
            goals={goals}
            lifeVision={lifeVision}
            onSave={onSaveEmployment}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}