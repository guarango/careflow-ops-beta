import React, { useState, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Settings, Shield } from "lucide-react";
import StaffFilesDashboard from "@/components/compliance/StaffFilesDashboard";
import ClientFilesDashboard from "@/components/compliance/ClientFilesDashboard";
import ChartingDashboard from "@/components/compliance/ChartingDashboard";
import AgencyScoreDashboard from "@/components/compliance/AgencyScoreDashboard";
import AgencyFileSettings from "@/components/compliance/AgencyFileSettings";
import AuditReportDialog from "@/components/compliance/AuditReportDialog";

export default function Compliance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("staff");
  const [showAuditReport, setShowAuditReport] = useState(false);
  const isAdmin = user?.role === "admin";

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
          <StaffFilesDashboard user={user} />
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

function ScoreExtractor({ onStaffScore, onClientScore, onChartingScore }) {
  const { data: staff = [] } = useQuery({ queryKey: ["staff-score"], queryFn: () => base44.entities.StaffMember.list() });
  const { data: compDocs = [] } = useQuery({ queryKey: ["compdocs-score"], queryFn: () => base44.entities.StaffComplianceDocument.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-score"], queryFn: () => base44.entities.Client.list() });
  const { data: notes = [] } = useQuery({ queryKey: ["notes-score"], queryFn: () => base44.entities.SessionNote.list() });

  React.useEffect(() => {
    if (staff.length && compDocs.length >= 0) {
      const active = staff.filter(s => s.status === "Active" || !s.status);
      const scores = active.map(s => {
        const myDocs = compDocs.filter(d => d.staff_id === s.id);
        const current = myDocs.filter(d => d.status === "Active").length;
        return myDocs.length > 0 ? Math.round((current / myDocs.length) * 100) : 100;
      });
      onStaffScore(scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100);
    }
  }, [staff, compDocs]);

  React.useEffect(() => {
    if (clients.length) {
      const active = clients.filter(c => c.status === "Active" || !c.status);
      onClientScore(active.length ? 85 : 0);
    }
  }, [clients]);

  React.useEffect(() => {
    if (notes.length) {
      const approved = notes.filter(n => n.status === "Approved").length;
      onChartingScore(Math.round((approved / notes.length) * 100));
    } else {
      onChartingScore(100);
    }
  }, [notes]);

  return null;
}