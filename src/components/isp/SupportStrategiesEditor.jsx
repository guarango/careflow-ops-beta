import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle, CheckCircle2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

const EXEMPT_SERVICES = ["ELS", "MTP", "PBA", "Professional Medication Monitoring", "Respite"];

export function validateSupportStrategies(strategies = [], goals = [], services = []) {
  const flags = [];
  const goalIds = new Set((strategies || []).filter(s => s.linked_goal_id).map(s => s.linked_goal_id));
  const serviceTypes = new Set((strategies || []).filter(s => s.linked_service_type).map(s => s.linked_service_type));

  goals.forEach(g => {
    if (!goalIds.has(g.id)) {
      flags.push(`Goal "${g.goal_title}" has no support strategy`);
    }
  });

  services.forEach(svc => {
    const st = svc.service_type;
    if (!st) return;
    const isExempt = EXEMPT_SERVICES.some(e => st.toLowerCase().includes(e.toLowerCase()));
    if (isExempt) return;
    if (!serviceTypes.has(st)) {
      flags.push(`Service "${st}" has no support strategy`);
    }
  });

  return flags;
}

export default function SupportStrategiesEditor({ strategies = [], goals = [], services = [], onChange }) {
  const [showFlags, setShowFlags] = useState(true);

  const flags = validateSupportStrategies(strategies, goals, services);

  const add = () => {
    onChange([...strategies, { strategy_description: "", linked_goal_id: "", linked_goal_title: "", linked_service_type: "", frequency: "", responsible_role: "", notes: "" }]);
  };
  const update = (idx, updated) => {
    const arr = [...strategies];
    arr[idx] = updated;
    onChange(arr);
  };
  const remove = (idx) => onChange(strategies.filter((_, i) => i !== idx));

  const setField = (idx, field, value) => {
    const arr = [...strategies];
    arr[idx] = { ...arr[idx], [field]: value };
    if (field === "linked_goal_id") {
      const g = goals.find(g => g.id === value);
      arr[idx].linked_goal_title = g ? g.goal_title : "";
    }
    onChange(arr);
  };

  return (
    <div>
      <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 mb-4 text-xs text-sky-800">
        <strong>Support Strategies.</strong> Each PCSP goal must have at least one support strategy.
        Each service the client receives must be linked to at least one support strategy.
        Exempt services: ELS, MTP, PBA, Professional Medication Monitoring, Respite.
      </div>

      {showFlags && flags.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />{flags.length} item{flags.length !== 1 ? "s" : ""} without a support strategy
            </p>
            <button type="button" onClick={() => setShowFlags(false)} className="text-xs text-amber-600 hover:underline">Hide</button>
          </div>
          {flags.map((f, i) => <p key={i} className="text-xs text-amber-700">• {f}</p>)}
        </div>
      )}
      {flags.length === 0 && strategies.length > 0 && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <p className="text-xs text-emerald-700">All goals and services have support strategies linked.</p>
        </div>
      )}

      {strategies.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground">
          No support strategies yet.
          <br />
          <button type="button" onClick={add} className="text-primary hover:underline mt-1 text-sm">Add the first strategy →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {strategies.map((s, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Link2 className="w-3.5 h-3.5" />Strategy {i + 1}
                  </div>
                  <button type="button" onClick={() => remove(i)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <Label className="text-xs">Strategy Description *</Label>
                  <Textarea
                    value={s.strategy_description || ""}
                    onChange={e => setField(i, "strategy_description", e.target.value)}
                    rows={2}
                    placeholder="Describe the specific support strategy — what staff will do, how, and when"
                    className="text-sm mt-0.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Linked Goal</Label>
                    <Select value={s.linked_goal_id || ""} onValueChange={v => setField(i, "linked_goal_id", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select goal" /></SelectTrigger>
                      <SelectContent>
                        {goals.map(g => <SelectItem key={g.id} value={g.id} className="text-xs">{g.goal_title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {s.linked_goal_id && <Badge className="text-xs mt-1 bg-violet-100 text-violet-700">Goal linked</Badge>}
                  </div>
                  <div>
                    <Label className="text-xs">Linked Service</Label>
                    <Select value={s.linked_service_type || ""} onValueChange={v => setField(i, "linked_service_type", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select service" /></SelectTrigger>
                      <SelectContent>
                        {services.filter(svc => svc.service_type).map((svc, si) => <SelectItem key={si} value={svc.service_type} className="text-xs">{svc.service_type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {s.linked_service_type && <Badge className="text-xs mt-1 bg-blue-100 text-blue-700">Service linked</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Frequency</Label>
                    <Input value={s.frequency || ""} onChange={e => setField(i, "frequency", e.target.value)} placeholder="e.g. Daily, 3x/week" className="h-8 text-xs mt-0.5" />
                  </div>
                  <div>
                    <Label className="text-xs">Responsible Role</Label>
                    <Input value={s.responsible_role || ""} onChange={e => setField(i, "responsible_role", e.target.value)} placeholder="e.g. DSP, QIDP, Nurse" className="h-8 text-xs mt-0.5" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Notes</Label>
                  <Input value={s.notes || ""} onChange={e => setField(i, "notes", e.target.value)} placeholder="Additional context" className="h-8 text-xs mt-0.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button type="button" size="sm" variant="outline" onClick={add} className="gap-1.5 mt-4">
        <Plus className="w-4 h-4" />Add Strategy
      </Button>
    </div>
  );
}