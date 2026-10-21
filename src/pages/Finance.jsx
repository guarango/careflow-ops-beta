import React, { useState } from "react";
import { useRole } from "@/hooks/useRole";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Code2, ShieldCheck, BarChart3, FileDown } from "lucide-react";
import ServiceCodesTab from "@/components/finance/ServiceCodesTab";
import AuthorizationsTab from "@/components/finance/AuthorizationsTab";
import UnitTrackingTab from "@/components/finance/UnitTrackingTab";
import BillableReviewTab from "@/components/finance/BillableReviewTab";
import BillingExportTab from "@/components/finance/BillingExportTab";
import PayrollTab from "@/components/finance/PayrollTab";

export default function Finance() {
  const { can } = useRole();
  const [activeTab, setActiveTab] = useState("service-codes");

  const canViewCodes = can("viewServiceCodes");
  const canViewUnits = can("viewUnitTracking");
  const canAccessBilling = can("accessBilling");
  const canExport = can("billingExport");

  const firstVisible = canViewCodes ? "service-codes" : canViewUnits ? "unit-tracking" : "service-codes";

  return (
    <div>
      <PageHeader title="Finance" subtitle="Service codes, authorizations, unit tracking, and billing" />

      <Tabs value={activeTab || firstVisible} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          {canViewCodes && <TabsTrigger value="service-codes" className="gap-1.5"><Code2 className="w-3.5 h-3.5" />Service Codes</TabsTrigger>}
          {canAccessBilling && <TabsTrigger value="authorizations" className="gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />Authorizations</TabsTrigger>}
          {canViewUnits && <TabsTrigger value="unit-tracking" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Unit Tracking</TabsTrigger>}
          {canAccessBilling && <TabsTrigger value="billable-review" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" />Billable Review</TabsTrigger>}
          {canExport && <TabsTrigger value="billing-export" className="gap-1.5"><FileDown className="w-3.5 h-3.5" />Billing Export</TabsTrigger>}
          {canAccessBilling && <TabsTrigger value="payroll" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Payroll</TabsTrigger>}
        </TabsList>

        {canViewCodes && <TabsContent value="service-codes"><ServiceCodesTab /></TabsContent>}
        {canAccessBilling && <TabsContent value="authorizations"><AuthorizationsTab /></TabsContent>}
        {canViewUnits && <TabsContent value="unit-tracking"><UnitTrackingTab /></TabsContent>}
        {canAccessBilling && <TabsContent value="billable-review"><BillableReviewTab /></TabsContent>}
        {canExport && <TabsContent value="billing-export"><BillingExportTab /></TabsContent>}
        {canAccessBilling && <TabsContent value="payroll"><PayrollTab /></TabsContent>}
      </Tabs>
    </div>
  );
}