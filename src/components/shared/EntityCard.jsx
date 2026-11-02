import React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared card used by the Clients, Staff and Goals grids so every card has the
 * same height and the same internal arrangement:
 *   avatar band -> name -> subtitle -> badge row -> footer row
 */
export default function EntityCard({
  initials,
  photoUrl,
  colorClass,
  title,
  subtitle,
  badge,
  footer,
  onClick,
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm",
        onClick && "cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
      )}
    >
      {/* Avatar band */}
      <div className="flex h-24 shrink-0 items-center justify-center overflow-hidden bg-muted/40">
        {photoUrl ? (
          <img src={photoUrl} alt={title} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold",
              colorClass || "bg-primary/10 text-primary"
            )}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate text-sm font-semibold leading-tight text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        <div className="flex h-5 items-center overflow-hidden">{badge}</div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">{footer}</div>
      </div>
    </div>
  );
}