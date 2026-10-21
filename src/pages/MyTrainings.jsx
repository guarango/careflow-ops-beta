import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, differenceInDays, parseISO } from "date-fns";
import { Clock, CheckCircle2, AlertCircle, BookOpen, Play, Award, Upload } from "lucide-react";
import TakeTraining from "@/components/training/TakeTraining";
import LogExternalTrainingDialog from "@/components/training/LogExternalTrainingDialog";
import { cn } from "@/lib/utils";

export default function MyTrainings() {
  const { user } = useAuth();
  const [activeAssignmentId, setActiveAssignmentId] = useState(null);
  const [showLogExternal, setShowLogExternal] = useState(false);

  const { data: staffRecords = [] } = useQuery({
    queryKey: ["staff-me", user?.email],
    queryFn: () => base44.entities.StaffMember.filter({ email: user.email }),
    enabled: !!user?.email,
  });
  const staffRecord = staffRecords[0];

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["my-training-assignments", staffRecord?.id],
    queryFn: () => base44.entities.TrainingAssignment.filter({ staff_id: staffRecord?.id }),
    enabled: !!staffRecord?.id,
  });
  const myAssignments = assignments.items || assignments;

  const { data: trainings = [] } = useQuery({
    queryKey: ["all-trainings"],
    queryFn: () => base44.entities.Training.filter({ status: "Published" }),
  });
  const trainingList = trainings.items || trainings;

  const activeAssignment = myAssignments.find(a => a.id === activeAssignmentId);
  const trainingForActive = activeAssignment ? trainingList.find(t => t.id === activeAssignment.training_id) : null;

  if (activeAssignment && trainingForActive) {
    return (
      <TakeTraining
        assignment={activeAssignment}
        training={trainingForActive}
        onExit={() => setActiveAssignmentId(null)}
      />
    );
  }

  const sorted = [...myAssignments].sort((a, b) => {
    if (a.status === "Verified" && b.status !== "Verified") return 1;
    if (b.status === "Verified" && a.status !== "Verified") return -1;
    return (a.due_date || "9999").localeCompare(b.due_date || "9999");
  });

  return (
    <div className="space-y-5 max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">My Trainings</h1>
          <p className="text-sm text-muted-foreground">Assigned trainings and your progress</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowLogExternal(true)}>
          <Upload className="w-4 h-4 mr-1" /> Log External Training
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No trainings assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(a => {
            const isOverdue = a.due_date && a.status !== "Verified" && a.status !== "Completed" &&
              differenceInDays(parseISO(a.due_date), new Date()) < 0;
            return (
              <Card key={a.id} className={cn(isOverdue && "border-red-300")}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {a.is_external ? a.external_title : a.training_title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {a.is_external ? (
                        <span className="flex items-center gap-1"><Award className="w-3 h-3" /> External · {a.external_provider}</span>
                      ) : (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {a.hours_awarded || 0} hrs</span>
                      )}
                      {a.due_date && (
                        <span className={cn("flex items-center gap-1", isOverdue && "text-red-600 font-medium")}>
                          {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          Due {format(parseISO(a.due_date), "MMM d, yyyy")}
                        </span>
                      )}
                      {a.progress_pct > 0 && a.status === "In Progress" && (
                        <span>{a.progress_pct}% complete</span>
                      )}
                    </div>
                    {a.status === "Returned" && a.return_note && (
                      <p className="text-xs text-red-600 mt-1">Returned: {a.return_note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={a.status} />
                    {(a.status === "Assigned" || a.status === "In Progress" || a.status === "Returned") && !a.is_external && (
                      <Button size="sm" onClick={() => setActiveAssignmentId(a.id)}>
                        <Play className="w-3.5 h-3.5 mr-1" /> {a.progress_pct > 0 ? "Resume" : "Start"}
                      </Button>
                    )}
                    {a.status === "Verified" && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <LogExternalTrainingDialog
        open={showLogExternal}
        onClose={() => setShowLogExternal(false)}
        staffId={staffRecord?.id}
        staffName={staffRecord ? `${staffRecord.first_name} ${staffRecord.last_name}` : ""}
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    "Assigned": "bg-blue-100 text-blue-700",
    "In Progress": "bg-amber-100 text-amber-700",
    "Completed": "bg-purple-100 text-purple-700",
    "Verified": "bg-green-100 text-green-700",
    "Returned": "bg-red-100 text-red-700",
  };
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", styles[status] || "bg-gray-100 text-gray-600")}>
      {status}
    </span>
  );
}