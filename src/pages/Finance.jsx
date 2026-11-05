import React, { useState } from "react";
import { useRole } from "@/hooks/useRole";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, BarChart3, FileDown, ShieldCheck } from "lucide-react";
import RatesTab from "@/components/finance/RatesTab";
import UnitTrackingTab from "@/components/finance/UnitTrackingTab";
import BillableReviewTab from "@/components/finance/BillableReviewTab";
import BillingExportTab from "@/components/finance/BillingExportTab";
import PayrollTab from "@/components/finance/PayrollTab";

export default function Finance() {
  const { can } = useRole();
  const canViewBilling = can("accessBilling");
  const canViewUnits = can("viewUnitTracking");
  const canExportBilling = can("billingExport");
  const canExportPayroll = can("exportPayroll");

  const tabs = [
    canViewBilling && { value: "rates", label: "Rates", icon: DollarSign },
    canViewUnits && { value: "unit-tracking", label: "Unit Tracking", icon: BarChart3 },
    canViewBilling && { value: "billing-overview", label: "Billing Overview", icon: ShieldCheck },
    canExportBilling && { value: "billing-export", label: "Billing Export", icon: FileDown },
    canExportPayroll && { value: "payroll", label: "Payroll", icon: TrendingUp },
  ].filter(Boolean);

  const [selected, setSelected] = useState(null);
  const activeTab = tabs.some((t) => t.value === selected) ? selected : tabs[0]?.value;

  return (
    <div>
      <PageHeader title="Finance" subtitle="Rates, agency-wide unit tracking, billing overview, and exports" />

      {activeTab && (
        <Tabs value={activeTab} onValueChange={setSelected}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.some((t) => t.value === "rates") && (
            <TabsContent value="rates"><RatesTab /></TabsContent>
          )}
          {tabs.some((t) => t.value === "unit-tracking") && (
            <TabsContent value="unit-tracking"><UnitTrackingTab /></TabsContent>
          )}
          {tabs.some((t) => t.value === "billing-overview") && (
            <TabsContent value="billing-overview"><BillableReviewTab /></TabsContent>
          )}
          {tabs.some((t) => t.value === "billing-export") && (
            <TabsContent value="billing-export"><BillingExportTab /></TabsContent>
          )}
          {tabs.some((t) => t.value === "payroll") && (
            <TabsContent value="payroll"><PayrollTab /></TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}