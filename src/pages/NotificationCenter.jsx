import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Check, X, Mail, MessageSquare, Smartphone, Monitor, Settings, Filter, Download } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const TYPE_LABELS = {
  emar_reminder: { label: "Med Reminder", color: "bg-blue-100 text-blue-700" },
  emar_missed: { label: "Med Missed", color: "bg-red-100 text-red-700" },
  goal_missed: { label: "Goal Not Charted", color: "bg-amber-100 text-amber-700" },
  timecard_reminder: { label: "Clock-Out", color: "bg-blue-100 text-blue-700" },
  timecard_escalation: { label: "Clock-Out Escalation", color: "bg-red-100 text-red-700" },
  note_not_submitted: { label: "Note Not Submitted", color: "bg-amber-100 text-amber-700" },
  compliance_expiring: { label: "Compliance Expiring", color: "bg-orange-100 text-orange-700" },
  compliance_missing: { label: "Compliance Missing", color: "bg-red-100 text-red-700" },
  document_to_sign: { label: "Document to Sign", color: "bg-purple-100 text-purple-700" },
  training_assigned: { label: "Training Assigned", color: "bg-indigo-100 text-indigo-700" },
  note_returned: { label: "Note Returned", color: "bg-amber-100 text-amber-700" },
  quarterly_due: { label: "Quarterly Due", color: "bg-red-100 text-red-700" },
  incident_deadline: { label: "Incident Deadline", color: "bg-red-100 text-red-700" },
};

const STATUS_COLORS = {
  unread: "bg-blue-100 text-blue-700",
  read: "bg-gray-100 text-gray-600",
  acknowledged: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-400",
};

const CHANNEL_ICONS = {
  in_app: Monitor,
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
};

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [activeTab, setActiveTab] = useState("mine");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: myNotifications = [] } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => base44.entities.AppNotification.filter({ recipient_user_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: allNotifications = [] } = useQuery({
    queryKey: ["all-notifications"],
    queryFn: () => base44.entities.AppNotification.list("-created_date", 500),
    enabled: isAdmin && activeTab === "all",
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppNotification.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["all-notifications"] });
    },
  });

  const notifications = activeTab === "mine" ? myNotifications : allNotifications;
  const filtered = notifications.filter(n => {
    if (filterType !== "all" && n.type !== filterType) return false;
    if (filterStatus !== "all" && n.status !== filterStatus) return false;
    return true;
  });

  const unreadCount = myNotifications.filter(n => n.status === "unread").length;

  const handleOpen = (notif) => {
    if (notif.status === "unread") {
      updateMutation.mutate({ id: notif.id, data: { status: "read", read_at: new Date().toISOString() } });
    }
    if (notif.deep_link) {
      navigate(notif.deep_link);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = myNotifications.filter(n => n.status === "unread");
    for (const n of unread) {
      await base44.entities.AppNotification.update(n.id, { status: "read", read_at: new Date().toISOString() });
    }
    queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
    toast.success(`Marked ${unread.length} as read`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your notifications and action items. Tap any item to jump to it.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-1">
            <Check className="w-3.5 h-3.5" /> Mark all read ({unreadCount})
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="mine" className="gap-1">
            My Notifications
            {unreadCount > 0 && <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1.5">{unreadCount}</Badge>}
          </TabsTrigger>
          {isAdmin && <TabsTrigger value="all">All Notifications</TabsTrigger>}
          {isAdmin && <TabsTrigger value="settings">Rules & Channels</TabsTrigger>}
        </TabsList>

        <TabsContent value="mine">
          <NotificationList
            notifications={filtered}
            onOpen={handleOpen}
            onMark={(id, status) => updateMutation.mutate({ id, data: { status } })}
            filterType={filterType}
            setFilterType={setFilterType}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            showRecipient={false}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="all">
            <NotificationList
              notifications={filtered}
              onOpen={handleOpen}
              onMark={(id, status) => updateMutation.mutate({ id, data: { status } })}
              filterType={filterType}
              setFilterType={setFilterType}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              showRecipient={true}
            />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="settings">
            <NotificationRulesSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function NotificationList({ notifications, onOpen, onMark, filterType, setFilterType, filterStatus, setFilterStatus, showRecipient }) {
  return (
    <>
      <div className="flex gap-3 mb-4 flex-wrap">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No notifications. You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const typeInfo = TYPE_LABELS[n.type] || { label: n.type, color: "bg-gray-100 text-gray-600" };
            return (
              <div
                key={n.id}
                className={cn(
                  "border rounded-lg p-3 flex items-start gap-3 transition-colors cursor-pointer",
                  n.status === "unread" ? "bg-blue-50/30 border-blue-200" : "hover:bg-accent"
                )}
                onClick={() => onOpen(n)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", typeInfo.color)}>
                      {typeInfo.label}
                    </span>
                    {n.is_controlled_substance && (
                      <span className="text-[10px] text-red-600 font-semibold">Requires immediate attention</span>
                    )}
                    {showRecipient && n.recipient_email && (
                      <span className="text-xs text-muted-foreground">→ {n.recipient_email}</span>
                    )}
                  </div>
                  <p className="text-sm mt-1 line-clamp-2">{n.message}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>{n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true }) : ""}</span>
                    {n.channels && n.channels.length > 0 && (
                      <div className="flex items-center gap-1">
                        {n.channels.map(ch => {
                          const Icon = CHANNEL_ICONS[ch] || Monitor;
                          return <Icon key={ch} className="w-3 h-3" />;
                        })}
                      </div>
                    )}
                    {n.deep_link && <span className="text-primary">Tap to open →</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  {(n.status === "unread" || n.status === "read") && (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onMark(n.id, "acknowledged")}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => onMark(n.id, "dismissed")}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function NotificationRulesSettings() {
  const queryClient = useQueryClient();
  const { data: rules = [] } = useQuery({
    queryKey: ["notification-rules"],
    queryFn: () => base44.entities.NotificationSettings.list("category"),
  });

  const toggleRule = async (rule) => {
    await base44.entities.NotificationSettings.update(rule.id, {
      event_key: rule.event_key,
      label: rule.label,
      category: rule.category,
      severity: rule.severity,
      enabled: !rule.enabled,
      updated_by: "admin",
      updated_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings className="w-4 h-4" />
            Admin-editable notification rules. Toggle rules on/off and adjust timing, channels, and escalation.
            Messages never include client names, diagnoses, or medications.
          </div>
        </CardContent>
      </Card>

      {rules.map(rule => (
        <Card key={rule.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{rule.label}</CardTitle>
                <Badge variant="outline" className="text-xs">{rule.category}</Badge>
              </div>
              <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule)} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
            <div className="space-y-2">
              {rule.stages?.map((stage, i) => (
                <div key={i} className="flex items-center gap-3 text-sm border-l-2 border-primary/20 pl-3 py-1">
                  <span className="font-medium">{stage.label}</span>
                  <Badge variant="secondary" className="text-xs">{stage.recipient}</Badge>
                  {stage.delay_minutes > 0 && <span className="text-xs text-muted-foreground">+{stage.delay_minutes} min</span>}
                  <div className="flex items-center gap-1 ml-auto">
                    {stage.channels?.map(ch => {
                      const Icon = CHANNEL_ICONS[ch] || Monitor;
                      return <Icon key={ch} className="w-3.5 h-3.5 text-muted-foreground" />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}