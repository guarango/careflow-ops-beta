import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { DEFAULT_METRICS } from "@/lib/annualReport";

export default function AnnualReportColumnsDialog({ open, onOpenChange, code, template, onSaved }) {
  const [columns, setColumns] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setColumns(template?.columns?.length ? template.columns.map((c) => ({ ...c })) : DEFAULT_METRICS.map((c) => ({ ...c })));
    setNewLabel("");
  }, [open, template]);

  const renameColumn = (key, label) => {
    setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, label } : c)));
  };

  const removeColumn = (key) => {
    setColumns((prev) => prev.filter((c) => c.key !== key));
  };

  const addColumn = () => {
    const label = newLabel.trim();
    if (!label) return;
    setColumns((prev) => [...prev, { key: `manual_${Date.now()}`, label, metric: "manual" }]);
    setNewLabel("");
  };

  const save = async () => {
    if (!code) return;
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const payload = {
        service_code_id: code.id,
        code: code.code,
        code_label: code.label || code.code,
        columns,
        updated_by: me?.id || "",
        updated_by_name: me?.full_name || me?.email || "",
        updated_at: new Date().toISOString(),
      };
      const saved = template
        ? await base44.entities.AnnualReportTemplate.update(template.id, payload)
        : await base44.entities.AnnualReportTemplate.create(payload);
      onSaved?.(saved);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Columns for {code?.code}</DialogTitle>
          <DialogDescription>
            Rename a column to match a question on the state form, or add a column for a question we do not compute.
            Saved as this code's template; added columns are typed in per row.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {columns.map((c) => (
            <div key={c.key} className="flex items-center gap-2">
              <Input value={c.label} onChange={(e) => renameColumn(c.key, e.target.value)} className="h-9" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground w-32 shrink-0">
                {c.metric === "manual" ? "typed in" : "computed"}
              </span>
              {c.metric === "manual" && (
                <Button size="icon" variant="ghost" onClick={() => removeColumn(c.key)} aria-label="Remove column">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-end gap-2 pt-2 border-t border-border">
          <div className="flex-1">
            <Label className="text-xs">Add a column</Label>
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Number of persons employed" className="h-9 mt-1" />
          </div>
          <Button variant="outline" onClick={addColumn} className="gap-1">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gap-1">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}