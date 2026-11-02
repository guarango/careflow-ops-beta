import React from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "grid", label: "Card view", Icon: LayoutGrid },
  { value: "list", label: "List view", Icon: List },
];

export default function ViewToggle({ value, onChange }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border p-1">
      {OPTIONS.map(({ value: optionValue, label, Icon }) => {
        const active = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => onChange(optionValue)}
            className={cn(
              "rounded p-1.5 transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}