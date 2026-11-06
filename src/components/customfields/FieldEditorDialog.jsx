import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { FIELD_TYPES } from "@/lib/customFields";

const EMPTY = { label: "", help_text: "", field_type: "short_text", options: "", required: false, admin_only: false };

export default function FieldEditorDialog({ open, field, hasAnswers, saving, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const isEdit = !!field;

  useEffect(() => {
    if (!open) return;
    setForm(field
      ? {
          label: field.label || "",
          help_text: field.help_text || "",
          field_type: field.field_type || "short_text",
          options: (field.options || []).join("\n"),
          required: !!field.required,
          admin_only: !!field.admin_only,
        }
      : EMPTY);
  }, [open, field]);

  const typeLocked = isEdit && hasAnswers;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const options = form.options.split("\n").map((o) => o.trim()).filter(Boolean);
  const valid = form.label.trim() && (form.field_type !== "dropdown" || options.length > 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit field" : "Add custom field"}</DialogTitle>
          <DialogDescription>
            Custom fields are stored as data — no columns are added to the form's records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Label *</Label>
            <Input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="e.g. Was the guardian notified?" />
          </div>
          <div>
            <Label>Help text</Label>
            <Input value={form.help_text} onChange={(e) => set("help_text", e.target.value)} placeholder="Shown under the field (optional)" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.field_type} onValueChange={(v) => set("field_type", v)} disabled={typeLocked}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {typeLocked && (
              <p className="text-xs text-amber-600 mt-1">
                This field already has answers, so its type is locked. Retire it and add a new field instead.
              </p>
            )}
          </div>
          {form.field_type === "dropdown" && (
            <div>
              <Label>Options * (one per line)</Label>
              <Textarea value={form.options} onChange={(e) => set("options", e.target.value)} rows={4} placeholder={"Yes, written\nNo, verbal"} />
            </div>
          )}
          <div className="flex flex-wrap gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!form.required} onCheckedChange={(v) => set("required", !!v)} /> Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!form.admin_only} onCheckedChange={(v) => set("admin_only", !!v)} /> Admin only
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Required only blocks new records. Admin-only answers are stored separately and never shown to non-Admins.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid || saving}
            onClick={() => onSave({
              label: form.label.trim(),
              help_text: form.help_text.trim(),
              field_type: form.field_type,
              options: form.field_type === "dropdown" ? options : [],
              required: !!form.required,
              admin_only: !!form.admin_only,
            })}
          >
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}