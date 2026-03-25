import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save, Bell } from "lucide-react";

const NOTIFICATION_EVENTS = [
  { key: "timecard_submitted", label: "Timecard Submitted", desc: "When a staff member submits a timecard for approval" },
  { key: "timecard_approved", label: "Timecard Approved/Rejected", desc: "When a manager approves or rejects a timecard" },
  { key: "incident_created", label: "New Incident Report", desc: "When a new incident is created — notify supervisors" },
  { key: "incident_critical", label: "Critical Incident", desc: "Immediate escalation for critical severity incidents" },
  { key: "evv_rejected", label: "EVV Submission Rejected", desc: "When an EVV record is rejected by the aggregator" },
  { key: "certification_expiring_30", label: "Certification Expiring (30 days)", desc: "Alert when a staff certification expires within 30 days" },
  { key: "certification_expiring_7", label: "Certification Expiring (7 days)", desc: "Urgent alert for certifications expiring within 7 days" },
  { key: "unsigned_notes_24h", label: "Unsigned Session Notes (24h)", desc: "Alert when session notes remain unsigned after 24 hours" },
  { key: "background_check_expiring", label: "Background Check Expiring", desc: "Alert 30 days before a background check expires" },
  { key: "client_birthday", label: "Client Birthday Reminders", desc: "Daily notification for upcoming client birthdays" },
  { key: "billing_denied", label: "Claim Denied", desc: "When a billing claim is denied by the payer" },
  { key: "leave_request", label: "Leave Request Submitted", desc: "When a staff member submits a time-off request" },
];

export default function AgencyNotifications({ agency, onSave, saving }) {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    if (agency?.notification_settings) setSettings(agency.notification_settings);
    else {
      const defaults = {};
      NOTIFICATION_EVENTS.forEach(e => { defaults[e.key] = { email: true, push: false }; });
      setSettings(defaults);
    }
  }, [agency]);

  const toggle = (key, channel) => {
    setSettings(p => ({ ...p, [key]: { ...p[key], [channel]: !p[key]?.[channel] } }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Notification Rules</h2>
          <span className="text-xs text-muted-foreground ml-2">Configure which events trigger notifications</span>
        </div>

        <div className="grid grid-cols-5 gap-2 px-3 pb-2 border-b border-border mb-1">
          <div className="col-span-3 text-xs font-semibold text-muted-foreground">Event</div>
          <div className="text-xs font-semibold text-muted-foreground text-center">Email</div>
          <div className="text-xs font-semibold text-muted-foreground text-center">Push</div>
        </div>

        <div className="divide-y divide-border">
          {NOTIFICATION_EVENTS.map(event => (
            <div key={event.key} className="grid grid-cols-5 gap-2 px-3 py-3 items-center">
              <div className="col-span-3">
                <p className="text-sm font-medium text-foreground">{event.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{event.desc}</p>
              </div>
              <div className="flex justify-center">
                <Switch checked={!!settings[event.key]?.email} onCheckedChange={() => toggle(event.key, "email")} />
              </div>
              <div className="flex justify-center">
                <Switch checked={!!settings[event.key]?.push} onCheckedChange={() => toggle(event.key, "push")} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => onSave({ notification_settings: settings })} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Notification Settings"}
        </Button>
      </div>
    </div>
  );
}