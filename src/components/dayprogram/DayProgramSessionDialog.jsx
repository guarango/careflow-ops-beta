import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import CheckboxPicker from "@/components/users/CheckboxPicker";
import RatioGauge from "./RatioGauge";
import { ratioCheck } from "@/lib/dayProgram";

export default function DayProgramSessionDialog({ initial, clients = [], staff = [], oneToOneIds = [], canOverride, onClose, onSave, saving }) {
  const isNew = !initial?.id;
  const [form, setForm] = useState({
    date: initial?.date || new Date().toISOString().slice(0, 10),
    start_time: initial?.start_time || "08:00",
    end_time: initial?.end_time || "14:00",
    service_code: initial?.service_code || "DSG",
    setting: initial?.setting || "Site-based",
    site_name: initial?.site_name || "",
    status: initial?.status || "Scheduled",
    staff_ids: initial?.staff_ids || [],
    client_ids: initial?.client_ids || [],
    ratio_override_reason: initial?.ratio_override_reason || "",
    notes: initial?.notes || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggle = (key, id) => setForm((f) => ({
    ...f,
    [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id],
  }));

  const check = ratioCheck({
    staff: form.staff_ids.length,
    persons: form.client_ids.length,
    oneToOne: form.client_ids.filter((id) => oneToOneIds.includes(id)).length,
  });

  const handleSave = () => {
    onSave({
      ...form,
      staff_names: staff.filter((s) => form.staff_ids.includes(s.id)).map((s) => `${s.first_name} ${s.last_name}`.trim()),
      client_names: clients.filter((c) => form.client_ids.includes(c.id)).map((c) => `${c.first_name} ${c.last_name}`.trim()),
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg grid-cols-[minmax(0,1fr)] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-sm">{isNew ? "New day program session" : "Edit day program session"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Date *</Label>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Service</Label>
            <Select value={form.service_code} onValueChange={(v) => set("service_code", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DSG">DSG — group day service</SelectItem>
                <SelectItem value="DSP">DSP — day support</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Start</Label>
            <Input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">End</Label>
            <Input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Setting</Label>
            <Select value={form.setting} onValueChange={(v) => set("setting", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Site-based">Site-based</SelectItem>
                <SelectItem value="Community">Community</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Site / location</Label>
            <Input value={form.site_name} onChange={(e) => set("site_name", e.target.value)} placeholder="Day program room, park…" className="h-9" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CheckboxPicker
            label={`Staff on duty (${form.staff_ids.length})`}
            items={staff.map((s) => ({ id: s.id, label: `${s.first_name} ${s.last_name}`.trim() }))}
            selected={form.staff_ids}
            onToggle={(id) => toggle("staff_ids", id)}
            emptyText="No staff records found."
          />
          <CheckboxPicker
            label={`Persons present (${form.client_ids.length})`}
            items={clients.map((c) => ({ id: c.id, label: `${c.first_name} ${c.last_name}`.trim() }))}
            selected={form.client_ids}
            onToggle={(id) => toggle("client_ids", id)}
            emptyText="No clients found."
          />
        </div>

        <div className="rounded-xl border border-border p-3">
          <RatioGauge check={check} />
          {check.over && (
            <div className="mt-2 space-y-1">
              {check.warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-red-700 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{w}
                </p>
              ))}
            </div>
          )}
          {check.over && (
            <div className="mt-2">
              <Label className="text-xs">Manager override reason {canOverride ? "(required to record an override)" : ""}</Label>
              <Textarea
                value={form.ratio_override_reason}
                onChange={(e) => set("ratio_override_reason", e.target.value)}
                rows={2}
                disabled={!canOverride}
                placeholder={canOverride ? "Why is this session above 1:6?" : "A manager records the override reason."}
                className="text-sm"
              />
            </div>
          )}
        </div>

        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="text-sm" />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.date || form.client_ids.length === 0}>
            {saving ? "Saving..." : isNew ? "Create session" : "Save session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}