import React from "react";
import { STATUS_TABS, countByTab } from "@/lib/staffFilters";

/**
 * The one status filter both people screens use (Staff = HR view, Users = access view),
 * with the counts each tab holds — identical numbers on both screens.
 */
export default function StaffStatusFilter({ people, value, onChange }) {
  const counts = countByTab(people);

  return (
    <div className="flex flex-wrap items-center gap-1 p-1 bg-muted rounded-lg w-fit">
      {STATUS_TABS.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className={`text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>{counts[tab.key]}</span>
          </button>
        );
      })}
    </div>
  );
}