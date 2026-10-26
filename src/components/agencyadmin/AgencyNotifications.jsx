import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  ShieldCheck, Pill, FileText, Clock, BadgeCheck, Users,
  Lock, RotateCcw, Eye, Bell, Info, ChevronUp,
} from "lucide-react";
import {
  CATEGORIES, DEFAULT_RULES, RECIPIENT_LABELS, SEVERITY_CONFIG,
} from "@/lib/notificationRules";
import MessagePreviewModal from "@/components/agencyadmin/MessagePreviewModal";

const CATEGORY_ICONS = {
  ShieldCheck, Pill, FileText, Clock, BadgeCheck, Users,
};

export default function AgencyNotifications({ agency, saving: externalSaving }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [previewRule, setPreviewRule] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [digestEnabled, setDigestEnabled] = useState(true);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const agencyId = agency?.id || "default";
      const page = await base44.entities.NotificationSettings.filter(
        { agency_id: agencyId },
        { limit: 200 }
      );
      let records = page?.items || [];

      // If no rules exist yet, seed defaults
      if (records.length === 0) {
        const seedData = DEFAULT_RULES.map(r => ({
          ...r,
          channels: { ...r.channels },
          agency_id: agencyId,
        }));
        const created = await base44.entities.NotificationSettings.bulkCreate(seedData);
        records = created || [];
      }

      // Merge with defaults for any missing rules
      const existingKeys = new Set(records.map(r => r.event_key));
      const missing = DEFAULT_RULES.filter(d => !existingKeys.has(d.event_key));
      if (missing.length > 0) {
        const created = await base44.entities.NotificationSettings.bulkCreate(
          missing.map(r => ({ ...r, channels: { ...r.channels }, agency_id: agencyId }))
        );
        records = [...records, ...(created || [])];
      }

      setRules(records);
      const digestRule = records.find(r => r.event_key === "_digest");
      setDigestEnabled(digestRule?.enabled !== false);
    } catch (err) {
      console.error("Failed to load notification rules:", err);
    } finally {
      setLoading(false);
    }
  }, [agency?.id]);

  useEffect(() => {
    if (agency?.id) loadRules();
    else { setRules(DEFAULT_RULES); setLoading(false); }
  }, [agency?.id, loadRules]);

  const buildUpdatePayload = (rule, overrides) => ({
    event_key: rule.event_key,
    label: rule.label,
    category: rule.category,
    severity: rule.severity,
    enabled: rule.enabled,
    ...overrides,
    updated_by: "admin",
    updated_at: new Date().toISOString(),
  });

  const toggleChannel = async (ruleId, channel) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    const newChannels = { ...rule.channels, [channel]: !rule.channels?.[channel] };

    if (rule.is_locked && rule.severity === "critical") {
      const allOff = !newChannels.push && !newChannels.email && !newChannels.sms;
      if (allOff) return;
    }

    setRules(rs => rs.map(r => r.id === ruleId ? { ...r, channels: newChannels } : r));
    setSaving(true);
    try {
      await base44.entities.NotificationSettings.update(ruleId, buildUpdatePayload(rule, { channels: newChannels }));
    } catch (err) {
      console.error("Failed to update channel:", err);
      setRules(rs => rs.map(r => r.id === ruleId ? { ...r, channels: rule.channels } : r));
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (ruleId) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule || rule.is_locked) return;
    const newEnabled = !rule.enabled;
    setRules(rs => rs.map(r => r.id === ruleId ? { ...r, enabled: newEnabled } : r));
    setSaving(true);
    try {
      await base44.entities.NotificationSettings.update(ruleId, buildUpdatePayload(rule, { enabled: newEnabled }));
    } catch (err) {
      console.error("Failed to toggle rule:", err);
      setRules(rs => rs.map(r => r.id === ruleId ? { ...r, enabled: rule.enabled } : r));
    } finally {
      setSaving(false);
    }
  };

  const toggleRecipient = async (ruleId, roleKey) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    const current = rule.recipients || [];
    const has = current.includes(roleKey);
    const newRecipients = has ? current.filter(r => r !== roleKey) : [...current, roleKey];

    if (rule.is_locked && rule.severity === "critical" && has) return;

    setRules(rs => rs.map(r => r.id === ruleId ? { ...r, recipients: newRecipients } : r));
    setSaving(true);
    try {
      await base44.entities.NotificationSettings.update(ruleId, buildUpdatePayload(rule, { recipients: newRecipients }));
    } catch (err) {
      console.error("Failed to update recipients:", err);
      setRules(rs => rs.map(r => r.id === ruleId ? { ...r, recipients: current } : r));
    } finally {
      setSaving(false);
    }
  };

  const updateTiming = (ruleId, timingKey, value) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    const newTiming = { ...(rule.timing || {}), [timingKey]: value };
    setRules(rs => rs.map(r => r.id === ruleId ? { ...r, timing: newTiming } : r));
  };

  const saveTiming = async (ruleId) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    setSaving(true);
    try {
      await base44.entities.NotificationSettings.update(ruleId, buildUpdatePayload(rule, { timing: rule.timing }));
    } catch (err) {
      console.error("Failed to save timing:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleDigest = async () => {
    const newVal = !digestEnabled;
    setDigestEnabled(newVal);
    setSaving(true);
    try {
      let digestRule = rules.find(r => r.event_key === "_digest");
      if (digestRule) {
        await base44.entities.NotificationSettings.update(digestRule.id, buildUpdatePayload(digestRule, { enabled: newVal }));
      } else {
        digestRule = await base44.entities.NotificationSettings.create({
          agency_id: agency?.id || "default",
          event_key: "_digest",
          label: "Daily Digest",
          category: "hr_team",
          severity: "fyi",
          is_locked: false,
          enabled: newVal,
          channels: { push: false, email: true, sms: false },
          recipients: ["client_manager", "admin"],
          timing: { send_hour: 7 },
          escalation: null,
        });
      }
    } catch (err) {
      console.error("Failed to toggle digest:", err);
      setDigestEnabled(!newVal);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    setResetConfirm(false);
    setSaving(true);
    try {
      const agencyId = agency?.id || "default";
      await base44.entities.NotificationSettings.deleteMany({ agency_id: agencyId });
      const seedData = DEFAULT_RULES.map(r => ({
        ...r,
        channels: { ...r.channels },
        agency_id: agencyId,
      }));
      const created = await base44.entities.NotificationSettings.bulkCreate(seedData);
      setRules(created || []);
      setDigestEnabled(true);
    } catch (err) {
      console.error("Failed to reset:", err);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryRules = (catKey) => rules.filter(r => r.category === catKey);
  const getSummary = (catKey) => {
    const catRules = getCategoryRules(catKey);
    return {
      total: catRules.length,
      active: catRules.filter(r => r.enabled !== false).length,
      critical: catRules.filter(r => r.severity === "critical").length,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground text-sm">Loading notification rules…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notification Rules
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure which events notify whom, how, and when.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setResetConfirm(true)} disabled={saving}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset to recommended defaults
        </Button>
      </div>

      {/* Top bar: daily digest */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Switch checked={digestEnabled} onCheckedChange={toggleDigest} disabled={saving} />
          <div>
            <p className="text-sm font-medium text-foreground">Send daily digest to Managers and Admins</p>
            <p className="text-xs text-muted-foreground">7:00 AM summary of open Action Required and FYI items</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5" />
          <span>Notifications send anytime — no quiet hours</span>
        </div>
      </div>

      {/* Category card grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {CATEGORIES.map(cat => {
          const Icon = CATEGORY_ICONS[cat.icon] || Bell;
          const summary = getSummary(cat.key);
          const isSelected = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(isSelected ? null : cat.key)}
              className={`text-left p-4 rounded-xl border transition-all hover:shadow-md ${
                isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                {summary.critical > 0 && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0.5">
                    {summary.critical} critical
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground leading-tight">{cat.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.active} of {summary.total} active</p>
            </button>
          );
        })}
      </div>

      {/* Category table (single selection) */}
      {selectedCategory && (() => {
        const cat = CATEGORIES.find(c => c.key === selectedCategory);
        if (!cat) return null;
        const catRules = getCategoryRules(cat.key);
        return (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
              <h3 className="text-sm font-bold text-foreground">{cat.label}</h3>
              <button onClick={() => setSelectedCategory(null)} className="text-muted-foreground hover:text-foreground">
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-2 bg-muted/10 border-b border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                All notifications also appear in the Notification Center.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider min-w-[240px]">Event</th>
                    <th className="text-center px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">Severity</th>
                    <th className="text-left px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider min-w-[180px]">Recipients</th>
                    <th className="text-left px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider min-w-[120px]">Timing</th>
                    <th className="text-center px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">Push</th>
                    <th className="text-center px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="text-center px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider" title="SMS (opted-in users only)">SMS</th>
                    <th className="text-left px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider min-w-[160px]">Escalation</th>
                    <th className="text-center px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">On/Off</th>
                  </tr>
                </thead>
                <tbody>
                  {catRules.map(rule => (
                    <RuleRow
                      key={rule.id || rule.event_key}
                      rule={rule}
                      onToggleChannel={toggleChannel}
                      onToggleEnabled={toggleEnabled}
                      onToggleRecipient={toggleRecipient}
                      onUpdateTiming={updateTiming}
                      onSaveTiming={saveTiming}
                      onPreview={() => setPreviewRule(rule)}
                      saving={saving}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      <MessagePreviewModal
        rule={previewRule}
        open={!!previewRule}
        onClose={() => setPreviewRule(null)}
      />

      <Dialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset to recommended defaults?</DialogTitle>
            <DialogDescription>
              This will restore all notification rules to their original recommended settings. Any custom changes you've made will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirm(false)}>Cancel</Button>
            <Button onClick={resetToDefaults} disabled={saving}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset all rules
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RuleRow({ rule, onToggleChannel, onToggleEnabled, onToggleRecipient, onUpdateTiming, onSaveTiming, onPreview }) {
  const sev = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.action;
  const isLocked = rule.is_locked;

  const renderTiming = () => {
    const timing = rule.timing || {};
    const entries = Object.entries(timing);
    if (entries.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <div className="space-y-1">
        {entries.map(([key, val]) => (
          <TimingInput
            key={key}
            timingKey={key}
            value={val}
            onChange={(v) => onUpdateTiming(rule.id, key, v)}
            onBlur={() => onSaveTiming(rule.id)}
          />
        ))}
      </div>
    );
  };

  const channelDisabled = (channel) => {
    if (!isLocked || rule.severity !== "critical") return false;
    const ch = rule.channels || {};
    const others = channel === "push" ? (!ch.email && !ch.sms) : channel === "email" ? (!ch.push && !ch.sms) : (!ch.push && !ch.email);
    return others;
  };

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/10">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
          {rule.label}
          {isLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{rule.description}</p>
        <button onClick={onPreview} className="text-xs text-primary hover:underline mt-1 flex items-center gap-1">
          <Eye className="w-3 h-3" /> Message preview
        </button>
      </td>

      <td className="px-3 py-3 text-center">
        <Badge variant="outline" className={`${sev.color} text-xs whitespace-nowrap`}>
          {sev.label}
        </Badge>
      </td>

      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          {(rule.recipients || []).map(role => (
            <button
              key={role}
              onClick={() => onToggleRecipient(rule.id, role)}
              disabled={isLocked && rule.severity === "critical"}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                isLocked && rule.severity === "critical"
                  ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                  : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
              }`}
            >
              {RECIPIENT_LABELS[role] || role}
            </button>
          ))}
          {(!isLocked || rule.severity !== "critical") && (
            <RecipientAdder
              currentRecipients={rule.recipients || []}
              onAdd={(role) => onToggleRecipient(rule.id, role)}
            />
          )}
        </div>
      </td>

      <td className="px-3 py-3">{renderTiming()}</td>

      <td className="px-3 py-3 text-center">
        <Switch
          checked={!!rule.channels?.push}
          onCheckedChange={() => onToggleChannel(rule.id, "push")}
          disabled={channelDisabled("push")}
        />
      </td>
      <td className="px-3 py-3 text-center">
        <Switch
          checked={!!rule.channels?.email}
          onCheckedChange={() => onToggleChannel(rule.id, "email")}
          disabled={channelDisabled("email")}
        />
      </td>
      <td className="px-3 py-3 text-center">
        <Switch
          checked={!!rule.channels?.sms}
          onCheckedChange={() => onToggleChannel(rule.id, "sms")}
          disabled={channelDisabled("sms")}
        />
      </td>

      <td className="px-3 py-3">
        {rule.escalation ? (
          <div className="text-xs text-muted-foreground">
            <p>If not resolved in <span className="font-medium text-foreground">{rule.escalation.after_minutes} min</span></p>
            <p>→ {(rule.escalation.to_roles || []).map(r => RECIPIENT_LABELS[r] || r).join(", ")}</p>
            <p className="text-[10px] mt-0.5">
              {rule.escalation.channels?.push && "Push "}
              {rule.escalation.channels?.email && "Email "}
              {rule.escalation.channels?.sms && "SMS"}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      <td className="px-3 py-3 text-center">
        {isLocked ? (
          <div className="flex items-center justify-center" title="Required for safety and compliance — cannot be turned off">
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
        ) : (
          <Switch checked={!!rule.enabled} onCheckedChange={() => onToggleEnabled(rule.id)} />
        )}
      </td>
    </tr>
  );
}

function TimingInput({ timingKey, value, onChange, onBlur }) {
  const label = timingKey.replace(/_/g, " ");
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground capitalize">{label}:</span>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={onBlur}
        className="h-6 w-16 text-xs px-1.5"
      />
    </div>
  );
}

function RecipientAdder({ currentRecipients, onAdd }) {
  const [open, setOpen] = useState(false);
  const available = Object.entries(RECIPIENT_LABELS).filter(([key]) => !currentRecipients.includes(key));
  if (available.length === 0) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/40 hover:text-primary"
      >
        + Add
      </button>
      {open && (
        <div className="absolute z-10 mt-1 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
          {available.map(([key, label]) => (
            <button
              key={key}
              onClick={() => { onAdd(key); setOpen(false); }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-muted/30"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}