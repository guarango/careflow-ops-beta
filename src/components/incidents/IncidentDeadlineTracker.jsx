import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Clock, AlertTriangle, Calendar } from "lucide-react";
import { format, differenceInHours, differenceInBusinessDays, isPast } from "date-fns";

function DeadlineItem({ icon: Icon, title, subtitle, deadline, done, doneAt, canEdit, onRecord, children }) {
  const isOverdue = deadline && !done && isPast(deadline);
  const color = done ? "text-emerald-600 bg-emerald-50 border-emerald-200" : isOverdue ? "text-red-600 bg-red-50 border-red-200" : "text-amber-600 bg-amber-50 border-amber-200";
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="flex items-start gap-3">
        {done ? <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" /> : isOverdue ? <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" /> : <Icon className="w-5 h-5 mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && <p className="text-xs opacity-80">{subtitle}</p>}
          {deadline && !done && <p className="text-xs mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />Due {format(deadline, "MMM d, h:mm a")}{isOverdue && " — OVERDUE"}</p>}
          {done && doneAt && <p className="text-xs mt-1">Completed {format(new Date(doneAt), "MMM d, h:mm a")}</p>}
          {done && !doneAt && <p className="text-xs mt-1">Completed</p>}
          {canEdit && !done && children}
        </div>
      </div>
    </div>
  );
}

export default function IncidentDeadlineTracker({ incident, onUpdate, canEdit }) {
  const [showDspdForm, setShowDspdForm] = useState(false);
  const [dspdDate, setDspdDate] = useState("");
  const [dspdConf, setDspdConf] = useState("");

  const incidentDateTime = incident.date && incident.time ? new Date(`${incident.date}T${incident.time}`) : incident.date ? new Date(incident.date) : new Date();
  const oneBusinessDay = new Date(incidentDateTime.getTime() + 24 * 60 * 60 * 1000); // 1 calendar day as proxy for 1 business day
  const twentyFourHrs = new Date(incidentDateTime.getTime() + 24 * 60 * 60 * 1000);

  const isAbuseNeglectExploitation = ["Abuse", "Neglect", "Exploitation"].includes(incident.type);

  const recordNow = (field) => onUpdate({ [field]: new Date().toISOString() });

  const submitDspd = () => {
    if (!dspdDate || !dspdConf) return;
    onUpdate({ dspd_reported_date: dspdDate, dspd_confirmation_number: dspdConf });
    setShowDspdForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Calendar className="w-4 h-4" />
        Incident occurred {format(incidentDateTime, "MMM d, yyyy 'at' h:mm a")}
      </div>

      <DeadlineItem icon={Calendar} title="Reported to DSPD Online System" subtitle="Within 1 business day" deadline={oneBusinessDay}
        done={!!incident.dspd_reported_date} doneAt={incident.dspd_reported_date} canEdit={canEdit}>
        {!showDspdForm ? (
          <Button size="sm" variant="outline" className="mt-2" onClick={() => { setShowDspdForm(true); setDspdDate(format(new Date(), "yyyy-MM-dd")); }}>Record Report</Button>
        ) : (
          <div className="mt-2 space-y-2">
            <div><Label className="text-xs">Date Reported</Label><Input type="date" value={dspdDate} onChange={(e) => setDspdDate(e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Confirmation Number</Label><Input value={dspdConf} onChange={(e) => setDspdConf(e.target.value)} className="h-8 text-sm" placeholder="DSPD confirmation #" /></div>
            <Button size="sm" onClick={submitDspd} disabled={!dspdDate || !dspdConf}>Save</Button>
          </div>
        )}
        {incident.dspd_confirmation_number && <p className="text-xs mt-1">Confirmation #: {incident.dspd_confirmation_number}</p>}
      </DeadlineItem>

      <DeadlineItem icon={Clock} title="Parent / Guardian Notified" subtitle="Within 24 hours" deadline={twentyFourHrs}
        done={!!incident.guardian_notified_at} doneAt={incident.guardian_notified_at} canEdit={canEdit}>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => recordNow("guardian_notified_at")}>Mark Notified</Button>
      </DeadlineItem>

      <DeadlineItem icon={Clock} title="Support Coordinator Notified"
        done={!!incident.support_coordinator_notified_at} doneAt={incident.support_coordinator_notified_at} canEdit={canEdit}>
        <Button size="sm" variant="outline" className="mt-2" onClick={() => recordNow("support_coordinator_notified_at")}>Mark Notified</Button>
      </DeadlineItem>

      {isAbuseNeglectExploitation && (
        <DeadlineItem icon={AlertTriangle} title={`Reported to ${incident.aps_dcfs_reported_to || "APS/DCFS"}`} subtitle="Abuse, neglect, or exploitation must be reported to APS (adults) or DCFS (minors)"
          done={!!incident.aps_dcfs_reported_at} doneAt={incident.aps_dcfs_reported_at} canEdit={canEdit}>
          <div className="mt-2 space-y-2">
            <select className="h-8 text-sm rounded border px-2 w-full" value={incident.aps_dcfs_reported_to || ""} onChange={(e) => onUpdate({ aps_dcfs_reported_to: e.target.value })}>
              <option value="">Select APS or DCFS...</option>
              <option value="APS">APS (Adult)</option>
              <option value="DCFS">DCFS (Minor)</option>
            </select>
            <Button size="sm" onClick={() => recordNow("aps_dcfs_reported_at")} disabled={!incident.aps_dcfs_reported_to}>Mark Reported</Button>
          </div>
        </DeadlineItem>
      )}

      {(isAbuseNeglectExploitation || incident.law_enforcement_involved) && (
        <DeadlineItem icon={AlertTriangle} title="Reported to Law Enforcement"
          done={!!incident.law_enforcement_reported_at} doneAt={incident.law_enforcement_reported_at} canEdit={canEdit}>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => recordNow("law_enforcement_reported_at")}>Mark Reported</Button>
        </DeadlineItem>
      )}
    </div>
  );
}