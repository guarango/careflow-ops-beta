import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, FileWarning, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";

export default function MedErrorReviewQueue({ visibleLogs }) {
  const queryClient = useQueryClient();
  const [reviewDialog, setReviewDialog] = useState(null); // { log, action: "review" | "convert" }
  const [followupText, setFollowupText] = useState("");

  const pendingLogs = visibleLogs.filter(l => l.review_status === "pending_review");

  const updateLogMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MedicationLog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["med-logs"] });
      setReviewDialog(null);
      setFollowupText("");
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ medicationLogId, followupNotes }) =>
      base44.functions.invoke("convertMedErrorToIncident", { medicationLogId, followupNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["med-logs"] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setReviewDialog(null);
      setFollowupText("");
    },
  });

  const handleMarkReviewed = () => {
    if (!reviewDialog?.log) return;
    updateLogMutation.mutate({
      id: reviewDialog.log.id,
      data: {
        review_status: "reviewed",
        review_followup: followupText,
        reviewed_at: new Date().toISOString(),
      },
    });
  };

  const handleConvert = () => {
    if (!reviewDialog?.log) return;
    convertMutation.mutate({
      medicationLogId: reviewDialog.log.id,
      followupNotes: followupText,
    });
  };

  if (pendingLogs.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No pending reviews"
        description="All medication errors have been reviewed."
      />
    );
  }

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="py-3 flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">{pendingLogs.length} medication error{pendingLogs.length !== 1 ? "s" : ""} pending review</span>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Medication</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingLogs.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.client_name || "—"}</TableCell>
                  <TableCell className="text-sm">{l.medication_name}</TableCell>
                  <TableCell className="text-sm">{l.date}</TableCell>
                  <TableCell className="text-sm">{l.time || "—"}</TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={l.reason}>{l.reason || "—"}</TableCell>
                  <TableCell className="text-sm">{l.administered_by_name || (l.system_generated ? "System" : "—")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setReviewDialog({ log: l, action: "review" }); setFollowupText(l.review_followup || ""); }}>
                        Review
                      </Button>
                      <Button size="sm" variant="outline" className="text-amber-600 border-amber-300" onClick={() => { setReviewDialog({ log: l, action: "convert" }); setFollowupText(l.review_followup || ""); }}>
                        <ArrowRightLeft className="w-3 h-3 mr-1" /> Incident
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!reviewDialog} onOpenChange={() => { setReviewDialog(null); setFollowupText(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.action === "convert" ? "Convert to Incident Report" : "Review Medication Error"}
            </DialogTitle>
          </DialogHeader>

          {reviewDialog?.log && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Client:</span><span className="font-medium">{reviewDialog.log.client_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Medication:</span><span className="font-medium">{reviewDialog.log.medication_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><StatusBadge status={reviewDialog.log.status} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date/Time:</span><span>{reviewDialog.log.date} {reviewDialog.log.time || ""}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Staff:</span><span>{reviewDialog.log.administered_by_name || (reviewDialog.log.system_generated ? "System-generated" : "—")}</span></div>
                {reviewDialog.log.reason && <div className="pt-1"><span className="text-muted-foreground">Reason:</span><p className="mt-1">{reviewDialog.log.reason}</p></div>}
                {reviewDialog.log.is_late && <Badge variant="outline" className="text-amber-600 border-amber-300">Late Pass</Badge>}
              </div>

              <div>
                <Label>Follow-up Notes</Label>
                <Textarea
                  value={followupText}
                  onChange={e => setFollowupText(e.target.value)}
                  rows={3}
                  placeholder="Document follow-up actions, coaching provided, corrective measures..."
                />
              </div>

              {reviewDialog.action === "convert" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    This will create an Incident Report from this medication error and mark it as converted.
                    The incident will appear in the Incidents page for further investigation.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewDialog(null); setFollowupText(""); }}>Cancel</Button>
            {reviewDialog?.action === "convert" ? (
              <Button onClick={handleConvert} disabled={convertMutation.isPending}>
                {convertMutation.isPending ? "Converting..." : "Convert to Incident"}
              </Button>
            ) : (
              <Button onClick={handleMarkReviewed} disabled={updateLogMutation.isPending}>
                {updateLogMutation.isPending ? "Saving..." : "Mark as Reviewed"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}