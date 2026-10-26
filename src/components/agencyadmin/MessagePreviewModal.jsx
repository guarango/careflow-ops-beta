import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Smartphone, Bell, Mail, RotateCcw } from "lucide-react";
import { SEVERITY_CONFIG } from "@/lib/notificationRules";

const LINK = "https://app.careflow-ops.com/notifications";

function defaultsFor(rule) {
  const category = rule.category.replace(/_/g, " ");
  const sms = rule.severity === "critical"
    ? `CareFlow URGENT: A critical alert needs your attention now. Open: ${LINK}`
    : `CareFlow: You have a new ${category} item that needs attention. Open: ${LINK} Reply STOP to opt out.`;
  const push_title = "CareFlow";
  const push_body = `${category} reminder — tap to view`;
  const email_subject = rule.severity === "critical"
    ? "CareFlow: Urgent alert"
    : rule.severity === "action"
      ? "CareFlow: Action needed"
      : "CareFlow: Your daily summary";
  const email_body = `You have ${rule.severity === "critical" ? "a critical" : "a new"} ${category} item that needs your attention in CareFlow.`;
  return { sms, push_title, push_body, email_subject, email_body };
}

export default function MessagePreviewModal({ rule, open, onClose, onSave }) {
  const [templates, setTemplates] = useState({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (rule) {
      setTemplates({ ...defaultsFor(rule), ...(rule.message_templates || {}) });
      setDirty(false);
    }
  }, [rule]);

  if (!rule) return null;
  const sev = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.action;

  const update = (field, value) => {
    setTemplates(p => ({ ...p, [field]: value }));
    setDirty(true);
  };

  const resetField = (field) => {
    setTemplates(p => ({ ...p, [field]: defaultsFor(rule)[field] }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (onSave) {
      // Only persist fields that differ from defaults
      const defs = defaultsFor(rule);
      const custom = {};
      for (const key of Object.keys(defs)) {
        if (templates[key] !== defs[key]) custom[key] = templates[key];
      }
      await onSave(rule, custom);
    }
    setDirty(false);
    onClose();
  };

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
            <Textarea
              value={templates.sms || ""}
              onChange={(e) => update("sms", e.target.value)}
              rows={3}
              className="bg-white text-sm font-mono leading-relaxed resize-none"
            />
            <button onClick={() => resetField("sms")} className="text-xs text-muted-foreground hover:text-primary mt-1 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Reset to default
            </button>
          </div>

          {/* Push */}
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Push Notification</span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <Input
                  value={templates.push_title || ""}
                  onChange={(e) => update("push_title", e.target.value)}
                  className="bg-white text-sm font-semibold"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Body</label>
                <Textarea
                  value={templates.push_body || ""}
                  onChange={(e) => update("push_body", e.target.value)}
                  rows={2}
                  className="bg-white text-sm resize-none"
                />
              </div>
            </div>
            <button onClick={() => { resetField("push_title"); resetField("push_body"); }} className="text-xs text-muted-foreground hover:text-primary mt-1 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Reset to default
            </button>
          </div>

          {/* Email */}
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Email</span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Subject</label>
                <Input
                  value={templates.email_subject || ""}
                  onChange={(e) => update("email_subject", e.target.value)}
                  className="bg-white text-sm font-medium"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Body</label>
                <Textarea
                  value={templates.email_body || ""}
                  onChange={(e) => update("email_body", e.target.value)}
                  rows={2}
                  className="bg-white text-sm resize-none"
                />
              </div>
              <div className="pt-1">
                <button className="text-xs font-semibold text-white bg-primary px-4 py-2 rounded-md">View in CareFlow</button>
                <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">For privacy, details are only available after you sign in.</p>
              </div>
            </div>
            <button onClick={() => { resetField("email_subject"); resetField("email_body"); }} className="text-xs text-muted-foreground hover:text-primary mt-1 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Reset to default
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!dirty}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}