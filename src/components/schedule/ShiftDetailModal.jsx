import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Repeat, Trash2, Pencil } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatTimeRange } from "./scheduleUtils";
import { cn } from "@/lib/utils";

const STATUSES = ["Scheduled", "In Progress", "Completed", "Missed", "Cancelled"];
const STATUS_COLORS = {
  Scheduled: "bg-blue-100 text-blue-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
  Missed: "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-600",
};

export default function ShiftDetailModal({ shift, conflictInfo, canEdit, onClose, onEdit, onDelete, serviceColor }) {
  const [status, setStatus] = useState(shift?.status || "Scheduled");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftSchedule.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shifts"] }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShiftSchedule.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shifts"] }); onClose(); },
  });

  const handleStatusUpdate = () => {
    updateMutation.mutate({ id: shift.id, data: { status } });
  };

  if (!shift) return null;

  const colorStyle = serviceColor ? { borderTop: `4px solid ${serviceColor.hex}` } : {};

  return (
    <Dialog open={!!shift} onOpenChange={onClose}>
      <DialogContent className="max-w-md" style={colorStyle}>
        <DialogHeader>
          <DialogTitle className="text-base">Shift Details</DialogTitle>
        </DialogHeader>

        {conflictInfo && (
          <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Scheduling conflict: {conflictInfo}</span>
          </div>
        )}

        <div className="space-y-3 text-sm">
          <Row label="Client" value={shift.client_name || "—"} />
          <Row label="Staff" value={shift.staff_name || "—"} />
          <Row label="Date" value={shift.date} />
          <Row label="Time" value={formatTimeRange(shift.start_time, shift.end_time)} />
          {shift.service_type && <Row label="Service" value={`${shift.service_type}${shift.service_code ? ` (${shift.service_code})` : ""}`} />}
          {shift.location && <Row label="Location" value={shift.location} />}
          {shift.notes && <Row label="Notes" value={shift.notes} />}

          {shift.recurring_series_id && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <Repeat className="w-3.5 h-3.5" />
              This is part of a recurring series.
            </div>
          )}

          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">Status</p>
            <div className="flex gap-2 items-center">
              <Select value={status} onValueChange={setStatus} disabled={!canEdit}>
                <SelectTrigger className="h-8 text-sm flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {canEdit && status !== shift.status && (
                <Button size="sm" onClick={handleStatusUpdate} disabled={updateMutation.isPending}>Save</Button>
              )}
            </div>
            <Badge className={cn("mt-2 text-xs", STATUS_COLORS[shift.status] || STATUS_COLORS.Scheduled)}>
              Current: {shift.status}
            </Badge>
          </div>
        </div>

        {canEdit && (
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(shift)}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
            {!confirmDelete ? (
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            ) : (
              <div className="flex gap-1 flex-1">
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => deleteMutation.mutate(shift.id)} disabled={deleteMutation.isPending}>
                  Confirm Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-20 flex-shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}