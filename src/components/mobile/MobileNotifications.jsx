import React, { useState } from "react";
import { Bell, AlertTriangle, Clock, FileText, Award, MessageSquare, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const NOTIFICATIONS = [
  { id: "n1", priority: "urgent", icon: AlertTriangle, iconColor: "text-red-500", bg: "bg-red-50 border-red-200",
    title: "Session note overdue", body: "Lisa Torres — Mar 20 visit note has not been submitted. 5 days overdue.", time: "2 days ago", action: "View Note" },
  { id: "n2", priority: "urgent", icon: FileText, iconColor: "text-orange-500", bg: "bg-orange-50 border-orange-200",
    title: "Co-signature requested", body: "Supervisor Adams has requested a correction on your Mar 22 note for Michael Anderson.", time: "1 hour ago", action: "Review" },
  { id: "n3", priority: "important", icon: Clock, iconColor: "text-blue-500", bg: "bg-blue-50 border-blue-200",
    title: "Visit starting in 30 min", body: "Michael Anderson — Personal Care — 8:00 AM at 123 Oak Street.", time: "30 min ago", action: "View Visit" },
  { id: "n4", priority: "important", icon: Award, iconColor: "text-amber-500", bg: "bg-amber-50 border-amber-200",
    title: "CPR certification expiring", body: "Your CPR certification expires in 12 days. Complete renewal to stay compliant.", time: "Yesterday", action: "View" },
  { id: "n5", priority: "info", icon: MessageSquare, iconColor: "text-purple-500", bg: "bg-purple-50 border-purple-200",
    title: "Message from Supervisor Adams", body: "Schedule change on Friday — please confirm availability for Lisa Torres 3–5 PM.", time: "3 hours ago", action: "Reply" },
  { id: "n6", priority: "info", icon: CheckCircle2, iconColor: "text-green-500", bg: "bg-green-50 border-green-200",
    title: "Note approved", body: "Your Mar 19 session note for David Park has been approved and finalized.", time: "1 day ago", action: null },
];

const PRIORITY_LABELS = {
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700" },
  important: { label: "Important", color: "bg-amber-100 text-amber-700" },
  info: { label: "Info", color: "bg-slate-100 text-slate-600" },
};

const FILTER_TABS = ["All", "Urgent", "Important", "Info"];

export default function MobileNotifications() {
  const [filter, setFilter] = useState("All");
  const [dismissed, setDismissed] = useState([]);

  const visible = NOTIFICATIONS.filter((n) => {
    if (dismissed.includes(n.id)) return false;
    if (filter === "All") return true;
    return n.priority === filter.toLowerCase();
  });

  const urgentCount = NOTIFICATIONS.filter((n) => n.priority === "urgent" && !dismissed.includes(n.id)).length;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-4 pt-6 pb-4 bg-card border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          {urgentCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {urgentCount} urgent
            </span>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTER_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn("flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors",
                filter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No notifications here</p>
          </div>
        )}
        {visible.map((n) => {
          const Icon = n.icon;
          const pCfg = PRIORITY_LABELS[n.priority];
          return (
            <div key={n.id} className={cn("rounded-2xl border p-4", n.bg)}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  <Icon className={cn("w-5 h-5", n.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground leading-snug">{n.title}</p>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0", pCfg.color)}>{pCfg.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{n.body}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{n.time}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDismissed((d) => [...d, n.id])}
                        className="text-[10px] text-muted-foreground underline"
                      >
                        Dismiss
                      </button>
                      {n.action && (
                        <button className="flex items-center gap-0.5 text-xs font-semibold text-primary">
                          {n.action} <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}