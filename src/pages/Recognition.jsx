import React, { useState } from "react";
import { useRole } from "@/hooks/useRole";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Settings, Users, Award } from "lucide-react";
import DSPRecognition from "@/components/recognition/DSPRecognition";
import ManagerRecognition from "@/components/recognition/ManagerRecognition";
import AdminRecognition from "@/components/recognition/AdminRecognition";

export default function Recognition() {
  const { isDSP, isManager, isAdmin, can } = useRole();
  const [activeTab, setActiveTab] = useState(isDSP ? "dsp" : isManager ? "manager" : "admin");

  const showDSP = isDSP || isAdmin || isManager;
  const showManager = isManager || isAdmin;
  const showAdmin = can("manageRecognition");

  return (
    <div>
      <PageHeader title="Recognition" subtitle="Points, streaks, badges, and rewards" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          {showDSP && <TabsTrigger value="dsp" className="gap-1.5"><Trophy className="w-3.5 h-3.5" />My Recognition</TabsTrigger>}
          {showManager && <TabsTrigger value="manager" className="gap-1.5"><Users className="w-3.5 h-3.5" />Team</TabsTrigger>}
          {showAdmin && <TabsTrigger value="admin" className="gap-1.5"><Settings className="w-3.5 h-3.5" />Admin</TabsTrigger>}
        </TabsList>

        {showDSP && <TabsContent value="dsp"><DSPRecognition /></TabsContent>}
        {showManager && <TabsContent value="manager"><ManagerRecognition /></TabsContent>}
        {showAdmin && <TabsContent value="admin"><AdminRecognition /></TabsContent>}
      </Tabs>
    </div>
  );
}