import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Clock, Circle, Award } from "lucide-react";
import { getEffectiveStatus, daysUntilExpiry } from "@/lib/trainingEngine";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  Completed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  Expired: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  Failed: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  "In Progress": { icon: Clock, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  "Not Started": { icon: Circle, color: "text-slate-400", bg: "bg-white border-border" },
};

const BLOCK_COLORS = {
  "Hard Block": "bg-red-100 text-red-700",
  "Soft Block": "bg-amber-100 text-amber-700",
  "Alert Only": "bg-blue-100 text-blue-700",
};

export default function TrainingRecordList({ trainings, records, onLogTraining, onCheckoff, showCertDetails }) {
  const recordsByTrainingId = {};
  records.forEach(r => { recordsByTrainingId[r.training_id] = r; });

  if (trainings.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-8 border-dashed border-2 border-border rounded-xl">No trainings in this category.</p>
  );

  return (
    <div className="space-y-2">
      {trainings.map((training, i) => {
        const record = recordsByTrainingId[training.id];
        const status = getEffectiveStatus(record);
        const cfg = STATUS_STYLES[status] || STATUS_STYLES["Not Started"];
        const Icon = cfg.icon;
        const days = record?.expiration_date ? daysUntilExpiry(record.expiration_date) : null;
        const expiringSoon = days !== null && days >= 0 && days <= 90;
        const expiredNow = days !== null && days < 0;

        return (
          <div key={i} className={cn("border rounded-xl p-3 flex items-start justify-between gap-3", cfg.bg)}>
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{training.title}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {training.frequency && <span className="text-[10px] text-muted-foreground">{training.frequency}</span>}
                  {training.scheduling_block && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${BLOCK_COLORS[training.scheduling_block] || ""}`}>{training.scheduling_block}</span>
                  )}
                  {training.has_competency_checkoff && <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">Competency check-off required</span>}
                </div>
                {record && (
                  <div className="mt-1 text-[10px] text-muted-foreground space-x-2">
                    {record.completed_date && <span>Completed: {record.completed_date}</span>}
                    {record.expiration_date && (
                      <span className={expiredNow ? "text-red-600 font-semibold" : expiringSoon ? "text-amber-600 font-semibold" : ""}>
                        {expiredNow ? `Expired ${record.expiration_date}` : `Expires: ${record.expiration_date}${expiringSoon ? ` (${days}d)` : ""}`}
                      </span>
                    )}
                    {record.verified_by && <span>Verified by: {record.verified_by}</span>}
                    {record.score != null && <span>Score: {record.score}%</span>}
                    {showCertDetails && record.certification_number && <span>Cert #: {record.certification_number}</span>}
                    {showCertDetails && record.issuing_organization && <span>Issued by: {record.issuing_organization}</span>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {training.has_competency_checkoff && record && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onCheckoff(record)}>Check-off</Button>
              )}
              <Button size="sm" variant={status === "Not Started" ? "default" : "outline"} className="h-7 text-xs" onClick={() => onLogTraining(training)}>
                {status === "Not Started" ? "Log" : "Update"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}