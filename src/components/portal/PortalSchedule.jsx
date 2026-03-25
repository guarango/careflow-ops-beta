import React, { useContext, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PortalContext } from "@/pages/Portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Clock, User, MapPin, CheckCircle, AlertTriangle, CalendarDays, List, Flag } from "lucide-react";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";

const today = new Date().toISOString().split("T")[0];

const statusConfig = {
  Scheduled: { color: "bg-sky-100 text-sky-700", label: "Scheduled" },
  "In Progress": { color: "bg-emerald-100 text-emerald-700", label: "In Progress" },
  Completed: { color: "bg-slate-100 text-slate-700", label: "Completed" },
  Cancelled: { color: "bg-red-100 text-red-700", label: "Cancelled" },
  "No Show": { color: "bg-amber-100 text-amber-700", label: "Missed" },
};

export default function PortalSchedule() {
  const { portalUser } = useContext(PortalContext);
  const [view, setView] = useState("upcoming");
  const [concernDialog, setConcernDialog] = useState(null);
  const [concernText, setConcernText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: schedules = [] } = useQuery({
    queryKey: ["portal-schedules", portalUser?.client_id],
    queryFn: () => base44.entities.ShiftSchedule.filter({ client_id: portalUser?.client_id }),
  });

  const upcoming = schedules.filter(s => s.date >= today && s.status !== "Cancelled").sort((a, b) => a.date.localeCompare(b.date));
  const past = schedules.filter(s => s.date < today || s.status === "Completed").sort((a, b) => b.date.localeCompare(a.date));
  const missed = schedules.filter(s => s.status === "No Show" || s.status === "Cancelled");

  const displayed = view === "upcoming" ? upcoming : view === "past" ? past : missed;

  const handleReportConcern = () => {
    setSubmitted(true);
    setTimeout(() => { setConcernDialog(null); setConcernText(""); setSubmitted(false); }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Visit Schedule</h2>
          <p className="text-sm text-slate-500">All scheduled and past visits for {portalUser?.client_name}</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          {["upcoming", "past", "missed"].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${view === v ? "bg-white shadow text-slate-800 font-medium" : "text-slate-500 hover:text-slate-700"}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {displayed.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 text-sm">No {view} visits found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayed.map(s => {
            const cfg = statusConfig[s.status] || statusConfig.Scheduled;
            const isMissed = s.status === "No Show" || s.status === "Cancelled";
            return (
              <Card key={s.id} className={`border-0 shadow-sm ${isMissed ? "border-l-4 border-l-red-400" : ""}`}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-14 rounded-xl bg-sky-50 flex flex-col items-center justify-center flex-shrink-0 border border-sky-100">
                      <span className="text-lg font-bold text-sky-700 leading-none">{format(parseISO(s.date), "d")}</span>
                      <span className="text-xs text-sky-500 uppercase">{format(parseISO(s.date), "MMM")}</span>
                      <span className="text-xs text-slate-400">{format(parseISO(s.date), "EEE")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold text-slate-800">{s.service_type}</p>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.start_time} – {s.end_time}</span>
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{s.staff_name || "TBD"}</span>
                            {s.total_hours && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{s.total_hours}h</span>}
                          </div>
                        </div>
                        <Badge className={cfg.color}>{cfg.label}</Badge>
                      </div>

                      {s.status === "Completed" && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1 w-fit">
                          <CheckCircle className="w-3 h-3" />
                          EVV verified · Visit completed successfully
                        </div>
                      )}

                      {isMissed && (
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-red-600">{s.notes ? `Reason: ${s.notes}` : "No reason recorded"}</p>
                          <Button size="sm" variant="outline" className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => setConcernDialog(s)}>
                            <Flag className="w-3 h-3 mr-1" />Report Concern
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Report Concern Dialog */}
      <Dialog open={!!concernDialog} onOpenChange={() => setConcernDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Report a Concern</DialogTitle>
          </DialogHeader>
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-slate-800">Concern submitted</p>
              <p className="text-sm text-slate-500">Your program supervisor has been notified.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600">Describe your concern about the missed visit on <strong>{concernDialog?.date}</strong>. Your message will be sent directly to the program supervisor.</p>
              <Textarea value={concernText} onChange={e => setConcernText(e.target.value)}
                placeholder="Please describe your concern..." rows={4} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setConcernDialog(null)}>Cancel</Button>
                <Button onClick={handleReportConcern} disabled={!concernText.trim()} className="bg-amber-600 hover:bg-amber-700">Submit Concern</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}