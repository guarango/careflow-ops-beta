import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AIBadge from "./AIBadge";
import { Plus, Zap, ChevronRight, Play, Pause, Edit2, Trash2, Clock } from "lucide-react";

const TRIGGERS = [
  { value: "session_note_submitted", label: "Session Note Submitted" },
  { value: "incident_filed", label: "Incident Report Filed" },
  { value: "certification_expires", label: "Certification Expiring" },
  { value: "timecard_approved", label: "Timecard Approved" },
  { value: "evv_rejected", label: "EVV Record Rejected" },
  { value: "auth_expiring", label: "Authorization Expiring" },
  { value: "goal_not_collected", label: "Goal Data Not Collected" },
  { value: "note_unsigned", label: "Session Note Unsigned" },
];

const ACTIONS = [
  { value: "send_notification", label: "Send In-App Notification" },
  { value: "create_task", label: "Create Task" },
  { value: "send_email", label: "Send Email" },
  { value: "update_field", label: "Update Record Field" },
  { value: "generate_report", label: "Generate Report" },
];

const TEMPLATES = [
  { name: "Unsigned Note Escalation", trigger: "note_unsigned", condition_field: "hours_overdue", condition_operator: "greater_than", condition_value: "24", action: "send_notification", description: "Alert supervisor when a note is unsigned for 24+ hours" },
  { name: "Cert Expiry 30-Day Warning", trigger: "certification_expires", condition_field: "days_until_expiry", condition_operator: "equals", condition_value: "30", action: "send_email", description: "Email staff + supervisor 30 days before cert expires" },
  { name: "EVV Rejection Task", trigger: "evv_rejected", condition_field: "rejection_type", condition_operator: "any", condition_value: "", action: "create_task", description: "Auto-create correction task when EVV is rejected" },
  { name: "Auth Expiry Renewal Task", trigger: "auth_expiring", condition_field: "days_until_expiry", condition_operator: "equals", condition_value: "45", action: "create_task", description: "Create billing renewal task 45 days before auth expires" },
  { name: "Goal Data Alert", trigger: "goal_not_collected", condition_field: "days_since_collection", condition_operator: "greater_than", condition_value: "7", action: "send_notification", description: "Alert DSP when goal data hasn't been collected in 7 days" },
  { name: "Incident Supervisor Alert", trigger: "incident_filed", condition_field: "incident_type", condition_operator: "equals", condition_value: "Physical Aggression", action: "send_notification", description: "Immediately notify supervisor when physical aggression incident is filed" },
];

function WorkflowCard({ rule, onToggle, onDelete }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-semibold">{rule.name}</p>
            {rule.is_template && <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">Template</Badge>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium">{TRIGGERS.find(t => t.value === rule.trigger)?.label || rule.trigger}</span>
            {rule.condition_field && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">if {rule.condition_field} {rule.condition_operator} {rule.condition_value}</span>
              </>
            )}
            <ChevronRight className="w-3 h-3" />
            <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-medium">{ACTIONS.find(a => a.value === rule.action)?.label || rule.action}</span>
          </div>
          {rule.execution_count > 0 && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Executed {rule.execution_count} times
              {rule.last_executed_at && ` · Last: ${new Date(rule.last_executed_at).toLocaleDateString()}`}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch checked={rule.is_active} onCheckedChange={() => onToggle(rule)} />
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onDelete(rule.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AutomationBuilder() {
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState("workflows");
  const [form, setForm] = useState({ name: "", trigger: "", condition_field: "", condition_operator: "equals", condition_value: "", action: "" });
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["aiWorkflowRules"],
    queryFn: () => base44.entities.AIWorkflowRule.list("-created_date", 50),
  });

  const createRule = useMutation({
    mutationFn: (data) => base44.entities.AIWorkflowRule.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["aiWorkflowRules"] }); setShowNew(false); setForm({ name: "", trigger: "", condition_field: "", condition_operator: "equals", condition_value: "", action: "" }); },
  });

  const updateRule = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AIWorkflowRule.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["aiWorkflowRules"] }),
  });

  const deleteRule = useMutation({
    mutationFn: (id) => base44.entities.AIWorkflowRule.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["aiWorkflowRules"] }),
  });

  const handleToggle = (rule) => updateRule.mutate({ id: rule.id, data: { is_active: !rule.is_active } });
  const applyTemplate = (t) => {
    setForm({ name: t.name, trigger: t.trigger, condition_field: t.condition_field, condition_operator: t.condition_operator, condition_value: t.condition_value, action: t.action });
    setShowNew(true);
    setActiveTab("workflows");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Automation Builder</h2>
          <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">No-Code</Badge>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-2" />New Workflow
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        {[{ key: "workflows", label: `My Workflows (${rules.length})` }, { key: "templates", label: `Templates (${TEMPLATES.length})` }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${activeTab === t.key ? "bg-violet-600 border-violet-600 text-white" : "border-border text-muted-foreground hover:border-violet-500/50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "workflows" && (
        <div>
          {isLoading && <p className="text-sm text-muted-foreground py-4 text-center">Loading workflows...</p>}
          {!isLoading && rules.length === 0 && (
            <div className="text-center py-10">
              <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No workflows yet. Create one or start from a template.</p>
            </div>
          )}
          <div className="space-y-2">
            {rules.map(r => (
              <WorkflowCard key={r.id} rule={r} onToggle={handleToggle} onDelete={(id) => deleteRule.mutate(id)} />
            ))}
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TEMPLATES.map((t, i) => (
            <Card key={i} className="cursor-pointer hover:border-violet-500/40 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0" onClick={() => applyTemplate(t)}>Use</Button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{t.description}</p>
                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">{TRIGGERS.find(tr => tr.value === t.trigger)?.label}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400">{ACTIONS.find(a => a.value === t.action)?.label}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Automation Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Workflow Name</label>
              <Input placeholder="e.g., Unsigned Note Escalation" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Trigger — What starts this workflow?</label>
              <Select value={form.trigger} onValueChange={v => setForm(p => ({ ...p, trigger: v }))}>
                <SelectTrigger><SelectValue placeholder="Select trigger..." /></SelectTrigger>
                <SelectContent>{TRIGGERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Condition Field</label>
                <Input placeholder="e.g., hours_overdue" value={form.condition_field} onChange={e => setForm(p => ({ ...p, condition_field: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Operator</label>
                <Select value={form.condition_operator} onValueChange={v => setForm(p => ({ ...p, condition_operator: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">equals</SelectItem>
                    <SelectItem value="greater_than">greater than</SelectItem>
                    <SelectItem value="less_than">less than</SelectItem>
                    <SelectItem value="any">any</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Value</label>
                <Input placeholder="e.g., 24" value={form.condition_value} onChange={e => setForm(p => ({ ...p, condition_value: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Action — What should happen?</label>
              <Select value={form.action} onValueChange={v => setForm(p => ({ ...p, action: v }))}>
                <SelectTrigger><SelectValue placeholder="Select action..." /></SelectTrigger>
                <SelectContent>{ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-violet-600 hover:bg-violet-700" disabled={!form.name || !form.trigger || !form.action} onClick={() => createRule.mutate({ ...form, is_active: true })}>
              <Zap className="w-4 h-4 mr-2" />Create Workflow
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}