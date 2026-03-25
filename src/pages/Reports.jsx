import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart3, Users, DollarSign, Shield, Globe, Activity, TrendingUp
} from "lucide-react";
import ExecutiveDashboard from "@/components/reports/ExecutiveDashboard";
import ClinicalOutcomesReport from "@/components/reports/ClinicalOutcomesReport";
import WorkforceAnalyticsReport from "@/components/reports/WorkforceAnalyticsReport";
import FinancialReport from "@/components/reports/FinancialReport";
import ComplianceAuditReport from "@/components/reports/ComplianceAuditReport";
import FunderReportBuilder from "@/components/reports/FunderReportBuilder";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("executive");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Comprehensive performance visibility across clinical, workforce, financial, and compliance dimensions.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="executive" className="gap-2">
            <Activity className="w-4 h-4" /> Executive
          </TabsTrigger>
          <TabsTrigger value="clinical" className="gap-2">
            <TrendingUp className="w-4 h-4" /> Clinical Outcomes
          </TabsTrigger>
          <TabsTrigger value="workforce" className="gap-2">
            <Users className="w-4 h-4" /> Workforce
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <DollarSign className="w-4 h-4" /> Financial
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            <Shield className="w-4 h-4" /> Compliance & Audit
          </TabsTrigger>
          <TabsTrigger value="funder" className="gap-2">
            <Globe className="w-4 h-4" /> Funder & State
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executive"><ExecutiveDashboard /></TabsContent>
        <TabsContent value="clinical"><ClinicalOutcomesReport /></TabsContent>
        <TabsContent value="workforce"><WorkforceAnalyticsReport /></TabsContent>
        <TabsContent value="financial"><FinancialReport /></TabsContent>
        <TabsContent value="compliance"><ComplianceAuditReport /></TabsContent>
        <TabsContent value="funder"><FunderReportBuilder /></TabsContent>
      </Tabs>
    </div>
  );
}