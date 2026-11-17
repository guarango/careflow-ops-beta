import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SummarySettingsDialog({ settings = {}, onClose, onSave, saving }) {
  const [internalEnabled, setInternalEnabled] = useState(settings.internal_monthly_enabled !== false);
  const [dueDays, setDueDays] = useState(String(settings.due_days ?? 15));
  const [anchor, setAnchor] = useState(settings.quarter_anchor === "plan_year" ? "plan_year" : "calendar");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md grid-cols-[minmax(0,1fr)]">
        <DialogHeader>
          <DialogTitle className="text-sm">Summary generation settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Internal monthly progress notes</p>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Write a monthly note for quarterly-cadence services so the quarterly summary is easy to assemble. Turn off to stop only these notes.
              </p>
            </div>
            <Switch checked={internalEnabled} onCheckedChange={setInternalEnabled} />
          </div>

          <div>
            <Label className="text-xs">Due days after the period ends</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={dueDays}
              onChange={(e) => setDueDays(e.target.value)}
              className="h-9 w-24"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Default 15 calendar days — the state due date is not yet confirmed.</p>
          </div>

          <div>
            <Label className="text-xs">Quarter boundaries</Label>
            <Select value={anchor} onValueChange={setAnchor}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">Calendar quarters (Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec)</SelectItem>
                <SelectItem value="plan_year">Anchored to the PCSP plan year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={saving || !(Number(dueDays) > 0)}
            onClick={() => onSave({
              internal_monthly_enabled: internalEnabled,
              due_days: Number(dueDays) || 15,
              quarter_anchor: anchor,
            })}
          >
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}