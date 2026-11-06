import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AgencyBranding from "@/components/agencyadmin/AgencyBranding";
import AgencyProfile from "@/components/agencyadmin/AgencyProfile";
import AgencyNotifications from "@/components/agencyadmin/AgencyNotifications";
import AgencyAPISettings from "@/components/agencyadmin/AgencyAPISettings";
import EVVLocationSettings from "@/components/agencyadmin/EVVLocationSettings";
import AgencySubscription from "@/components/agencyadmin/AgencySubscription";
import RolePermissionsPanel from "@/components/agencyadmin/RolePermissionsPanel";
import UserManagement from "@/pages/UserManagement";
import NotificationCenter from "@/pages/NotificationCenter";
import AuditLogPage from "@/pages/AuditLogPage";
import ESignatures from "@/pages/ESignatures";
import ServiceCodesTab from "@/components/finance/ServiceCodesTab";
import FormFieldsPanel from "@/components/customfields/FormFieldsPanel";

import AIFeatureManager from "@/components/ai/AIFeatureManager";
import AgencyIntegrationHub from "@/components/integrations/AgencyIntegrationHub";
import IntegrationHealthDashboard from "@/components/integrations/IntegrationHealthDashboard";
import { Settings, Palette, Bell, Code, CreditCard, Sparkles, Plug, Activity, MapPin, ShieldCheck, UsersRound, ScrollText, FileSignature, Code2, ClipboardList } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRole } from "@/hooks/useRole";

export default function AgencyAdmin() {
  const { toast } = useToast();
  const { can, canAccessPath } = useRole();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Each tab belongs to a feature and is only shown when that feature is viewable.
  const canSettings = can("accessSettings");
  const canPermissions = can("viewPermissions");
  const canUsers = can("editUser");
  const canServiceCodes = can("viewServiceCodes");
  const canNotifications = can("viewAllNotifications");
  const canAudit = can("viewAuditLog") || canAccessPath("/audit-log");
  const canSignatures = can("manageSignatures");
  const canFormFields = can("editFormFields");

  const tabs = [
    canSettings && { value: "profile", label: "Agency Profile", icon: Settings },
    canSettings && { value: "branding", label: "Branding", icon: Palette },
    canSettings && { value: "notifications", label: "Notifications", icon: Bell },
    canSettings && { value: "api", label: "API & Webhooks", icon: Code },
    canSettings && { value: "evv", label: "EVV Settings", icon: MapPin },
    canSettings && { value: "subscription", label: "Subscription", icon: CreditCard },
    canSettings && { value: "ai-settings", label: "AI Features", icon: Sparkles },
    canSettings && { value: "integrations", label: "Integrations", icon: Plug },
    canSettings && { value: "int-health", label: "Integration Health", icon: Activity },
    canFormFields && { value: "form-fields", label: "Form Fields", icon: ClipboardList },
    canPermissions && { value: "permissions", label: "Roles & Permissions", icon: ShieldCheck },
    canUsers && { value: "users", label: "Users", icon: UsersRound },
    canServiceCodes && { value: "service-codes", label: "Service Codes", icon: Code2 },
    canNotifications && { value: "notification-center", label: "Notification Center", icon: Bell },
    canAudit && { value: "audit-log", label: "Audit Log", icon: ScrollText },
    canSignatures && { value: "e-signatures", label: "E-Signatures", icon: FileSignature },
  ].filter(Boolean);

  const requested = searchParams.get("tab");
  const [selected, setSelected] = useState(requested);
  const activeTab = tabs.some((t) => t.value === selected) ? selected : tabs[0]?.value;
  const shows = (value) => tabs.some((t) => t.value === value);

  // For demo purposes, use the first agency record as "this agency's" settings
  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => base44.entities.Agency.list("-created_date", 1),
    enabled: canSettings,
  });
  const agency = agencies[0];

  const updateMutation = useMutation({
    mutationFn: (data) => agency
      ? base44.entities.Agency.update(agency.id, data)
      : base44.entities.Agency.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      toast({ title: "Settings saved", description: "Agency configuration updated." });
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Agency Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your agency's environment, branding, and integrations.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setSelected}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-2">
                <Icon className="w-4 h-4" /> {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {shows("profile") && (
          <TabsContent value="profile">
            <AgencyProfile agency={agency} onSave={updateMutation.mutate} saving={updateMutation.isPending} />
          </TabsContent>
        )}
        {shows("branding") && (
          <TabsContent value="branding">
            <AgencyBranding agency={agency} onSave={updateMutation.mutate} saving={updateMutation.isPending} />
          </TabsContent>
        )}
        {shows("notifications") && (
          <TabsContent value="notifications">
            <AgencyNotifications agency={agency} onSave={updateMutation.mutate} saving={updateMutation.isPending} />
          </TabsContent>
        )}
        {shows("api") && (
          <TabsContent value="api">
            <AgencyAPISettings agency={agency} onSave={updateMutation.mutate} saving={updateMutation.isPending} />
          </TabsContent>
        )}
        {shows("evv") && (
          <TabsContent value="evv">
            <EVVLocationSettings agency={agency} onSave={updateMutation.mutate} saving={updateMutation.isPending} />
          </TabsContent>
        )}
        {shows("subscription") && (
          <TabsContent value="subscription">
            <AgencySubscription agency={agency} />
          </TabsContent>
        )}
        {shows("ai-settings") && (
          <TabsContent value="ai-settings">
            <AIFeatureManager isSuperAdmin={false} agencyId={agency?.id} />
          </TabsContent>
        )}
        {shows("integrations") && (
          <TabsContent value="integrations">
            <AgencyIntegrationHub agencyId={agency?.id || "demo-agency"} />
          </TabsContent>
        )}
        {shows("int-health") && (
          <TabsContent value="int-health">
            <IntegrationHealthDashboard agencyId={agency?.id || "demo-agency"} />
          </TabsContent>
        )}
        {shows("form-fields") && (
          <TabsContent value="form-fields">
            <FormFieldsPanel agencyId={agency?.id} />
          </TabsContent>
        )}
        {shows("permissions") && (
          <TabsContent value="permissions">
            <RolePermissionsPanel />
          </TabsContent>
        )}
        {shows("users") && (
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        )}
        {shows("service-codes") && (
          <TabsContent value="service-codes">
            <ServiceCodesTab />
          </TabsContent>
        )}
        {shows("notification-center") && (
          <TabsContent value="notification-center">
            <NotificationCenter />
          </TabsContent>
        )}
        {shows("audit-log") && (
          <TabsContent value="audit-log">
            <AuditLogPage />
          </TabsContent>
        )}
        {shows("e-signatures") && (
          <TabsContent value="e-signatures">
            <ESignatures embedded />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}