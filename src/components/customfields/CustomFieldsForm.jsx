import React from "react";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import CustomFieldInput from "./CustomFieldInput";
import { activeFields } from "@/lib/customFields";

/**
 * Admin-defined fields rendered below a form's built-in fields.
 * Admin-only fields are only ever rendered for an Admin.
 */
export default function CustomFieldsForm({ definitions, values, onChange, isAdmin }) {
  const fields = activeFields(definitions).filter((d) => isAdmin || !d.admin_only);
  if (!fields.length) return null;

  return (
    <>
      {fields.map((field) => (
        <div key={field.id} className={field.field_type === "long_text" ? "sm:col-span-2" : ""}>
          <Label className="text-sm flex items-center gap-1.5">
            {field.label}
            {field.required && " *"}
            {field.admin_only && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <Lock className="w-3 h-3" /> Admin only
              </span>
            )}
          </Label>
          <CustomFieldInput field={field} value={values?.[field.id]} onChange={(v) => onChange(field.id, v)} />
          {field.help_text && field.field_type !== "long_text" && field.field_type !== "short_text" && (
            <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
          )}
        </div>
      ))}
    </>
  );
}