import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Upload } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700",
];
function getColorForClient(clientId) {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ClientMedDetail({ client, medications, logs, canEdit, onBack, onAdd, onEdit, onAdminister }) {
  const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase();
  const colorClass = getColorForClient(client.id);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Client.update(client.id, { photo_url: file_url });
      return file_url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      {/* Back nav */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to all clients
      </button>

      {/* Client header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            "w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0",
            !client.photo_url && colorClass
          )}>
            {client.photo_url ? (
              <img src={client.photo_url} alt={initials} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold">{initials}</span>
            )}
          </div>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                disabled={uploadPhotoMutation.isPending}
              >
                <Upload className="w-3 h-3" />
                {uploadPhotoMutation.isPending ? "Uploading..." : "Upload photo"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                className="hidden"
                onChange={e => e.target.files?.[0] && uploadPhotoMutation.mutate(e.target.files[0])}
              />
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground">{client.first_name} {client.last_name}</h2>
          {client.diagnosis && <p className="text-sm text-muted-foreground mt-0.5">{client.diagnosis}</p>}
          <p className="text-sm text-muted-foreground mt-1">
            {medications.filter(m => m.status === "Active").length} active medications
          </p>
        </div>

        {canEdit && (
          <Button size="sm" onClick={() => onAdd(client)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Medication
          </Button>
        )}
      </div>

      {/* Medications table */}
      {medications.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl py-12 text-center text-muted-foreground text-sm">
          No medications on file.
          {canEdit && (
            <button type="button" onClick={() => onAdd(client)} className="ml-2 text-primary hover:underline">
              + Add one
            </button>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Medication</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead className="hidden sm:table-cell">Frequency</TableHead>
                  <TableHead className="hidden md:table-cell">Schedule</TableHead>
                  <TableHead className="hidden lg:table-cell">Next Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medications.map(med => {
                  const times = (med.scheduled_times || []).join(", ");
                  const days = (med.schedule_days || []);
                  const scheduleStr = times
                    ? `${times}${days.length < 7 && days.length > 0 ? ` (${days.length}d/wk)` : ""}`
                    : "—";

                  // Next due: first scheduled time today not yet administered
                  const todayLogs = logs.filter(l => l.medication_id === med.id && l.date === today);
                  const administered = todayLogs.some(l => l.status === "Administered");
                  const nextDue = med.scheduled_times?.length > 0
                    ? (administered ? "Done today" : med.scheduled_times[0])
                    : "—";

                  return (
                    <TableRow key={med.id} className={cn(med.status !== "Active" && "opacity-60")}>
                      <TableCell className="font-medium text-sm">{med.medication_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{med.dosage}</TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">{med.frequency}</TableCell>
                      <TableCell className="text-xs hidden md:table-cell text-muted-foreground">{scheduleStr}</TableCell>
                      <TableCell className="text-xs hidden lg:table-cell">
                        <span className={cn(
                          "font-medium",
                          nextDue === "Done today" ? "text-green-600" : "text-foreground"
                        )}>
                          {nextDue}
                        </span>
                      </TableCell>
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
          </div>
        </div>
      )}
    </div>
  );
}