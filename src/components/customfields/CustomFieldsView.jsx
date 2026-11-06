import React from "react";
import { Lock } from "lucide-react";
import { displayValue } from "@/lib/customFields";

/**
 * Read-only custom answers.
 * `restricted` is only passed for Admins — non-Admins never receive those answers.
 * mode="retired" shows only answers whose field has since been retired.
 */
export default function CustomFieldsView({ record, definitions = [], restricted = [], mode = "all" }) {
  const defsById = Object.fromEntries(definitions.map((d) => [d.id, d]));
  const rows = [];

  Object.entries(record?.custom_fields || {}).forEach(([id, answer]) => {
    const def = defsById[id];
    rows.push({
      id,
      label: def?.label || answer?.label || "Field",
      value: answer?.value,
      order: def ? def.display_order ?? 0 : 9999,
      retired: !def || def.active === false,
      adminOnly: false,
    });
  });

  restricted.forEach((r) => {
    const def = defsById[r.field_id];
    rows.push({
      id: r.field_id,
      label: def?.label || r.label || "Field",
      value: r.value,
      order: def ? def.display_order ?? 0 : 9999,
      retired: !def || def.active === false,
      adminOnly: true,
    });
  });

  const visible = rows
    .filter((r) => (mode === "retired" ? r.retired : true))
    .filter((r) => displayValue(r.value) !== "—")
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

  if (!visible.length) return null;

  return (
    <div className="space-y-2">
      {visible.map((row) => (
        <div key={`${row.id}-${row.adminOnly}`} className="py-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            {row.label}
            {row.adminOnly && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide"><Lock className="w-3 h-3" /> Admin only</span>
            )}
            {row.retired && <span className="text-[10px] uppercase tracking-wide text-amber-600">(retired)</span>}
          </span>
          <p className="text-sm whitespace-pre-wrap">{displayValue(row.value)}</p>
        </div>
      ))}
    </div>
  );
}