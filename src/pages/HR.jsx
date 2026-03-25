import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Calendar, Star, BookOpen, BarChart2, User } from "lucide-react";
import HROverview from "@/components/hr/HROverview";
import HRTimeOff from "@/components/hr/HRTimeOff";
import HRPerformance from "@/components/hr/HRPerformance";
import HRTraining from "@/components/hr/HRTraining";
import HRAnalytics from "@/components/hr/HRAnalytics";
import HRSelfService from "@/components/hr/HRSelfService";
import { useRole } from "@/hooks/useRole";

export default function HR() {
  const { isAdmin, isHR, isDSP } = useRole();
  const [activeTab, setActiveTab] = useState(isDSP ? "self" : "overview");

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: () => base44.entities.LeaveRequest.list("-created_date"),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["performance-reviews"],
    queryFn: () => base44.entities.PerformanceReview.list("-created_date"),
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["training-records"],
    queryFn: () => base44.entities.TrainingRecord.list("-created_date"),
  });

  const tabs = [
    ...(!isDSP ? [{ value: "overview", label: "Staff Overview", icon: Users }] : []),
    ...(!isDSP ? [{ value: "timeoff", label: "Time Off", icon: Calendar }] : []),
    ...(!isDSP ? [{ value: "performance", label: "Performance", icon: Star }] : []),
    ...(!isDSP ? [{ value: "training", label: "Training", icon: BookOpen }] : []),
    ...(isAdmin ? [{ value: "analytics", label: "Analytics", icon: BarChart2 }] : []),
    { value: "self", label: "My Portal", icon: User },
  ];

  return (
    <div>
      <PageHeader
        title="HR Management"
        subtitle={`${staff.filter(s => s.status === "Active").length} active employees · ${leaveRequests.filter(l => l.status === "Pending").length} pending requests`}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs sm:text-sm">
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {!isDSP && (
          <>
            <TabsContent value="overview">
              <HROverview staff={staff} leaveRequests={leaveRequests} reviews={reviews} trainings={trainings} />
            </TabsContent>
            <TabsContent value="timeoff">
              <HRTimeOff leaveRequests={leaveRequests} staff={staff} />
            </TabsContent>
            <TabsContent value="performance">
              <HRPerformance reviews={reviews} staff={staff} />
            </TabsContent>
            <TabsContent value="training">
              <HRTraining trainings={trainings} staff={staff} />
            </TabsContent>
          </>
        )}
        {isAdmin && (
          <TabsContent value="analytics">
            <HRAnalytics staff={staff} leaveRequests={leaveRequests} reviews={reviews} trainings={trainings} />
          </TabsContent>
        )}
        <TabsContent value="self">
          <HRSelfService staff={staff} leaveRequests={leaveRequests} trainings={trainings} reviews={reviews} />
        </TabsContent>
      </Tabs>
    </div>
  );
}