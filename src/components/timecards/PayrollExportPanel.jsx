import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Download, Eye, Lock, Users } from "lucide-react";
import { generatePayPeriods } from "@/lib/overtimeUtils";

const FREQUENCIES = [
  { value: "semi-monthly", label: "Semi-Monthly (1st–15th / 16th–end)" },
  { value: "weekly", label: "Weekly (Mon–Sun)" },
  { value: "bi-weekly", label: "Bi-Weekly (every 2 weeks, Mon–Sun)" },
  { value: "monthly", label: "Monthly (1st–last day)" },
  { value: "custom", label: "Custom Date Range" },
];

const STATUS_OPTIONS = ["Approved", "Pending", "All"];

export default function PayrollExportPanel({ staff = [], onPreview, onExportCSV, onExportPDF, onLockPeriod }) {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState("semi-monthly");
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedStaff, setSelectedStaff] = useState([]); // [] = all
  const [allStaff, setAllStaff] = useState(true);
  const [selectedStatuses, setSelectedStatuses] = useState(["Approved"]);
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);

  const activeStaff = useMemo(() => staff.filter(s => s.status === "Active" || !s.status), [staff]);

  const payPeriods = useMemo(() => {
    if (frequency === "custom") return [];
    return generatePayPeriods(frequency);
  }, [frequency]);

  const currentPeriod = useMemo(() => {
    if (frequency === "custom") {
      if (!customStart || !customEnd) return null;
      return { start: customStart, end: customEnd, label: `${customStart} – ${customEnd}` };
    }
    return selectedPeriod;
  }, [frequency, customStart, customEnd, selectedPeriod]);

  const effectiveStaffIds = allStaff ? activeStaff.map(s => s.id) : selectedStaff;
  const canAct = currentPeriod && effectiveStaffIds.length > 0;

  const toggleStatus = (s) => {
    if (s === "All") {
      setSelectedStatuses(["All"]);
    } else {
      setSelectedStatuses(prev => {
        const without = prev.filter(x => x !== "All");
        return without.includes(s) ? without.filter(x => x !== s) || ["Approved"] : [...without, s];
      });
    }
  };

  const toggleStaff = (id) => {
    if (allStaff) {
      setAllStaff(false);
      setSelectedStaff([id]);
    } else {
      setSelectedStaff(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    }
  };

  const handleSelectAllStaff = () => {
    setAllStaff(true);
    setSelectedStaff([]);
  };

  const params = { period: currentPeriod, frequency, staffIds: effectiveStaffIds, statuses: selectedStatuses };

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors mb-2"
      >
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Payroll Export
        {open && <Badge variant="outline" className="ml-1 text-xs">Panel Open</Badge>}
      </button>

      {open && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Frequency */}
              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">Payroll Frequency</Label>
                <Select value={frequency} onValueChange={(v) => { setFrequency(v); setSelectedPeriod(null); }}>
                  <SelectTrigger className="bg-background text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Pay Period */}
              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">Pay Period</Label>
                {frequency === "custom" ? (
                  <div className="flex gap-2">
                    <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-background text-xs" />
                    <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-background text-xs" />
                  </div>
                ) : (
                  <Select value={selectedPeriod?.start || ""} onValueChange={(v) => setSelectedPeriod(payPeriods.find(p => p.start === v))}>
                    <SelectTrigger className="bg-background text-sm">
                      <SelectValue placeholder="Select pay period" />
                    </SelectTrigger>
                    <SelectContent>
                      {payPeriods.map(p => <SelectItem key={p.start} value={p.start}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Employee Selector */}
              <div className="relative">
                <Label className="text-xs mb-1 block text-muted-foreground">Employees</Label>
                <button
                  className="w-full flex items-center justify-between gap-2 h-9 px-3 text-sm border border-input rounded-md bg-background hover:bg-muted/50 transition-colors"
                  onClick={() => setStaffDropdownOpen(o => !o)}
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    {allStaff ? "All Staff" : `${selectedStaff.length} Selected`}
                  </span>
                  {!allStaff && selectedStaff.length > 0 && (
                    <Badge className="text-xs py-0 h-5">{selectedStaff.length}</Badge>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {staffDropdownOpen && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-background border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    <button
                      className={`w-full text-left px-3 py-2 text-sm font-medium hover:bg-muted transition-colors ${allStaff ? "text-primary bg-primary/5" : ""}`}
                      onClick={handleSelectAllStaff}
                    >
                      ✓ All Staff ({activeStaff.length})
                    </button>
                    <div className="border-t border-border" />
                    {activeStaff.map(s => {
                      const name = `${s.first_name} ${s.last_name}`;
                      const selected = !allStaff && selectedStaff.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${selected ? "text-primary bg-primary/5" : ""}`}
                          onClick={() => toggleStaff(s.id)}
                        >
                          {selected ? "✓ " : "  "}{name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">Status Filter</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {STATUS_OPTIONS.map(s => {
                    const active = selectedStatuses.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleStatus(s)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          active
                            ? s === "Approved" ? "bg-accent text-white border-accent"
                              : s === "Pending" ? "bg-amber-500 text-white border-amber-500"
                              : "bg-primary text-white border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-primary/10">
              <Button size="sm" variant="outline" disabled={!canAct} onClick={() => onPreview?.(params)} className="gap-2">
                <Eye className="w-4 h-4" /> Preview
              </Button>
              <Button size="sm" variant="outline" disabled={!canAct} onClick={() => onExportCSV?.(params)} className="gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
              <Button size="sm" variant="outline" disabled={!canAct} onClick={() => onExportPDF?.(params)} className="gap-2">
                <Download className="w-4 h-4" /> Export PDF
              </Button>
              <Button size="sm" variant="default" disabled={!canAct} onClick={() => onLockPeriod?.(params)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                <Lock className="w-4 h-4" /> Lock Pay Period
              </Button>
              {!canAct && (
                <span className="text-xs text-muted-foreground self-center ml-2">Select a pay period and at least one employee to enable actions.</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Click-away to close staff dropdown */}
      {staffDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setStaffDropdownOpen(false)} />
      )}
    </div>
  );
}