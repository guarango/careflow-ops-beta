import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, AlertTriangle, MapPinOff, Clock, FileEdit } from "lucide-react";
import { format } from "date-fns";
import { useAssignedClients } from "@/hooks/useAssignedClients";

const EXCEPTION_LABELS = {
  missed_punch: { label: "Missed Punch", icon: Clock, color: "text-orange-600 bg-orange-50 border-orange-200" },
  geofence_violation: { label: "Geofence Violation", icon: MapPinOff, color: "text-red-600 bg-red-50 border-red-200" },
  manual_entry: { label: "Manual Entry", icon: FileEdit, color: "text-blue-600 bg-blue-50 border-blue-200" },
};

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function EVVExceptions() {
  const { isCaseloadMode, teamStaffIds } = useAssignedClients();
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [action, setAction] = useState("approved");

  const { data: logs = [] } = useQuery({
    queryKey: ["evv-exceptions"],
    queryFn: () => base44.entities.EVVLog.filter({ exception_status: "pending" }, { sort: "-created_date", limit: 100 }),
  });

  const visibleLogs = isCaseloadMode && teamStaffIds?.length
    ? logs.filter(l => teamStaffIds.includes(l.staff_id))
    : logs;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EVVLog.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evv-exceptions"] }); queryClient.invalidateQueries({ queryKey: ["evv-logs"] }); setReviewing(null); },
  });

  const handleReview = () => {
    updateMutation.mutate({
      id: reviewing.id,
      data: { exception_status: action, reviewed_by: "", reviewed_at: new Date().toISOString(), review_notes: reviewNotes },
    });
    setReviewNotes("");
    setAction("approved");
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <p className="text-sm text-muted-foreground">{visibleLogs.length} pending exception{visibleLogs.length !== 1 ? "s" : ""} awaiting review</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Exception</TableHead>
                <TableHead className="hidden md:table-cell">Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLogs.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No pending exceptions.</TableCell></TableRow>
              )}
              {visibleLogs.map(log => {
                const exc = EXCEPTION_LABELS[log.exception_type] || EXCEPTION_LABELS.manual_entry;
                const Icon = exc.icon;
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm font-medium">{log.staff_name || "—"}</TableCell>
                    <TableCell className="text-sm">{log.client_name || "—"}</TableCell>
                    <TableCell className="text-sm">{log.date}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${exc.color}`}>
                        <Icon className="w-3 h-3" />{exc.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{log.reason_code || "—"}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[log.exception_status] || ""}>{log.exception_status}</Badge></TableCell>
                    <TableCell>
                      {log.exception_status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => { setReviewing(log); setReviewNotes(""); setAction("approved"); }}>Review</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {reviewing && (
        <Dialog open={!!reviewing} onOpenChange={() => setReviewing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Review EVV Exception</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p><span className="text-muted-foreground">Staff:</span> {reviewing.staff_name}</p>
                <p><span className="text-muted-foreground">Client:</span> {reviewing.client_name}</p>
                <p><span className="text-muted-foreground">Date:</span> {reviewing.date}</p>
                <p><span className="text-muted-foreground">Exception:</span> {EXCEPTION_LABELS[reviewing.exception_type]?.label || reviewing.exception_type}</p>
                <p><span className="text-muted-foreground">Reason:</span> {reviewing.reason_code || "—"}</p>
                {reviewing.geofence_distance_in != null && <p><span className="text-muted-foreground">Distance from geofence:</span> {Math.round(reviewing.geofence_distance_in)}m</p>}
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Review Notes</p>
                <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={3} placeholder="Add review notes..." />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={action === "approved" ? "default" : "outline"} onClick={() => setAction("approved")}><Check className="w-4 h-4 mr-1" />Approve</Button>
                <Button size="sm" variant={action === "rejected" ? "destructive" : "outline"} onClick={() => setAction("rejected")}><X className="w-4 h-4 mr-1" />Reject</Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewing(null)}>Cancel</Button>
              <Button onClick={handleReview} disabled={updateMutation.isPending}>{action === "approved" ? "Approve Exception" : "Reject Exception"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}