import React from "react";
import { Checkbox } from "@/components/ui/checkbox";

/** A scrollable multi-select used by the invite form (clients, houses, documents). */
export default function CheckboxPicker({ label, hint, items, selected, onToggle, emptyText }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground mb-1.5">{hint}</p>}
      <div className="max-h-36 overflow-y-auto rounded-md border divide-y">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground px-3 py-2">{emptyText || "Nothing to choose from yet."}</p>
        )}
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50"
          >
            <Checkbox checked={selected.includes(item.id)} onCheckedChange={() => onToggle(item.id)} />
            <span className="text-sm truncate">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}