import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Bell, Mail } from "lucide-react";
import { SEVERITY_CONFIG } from "@/lib/notificationRules";

/**
 * Shows PHI-free message previews for SMS, Push, and Email for a given rule.
 * All templates use generic category-only language — no client names, meds, diagnoses.
 */
export default function MessagePreviewModal({ rule, open, onClose }) {
  if (!rule) return null;
  const sev = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.action;
  const category = rule.category.replace(/_/g, " ");

  const link = "https://app.careflow-ops.com/notifications";

  const smsTemplate = rule.severity === "critical"
    ? `CareFlow URGENT: A critical alert needs your attention now. Open: ${link}`
    : `CareFlow: You have a new ${category} item that needs attention. Open: ${link} Reply STOP to opt out.`;

  const pushTitle = "CareFlow";
  const pushBody = `${category} reminder — tap to view`;

  const emailSubject = rule.severity === "critical"
    ? "CareFlow: Urgent alert"
    : rule.severity === "action"
      ? "CareFlow: Action needed"
      : "CareFlow: Your daily summary";

  const emailBody = `You have ${rule.severity === "critical" ? "a critical" : "a new"} ${category} item that needs your attention in CareFlow.`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Message Preview
            <Badge variant="outline" className={sev.color}>{sev.label}</Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{rule.label}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* SMS */}
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">SMS</span>
              <span className="text-xs text-muted-foreground ml-auto">No PHI — category only</span>
            </div>
            <div className="bg-white border border-border rounded-lg p-3 text-sm text-foreground font-mono leading-relaxed">
              {smsTemplate}
            </div>
          </div>

          {/* Push */}
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Push Notification</span>
            </div>
            <div className="bg-white border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Lock screen preview:</p>
              <p className="text-sm font-semibold text-foreground mt-1">{pushTitle}</p>
              <p className="text-sm text-foreground">{pushBody}</p>
            </div>
          </div>

          {/* Email */}
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Email</span>
            </div>
            <div className="bg-white border border-border rounded-lg p-3 space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">Subject: </span>
                <span className="text-sm font-medium text-foreground">{emailSubject}</span>
              </div>
              <p className="text-sm text-foreground">{emailBody}</p>
              <button className="text-xs font-semibold text-white bg-primary px-4 py-2 rounded-md">View in CareFlow</button>
              <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">For privacy, details are only available after you sign in.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}