import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Lock, Loader2, Archive } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useFormFields } from "@/hooks/useFormFields";
import { BUILT_IN_FIELDS } from "@/lib/builtInFormFields";
import { FORM_TYPES, fieldTypeLabel, fieldHasAnswers } from "@/lib/customFields";
import { logAudit } from "@/lib/auditLog";
import SortableFieldRow from "./SortableFieldRow";
import FieldEditorDialog from "./FieldEditorDialog";

function BuiltInList({ labels }) {
  return (
    <div className="space-y-1.5">
      {labels.map((label) => (
        <div key={label} className="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 opacity-70">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Lock className="w-3 h-3" /> Built-in, locked
          </span>
        </div>
      ))}
    </div>
  );
}

export default function FormFieldsPanel({ agencyId }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formType, setFormType] = useState("incident_report");
  const { data: definitions = [], isLoading } = useFormFields(formType);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [hasAnswers, setHasAnswers] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeFields = definitions.filter((d) => d.active !== false);
  const retiredFields = definitions.filter((d) => d.active === false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["form-fields", formType] });

  const openNew = () => { setEditing(null); setHasAnswers(false); setDialogOpen(true); };
  const openEdit = async (field) => {
    setEditing(field);
    setHasAnswers(false);
    setDialogOpen(true);
    try {
      setHasAnswers(await fieldHasAnswers(formType, field.id));
    } catch {
      setHasAnswers(true);
    }
  };

  const saveField = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.FormFieldDefinition.update(editing.id, payload);
        logAudit({
          action: "form_field_changed",
          target_type: "FormFieldDefinition",
          target_id: editing.id,
          target_name: payload.label,
          field: "field definition",
          old_value: `${editing.label} (${editing.field_type})`,
          new_value: `${payload.label} (${payload.field_type})`,
          details: `Required: ${payload.required ? "yes" : "no"}; Admin only: ${payload.admin_only ? "yes" : "no"}`,
        });
        toast({ title: "Field updated" });
      } else {
        const created = await base44.entities.FormFieldDefinition.create({
          ...payload,
          form_type: formType,
          agency_id: agencyId || "",
          active: true,
          display_order: activeFields.length,
          created_by: user?.email || "",
          created_at: new Date().toISOString(),
        });
        logAudit({
          action: "form_field_added",
          target_type: "FormFieldDefinition",
          target_id: created?.id || "",
          target_name: payload.label,
          field: "field definition",
          new_value: `${payload.label} (${payload.field_type})`,
          details: `Added to ${formType}; Required: ${payload.required ? "yes" : "no"}; Admin only: ${payload.admin_only ? "yes" : "no"}`,
        });
        toast({ title: "Field added" });
      }
      refresh();
      setDialogOpen(false);
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const retireField = async (field) => {
    if (!confirm(`Retire "${field.label}"? It disappears from new forms; existing answers stay on their records.`)) return;
    try {
      await base44.entities.FormFieldDefinition.update(field.id, { active: false });
      logAudit({
        action: "form_field_retired",
        target_type: "FormFieldDefinition",
        target_id: field.id,
        target_name: field.label,
        field: "active",
        old_value: "Active",
        new_value: "Retired",
        details: `Retired ${field.label} (${field.field_type}) from ${formType}`,
      });
      toast({ title: "Field retired" });
      refresh();
    } catch (err) {
      toast({ title: "Retire failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = Array.from(activeFields);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    queryClient.setQueryData(["form-fields", formType], [...reordered, ...retiredFields]);
    try {
      await base44.entities.FormFieldDefinition.bulkUpdate(
        reordered.map((f, i) => ({ id: f.id, display_order: i, form_type: f.form_type, label: f.label, field_type: f.field_type }))
      );
    } catch (err) {
      toast({ title: "Reorder failed", description: err.message, variant: "destructive" });
    }
    refresh();
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Form fields</h2>
        <p className="text-sm text-muted-foreground">
          Add your own fields to a form. Definitions and answers are stored as data, not as new database columns.
        </p>
      </div>

      <Tabs value={formType} onValueChange={setFormType}>
        <TabsList className="mb-4">
          {FORM_TYPES.map((f) => <TabsTrigger key={f.value} value={f.value}>{f.label}</TabsTrigger>)}
        </TabsList>

        {FORM_TYPES.map((f) => (
          <TabsContent key={f.value} value={f.value} className="space-y-6">
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Built-in fields</p>
              <BuiltInList labels={BUILT_IN_FIELDS[f.value] || []} />
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custom fields</p>
                <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" />Add field</Button>
              </div>

              {isLoading ? (
                <div className="py-6 flex justify-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /></div>
              ) : activeFields.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No custom fields yet. Add one to extend this form.</p>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="custom-fields">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                        {activeFields.map((field, index) => (
                          <SortableFieldRow
                            key={field.id}
                            field={field}
                            index={index}
                            onEdit={openEdit}
                            onRetire={retireField}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </Card>

            {retiredFields.length > 0 && (
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Retired fields</p>
                <div className="space-y-1.5">
                  {retiredFields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Archive className="w-3.5 h-3.5" />{field.label}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{fieldTypeLabel(field.field_type)}</Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Retired fields stay on records that already answered them, marked “(retired)”.
                </p>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <FieldEditorDialog
        open={dialogOpen}
        field={editing}
        hasAnswers={hasAnswers}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSave={saveField}
      />
    </div>
  );
}