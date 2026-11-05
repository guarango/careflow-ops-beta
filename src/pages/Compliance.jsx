import React, { useState, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Settings, Shield } from "lucide-react";
import StaffFilesDashboard, { computeStaffAvg } from "@/components/compliance/StaffFilesDashboard";
import { useRole } from "@/hooks/useRole";
import ClientFilesDashboard, { computeClientAvg } from "@/components/compliance/ClientFilesDashboard";
import ChartingDashboard, { computeChartingAvg } from "@/components/compliance/ChartingDashboard";
import AgencyScoreDashboard from "@/components/compliance/AgencyScoreDashboard";
import AgencyFileSettings from "@/components/compliance/AgencyFileSettings";
import AuditReportDialog from "@/components/compliance/AuditReportDialog";

export default function Compliance() {
  const { user } = useAuth();
  const { can } = useRole();
  const [activeTab, setActiveTab] = useState("staff");
  const [showAuditReport, setShowAuditReport] = useState(false);
  // Agency score + agency file are agency-wide views, not caseload views.
  const isAdmin = can("viewAgencyCompliance");

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Compliance Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Staff files, client files, charting compliance, and agency score
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAuditReport(true)} className="gap-2">
            <FileText className="w-4 h-4" /> Print Audit Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="staff">Staff Files</TabsTrigger>
          <TabsTrigger value="client">Client Files</TabsTrigger>
          <TabsTrigger value="charting">Charting</TabsTrigger>
          {isAdmin && <TabsTrigger value="agency-score">Agency Score</TabsTrigger>}
          {isAdmin && <TabsTrigger value="agency-file">Agency File</TabsTrigger>}
        </TabsList>

        <TabsContent value="staff">
          <StaffFilesDashboard />
        </TabsContent>
        <TabsContent value="client">
          <ClientFilesDashboard user={user} />
        </TabsContent>
        <TabsContent value="charting">
          <ChartingDashboard user={user} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="agency-score">
            <AgencyScoreDashboardProvider />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="agency-file">
            <AgencyFileSettings user={user} />
          </TabsContent>
        )}
      </Tabs>

      <AuditReportDialog open={showAuditReport} onClose={() => setShowAuditReport(false)} user={user} />
    </div>
  );
}

function AgencyScoreDashboardProvider() {
  const { user } = useAuth();
  const [staffScore, setStaffScore] = useState(null);
  const [clientScore, setClientScore] = useState(null);
  const [chartingScore, setChartingScore] = useState(null);

  return (
    <div>
      <ScoreExtractor onStaffScore={setStaffScore} onClientScore={setClientScore} onChartingScore={setChartingScore} />
      <AgencyScoreDashboard staffScore={staffScore || 0} clientScore={clientScore || 0} chartingScore={chartingScore || 0} />
    </div>
  );
}

/**
 * Agency Score feeds off the SAME per-row calculations the three tabs render,
 * so the score can never contradict what a tab shows.
 */
function ScoreExtractor({ onStaffScore, onClientScore, onChartingScore }) {
  const { can } = useRole();
  // Same code the Staff Files tab uses, so the score matches the columns shown.
  const isAdminView = can("viewSensitiveHRDetails");

  const { data: staff = [] } = useQuery({ queryKey: ["staff-comp-grid"], queryFn: () => base44.entities.StaffMember.list() });
  const { data: compDocs = [] } = useQuery({ queryKey: ["staff-comp-docs-grid"], queryFn: () => base44.entities.StaffComplianceDocument.list() });
  const { data: onboardingDocs = [] } = useQuery({ queryKey: ["onboarding-docs-grid"], queryFn: () => base44.entities.OnboardingDocument.list() });
  const { data: trainings = [] } = useQuery({ queryKey: ["training-assignments-grid"], queryFn: () => base44.entities.TrainingAssignment.list() });

  const { data: clients = [] } = useQuery({ queryKey: ["clients-comp-grid"], queryFn: () => base44.entities.Client.list() });
  const { data: isps = [] } = useQuery({ queryKey: ["isps-comp-grid"], queryFn: () => base44.entities.ISPlan.list() });
  const { data: bsps = [] } = useQuery({ queryKey: ["bsps-comp-grid"], queryFn: () => base44.entities.BehaviorSupportPlan.list() });
  const { data: meds = [] } = useQuery({ queryKey: ["meds-comp-grid"], queryFn: () => base44.entities.Medication.list() });
  const { data: consents = [] } = useQuery({ queryKey: ["consents-comp-grid"], queryFn: () => base44.entities.PortalConsent.list() });
  const { data: grievances = [] } = useQuery({ queryKey: ["grievances-comp-grid"], queryFn: () => base44.entities.PortalGrievance.list() });
  const { data: auths = [] } = useQuery({ queryKey: ["auths-comp-grid"], queryFn: () => base44.entities.Authorization.list() });

  const { data: notes = [] } = useQuery({ queryKey: ["notes-charting"], queryFn: () => base44.entities.SessionNote.list() });
  const { data: medLogs = [] } = useQuery({ queryKey: ["medlogs-charting"], queryFn: () => base44.entities.MedicationLog.list() });
  const { data: goals = [] } = useQuery({ queryKey: ["goals-charting"], queryFn: () => base44.entities.ClientGoal.list() });
  const { data: evvLogs = [] } = useQuery({ queryKey: ["evv-charting"], queryFn: () => base44.entities.EVVLog.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents-charting"], queryFn: () => base44.entities.IncidentReport.list() });

  React.useEffect(() => {
    onStaffScore(computeStaffAvg(staff, compDocs, onboardingDocs, trainings, isAdminView));
  }, [staff, compDocs, onboardingDocs, trainings, isAdminView]);

  React.useEffect(() => {
    onClientScore(computeClientAvg(clients, isps, bsps, meds, consents, grievances, auths, notes));
  }, [clients, isps, bsps, meds, consents, grievances, auths, notes]);

  React.useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    onChartingScore(computeChartingAvg({ notes, medLogs, goals, evvLogs, incidents, clients, start, end }));
  }, [notes, medLogs, goals, evvLogs, incidents, clients]);

  return null;
}