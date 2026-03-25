import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AgencyBranding from "@/components/agencyadmin/AgencyBranding";
import AgencyProfile from "@/components/agencyadmin/AgencyProfile";
import AgencyNotifications from "@/components/agencyadmin/AgencyNotifications";
import AgencyAPISettings from "@/components/agencyadmin/AgencyAPISettings";
import AgencySubscription from "@/components/agencyadmin/AgencySubscription";
import { Settings, Palette, Bell, Code, CreditCard } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AgencyAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

  // For demo purposes, use the first agency record as "this agency's" settings
  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => base44.entities.Agency.list("-created_date", 1),
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-2"><Settings className="w-4 h-4" /> Agency Profile</TabsTrigger>
          <TabsTrigger value="branding" className="gap-2"><Palette className="w-4 h-4" /> Branding</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="w-4 h-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="api" className="gap-2"><Code className="w-4 h-4" /> API & Webhooks</TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2"><CreditCard className="w-4 h-4" /> Subscription</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <AgencyProfile agency={agency} onSave={updateMutation.mutate} saving={updateMutation.isPending} />
        </TabsContent>
        <TabsContent value="branding">
          <AgencyBranding agency={agency} onSave={updateMutation.mutate} saving={updateMutation.isPending} />
        </TabsContent>
        <TabsContent value="notifications">
          <AgencyNotifications agency={agency} onSave={updateMutation.mutate} saving={updateMutation.isPending} />
        </TabsContent>
        <TabsContent value="api">
          <AgencyAPISettings agency={agency} onSave={updateMutation.mutate} saving={updateMutation.isPending} />
        </TabsContent>
        <TabsContent value="subscription">
          <AgencySubscription agency={agency} />
        </TabsContent>
      </Tabs>
    </div>
  );
}