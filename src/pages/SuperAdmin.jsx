import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SuperAdminAgencies from "@/components/superadmin/SuperAdminAgencies";
import SuperAdminBilling from "@/components/superadmin/SuperAdminBilling";
import SuperAdminMetrics from "@/components/superadmin/SuperAdminMetrics";
import SuperAdminReleases from "@/components/superadmin/SuperAdminReleases";
import SuperAdminStateReporting from "@/components/superadmin/SuperAdminStateReporting";
import SuperAdminAnalytics from "@/components/superadmin/SuperAdminAnalytics";
import { Activity, Building2, CreditCard, BarChart3, Megaphone, Globe, TrendingUp } from "lucide-react";

export default function SuperAdmin() {
  const [activeTab, setActiveTab] = useState("agencies");

  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => base44.entities.Agency.list("-created_date", 500),
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Super Admin Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
          <Activity className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">CareOps Pro — Super Admin</h1>
          <p className="text-xs text-muted-foreground">Platform Owner Control Panel</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full font-semibold">PLATFORM OWNER</span>
        </div>
      </div>

      <div className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Agencies", value: agencies.length, color: "text-primary" },
            { label: "Active", value: agencies.filter(a => a.status === "active").length, color: "text-accent" },
            { label: "Trial", value: agencies.filter(a => a.status === "trial").length, color: "text-chart-4" },
            { label: "MRR", value: `$${agencies.reduce((s, a) => s + (a.mrr || 0), 0).toLocaleString()}`, color: "text-chart-2" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="agencies" className="gap-2">
              <Building2 className="w-4 h-4" /> Agencies
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="w-4 h-4" /> Billing
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2">
              <BarChart3 className="w-4 h-4" /> Metrics
            </TabsTrigger>
            <TabsTrigger value="releases" className="gap-2">
              <Megaphone className="w-4 h-4" /> Releases & Announcements
            </TabsTrigger>
            <TabsTrigger value="state-reporting" className="gap-2">
              <Globe className="w-4 h-4" /> State Reporting Library
            </TabsTrigger>
            <TabsTrigger value="platform-analytics" className="gap-2">
              <TrendingUp className="w-4 h-4" /> Platform Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agencies">
            <SuperAdminAgencies agencies={agencies} />
          </TabsContent>
          <TabsContent value="billing">
            <SuperAdminBilling agencies={agencies} />
          </TabsContent>
          <TabsContent value="metrics">
            <SuperAdminMetrics agencies={agencies} />
          </TabsContent>
          <TabsContent value="releases">
            <SuperAdminReleases />
          </TabsContent>
          <TabsContent value="state-reporting">
            <SuperAdminStateReporting />
          </TabsContent>
          <TabsContent value="platform-analytics">
            <SuperAdminAnalytics agencies={agencies} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}