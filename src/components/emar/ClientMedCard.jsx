import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

export default function ClientMedCard({ client, medications, canEdit, onAdd, onEdit, onAdminister, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const activeMeds = medications.filter(m => m.status === "Active").length;

  const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase();

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Card Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold leading-tight">{client.first_name} {client.last_name}</p>
            <p className="text-xs text-muted-foreground">
              {medications.length === 0
                ? "No medications"
                : `${activeMeds} active · ${medications.length} total`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {client.status !== "Active" && (
            <Badge variant="outline" className="text-xs text-muted-foreground">{client.status}</Badge>
          )}
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded Content */}
      {open && (
        <div className="border-t border-border">
          {medications.length === 0 ? (
            <div className="px-4 py-5 flex items-center justify-between text-sm text-muted-foreground">
              <span>No medications on file</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onAdd(client)}
                  className="text-primary text-xs flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add medication
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Medication</TableHead>
                    <TableHead className="text-xs">Dosage</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Frequency</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Schedule</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medications.map(med => {
                    const times = (med.scheduled_times || []).join(", ");
                    const days = (med.schedule_days || []);
                    const scheduleStr = times
                      ? `${times}${days.length < 7 && days.length > 0 ? ` (${days.length}d/wk)` : ""}`
                      : "—";
                    return (
                      <TableRow key={med.id} className={cn(med.status !== "Active" && "opacity-60")}>
                        <TableCell className="font-medium text-sm">{med.medication_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{med.dosage}</TableCell>
                        <TableCell className="text-sm hidden sm:table-cell">{med.frequency}</TableCell>
                        <TableCell className="text-xs hidden md:table-cell text-muted-foreground">{scheduleStr}</TableCell>
                        <TableCell><StatusBadge status={med.status || "Active"} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {med.status === "Active" && (
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
                    );
                  })}
                </TableBody>
              </Table>
              {canEdit && (
                <div className="px-4 py-2 border-t border-border/50 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onAdd(client)}
                    className="text-primary text-xs flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Add medication
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}