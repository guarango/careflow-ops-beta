import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

import PortalUserManagement from "@/components/portal/PortalUserManagement";
import ConsentManager from "@/components/portal/ConsentManager";
import HighlightReportManager from "@/components/portal/HighlightReportManager";
import GrievanceManagementPanel from "@/components/portal/GrievanceManagementPanel";
import FamilyInputReview from "@/components/portal/FamilyInputReview";
import FamilyCommunicationAnalytics from "@/components/portal/FamilyCommunicationAnalytics";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FamilyPortalAdmin() {
  const [activeTab, setActiveTab] = useState("users");
  const [selectedClientId, setSelectedClientId] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientName = selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : "";

  const needsClient = ["consent", "reports"].includes(activeTab);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Family Communication Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage access, consent, reports, grievances, and analytics for the family portal
            </p>
          </div>
          <a href="/portal" target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-sky-200 text-sky-700 text-sm hover:bg-sky-50 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />Preview Family Portal
          </a>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="users">Portal Users</TabsTrigger>
            <TabsTrigger value="consent">Consent Manager</TabsTrigger>
            <TabsTrigger value="reports">Weekly Reports</TabsTrigger>
            <TabsTrigger value="isp-input">ISP Input</TabsTrigger>
            <TabsTrigger value="grievances">Grievances</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Client selector for client-specific tabs */}
          {needsClient && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">Select client:</span>
              <Select value={selectedClientId || ""} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <TabsContent value="users" className="mt-6">
            <PortalUserManagement />
          </TabsContent>

          <TabsContent value="consent" className="mt-6">
            {!selectedClientId ? (
              <div className="border-dashed border-2 border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm">
                Select a client above to manage their consent records
              </div>
            ) : (
              <ConsentManager clientId={selectedClientId} clientName={clientName} />
            )}
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            {!selectedClientId ? (
              <div className="border-dashed border-2 border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm">
                Select a client above to manage their weekly highlight reports
              </div>
            ) : (
              <HighlightReportManager clientId={selectedClientId} clientName={clientName} />
            )}
          </TabsContent>

          <TabsContent value="isp-input" className="mt-6">
            <FamilyInputReview />
          </TabsContent>

          <TabsContent value="grievances" className="mt-6">
            <GrievanceManagementPanel />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <FamilyCommunicationAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}