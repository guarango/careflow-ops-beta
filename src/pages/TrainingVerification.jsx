import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import { CheckCircle2, XCircle, Clock, FileText, Award, MessageSquare } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TrainingVerification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { role } = useRole();
  const [filter, setFilter] = useState("Completed");
  const [reviewItem, setReviewItem] = useState(null);
  const [returnNote, setReturnNote] = useState("");

  const { data: staffRecords = [] } = useQuery({
    queryKey: ["all-staff"],
    queryFn: () => base44.entities.StaffMember.filter({ status: "Active" }),
  });
  const staffList = staffRecords.items || staffRecords;

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["training-verify", filter],
    queryFn: () => base44.entities.TrainingAssignment.filter({ status: filter, is_external: { $ne: true } }),
  });
  const allItems = assignments.items || assignments;

  // For managers, filter to team
  const { data: teamStaff = [] } = useQuery({
    queryKey: ["team-staff"],
    queryFn: () => base44.entities.StaffMember.filter({ status: "Active" }),
    enabled: role === "manager",
  });
  const teamIds = (teamStaff.items || teamStaff).map(s => s.id);

  const visibleItems = role === "manager"
    ? allItems.filter(a => teamIds.includes(a.staff_id))
    : allItems;

  const { data: extItems = [] } = useQuery({
    queryKey: ["training-verify-ext", filter],
    queryFn: () => base44.entities.TrainingAssignment.filter({ status: filter, is_external: true }),
  });
  const externalItems = extItems.items || extItems;
  const visibleExt = role === "manager"
    ? externalItems.filter(a => teamIds.includes(a.staff_id))
    : externalItems;

  const verifyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingAssignment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-verify"] });
      queryClient.invalidateQueries({ queryKey: ["training-verify-ext"] });
      toast.success("Training verified");
      setReviewItem(null);
      setReturnNote("");
    },
  });

  const handleVerify = (item) => {
    verifyMutation.mutate({
      id: item.id,
      data: {
        status: "Verified",
        verified_by: user?.id,
        verified_by_name: user?.full_name,
        verified_at: new Date().toISOString(),
      },
    });
  };

  const handleReturn = (item) => {
    verifyMutation.mutate({
      id: item.id,
      data: {
        status: "Returned",
        return_note: returnNote,
        verified_by: user?.id,
        verified_by_name: user?.full_name,
        verified_at: new Date().toISOString(),
      },
    });
  };

  const combined = [...visibleItems, ...visibleExt];

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-bold">Awaiting Verification</h1>
        <p className="text-sm text-muted-foreground">Review completed trainings and external training logs</p>
      </div>

      <div className="flex gap-2">
        {["Completed", "Verified", "Returned", "Assigned", "In Progress"].map(s => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
            {s}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : combined.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No trainings to review.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {combined.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.is_external ? (
                      <Award className="w-4 h-4 text-blue-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-primary" />
                    )}
                    <p className="font-semibold truncate">
                      {item.is_external ? item.external_title : item.training_title}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.staff_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.hours_awarded || 0} hrs</span>
                    {item.completed_at && (
                      <span>Completed {format(parseISO(item.completed_at), "MMM d, yyyy")}</span>
                    )}
                    {item.is_external && item.external_provider && (
                      <span>· {item.external_provider}</span>
                    )}
                  </div>
                  {item.status === "Returned" && item.return_note && (
                    <p className="text-xs text-red-600 mt-1">Returned: {item.return_note}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === "Completed" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { setReviewItem(item); setReturnNote(""); }}>
                        <MessageSquare className="w-3.5 h-3.5 mr-1" /> Review
                      </Button>
                      <Button size="sm" onClick={() => handleVerify(item)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verify
                      </Button>
                    </>
                  )}
                  {item.status === "Verified" && (
                    <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded-full">Verified</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!reviewItem} onOpenChange={() => setReviewItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review: {reviewItem?.is_external ? reviewItem.external_title : reviewItem?.training_title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="text-sm">
              <p><strong>Staff:</strong> {reviewItem?.staff_name}</p>
              <p><strong>Hours:</strong> {reviewItem?.hours_awarded || 0}</p>
              <p><strong>Completed:</strong> {reviewItem?.completed_at ? format(parseISO(reviewItem.completed_at), "MMM d, yyyy") : "—"}</p>
            </div>

            {reviewItem?.is_external && reviewItem?.certificate_uri && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Certificate</p>
                <a href={reviewItem.certificate_uri} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-primary underline">View certificate</a>
              </div>
            )}

            {reviewItem?.responses?.filter(r => r.answer).length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Written Responses & Assessment Results</p>
                {reviewItem.responses.filter(r => r.answer).map((r, i) => (
                  <div key={i} className="border rounded p-3 space-y-1">
                    <p className="text-sm font-medium">{r.question}</p>
                    <p className="text-sm text-muted-foreground">{r.answer}</p>
                    {r.assessment_correct !== undefined && r.assessment_correct !== null && (
                      <p className={cn("text-xs font-medium", r.assessment_correct ? "text-green-600" : "text-red-600")}>
                        {r.assessment_correct ? "✓ Correct" : "✗ Incorrect"} ({r.attempts || 0} attempts)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Return note (if returning)</p>
              <Textarea value={returnNote} onChange={e => setReturnNote(e.target.value)}
                rows={2} placeholder="Reason for returning..." />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => handleReturn(reviewItem)} disabled={!returnNote.trim() || verifyMutation.isPending}>
              <XCircle className="w-4 h-4 mr-1" /> Return
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setReviewItem(null)}>Cancel</Button>
              <Button onClick={() => handleVerify(reviewItem)} disabled={verifyMutation.isPending}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Verify
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}