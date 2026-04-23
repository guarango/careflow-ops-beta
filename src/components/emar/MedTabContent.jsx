import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowLeft } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

/**
 * Medication sub-tab content: Active / Discontinued pill tabs.
 * Props match what EMAR already passes to the inline medications section.
 */
export default function MedTabContent({ client, medications, canEdit, onAdd, onEdit, onAdminister }) {
  const [subTab, setSubTab] = useState("active"); // "active" | "discontinued"

  const activeMeds = medications.filter(m => m.status === "Active");
  const discontinuedMeds = medications
    .filter(m => m.status === "Discontinued")
    .sort((a, b) => {
      // Sort by end_date desc, then updated_date desc as fallback
      const da = a.end_date || a.updated_date || "";
      const db = b.end_date || b.updated_date || "";
      return db.localeCompare(da);
    });
  const recentlyDiscontinued = discontinuedMeds.slice(0, 3);

  const MedTable = ({ meds, showAdminister }) => (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Medication</TableHead>
              <TableHead>Dosage</TableHead>
              <TableHead className="hidden sm:table-cell">Frequency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meds.map(med => (
              <TableRow key={med.id} className={cn(med.status !== "Active" && "opacity-70")}>
                <TableCell className="font-medium text-sm">
                  {med.medication_name}
                  {med.is_controlled && (
                    <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-100 px-1 rounded">C2</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{med.dosage}</TableCell>
                <TableCell className="text-sm hidden sm:table-cell">{med.frequency}</TableCell>
                <TableCell><StatusBadge status={med.status || "Active"} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    {showAdminister && med.status === "Active" && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onAdminister(med)}>
                        Administer
                      </Button>
                    )}
                    {canEdit && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onEdit(med)}>
                        Edit
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Sub-tab pill toggle + Add button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 border border-border">
          <button
            onClick={() => setSubTab("active")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
              subTab === "active"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Active
            {activeMeds.length > 0 && (
              <span className={cn(
                "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
                subTab === "active" ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
              )}>
                {activeMeds.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSubTab("discontinued")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
              subTab === "discontinued"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Discontinued
            {discontinuedMeds.length > 0 && (
              <span className={cn(
                "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
                subTab === "discontinued" ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
              )}>
                {discontinuedMeds.length}
              </span>
            )}
          </button>
        </div>

        {canEdit && (
          <Button size="sm" onClick={() => onAdd(client)}>
            <Plus className="w-4 h-4 mr-1.5" />Add Medication
          </Button>
        )}
      </div>

      {/* ── ACTIVE SUB-TAB ──────────────────────────────────────── */}
      {subTab === "active" && (
        <div className="space-y-6">
          {/* Active Medications section */}
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">
              Active Medications
            </h3>
            {activeMeds.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4">No active medications on file.</p>
            ) : (
              <MedTable meds={activeMeds} showAdminister={true} />
            )}
          </div>

          {/* Recently Discontinued section — only if there are any */}
          {recentlyDiscontinued.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Recently Discontinued
              </h3>
              <MedTable meds={recentlyDiscontinued} showAdminister={false} />
              {discontinuedMeds.length > 0 && (
                <button
                  onClick={() => setSubTab("discontinued")}
                  className="mt-2 text-xs text-primary hover:underline font-medium"
                >
                  View all discontinued →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── DISCONTINUED SUB-TAB ───────────────────────────────── */}
      {subTab === "discontinued" && (
        <div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">
            Discontinued Medications
          </h3>
          {discontinuedMeds.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4">No discontinued medications on file.</p>
          ) : (
            <MedTable meds={discontinuedMeds} showAdminister={false} />
          )}
        </div>
      )}
    </div>
  );
}