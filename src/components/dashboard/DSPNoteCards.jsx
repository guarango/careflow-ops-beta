import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotebookPen, Play, Square, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  missingElements,
  activePcsp,
  planServiceCodes,
  planRequiresDailyNote,
  isLateNote,
  DEFAULT_LATE_HOURS,
} from "@/lib/serviceNote";
import toast from "react-hot-toast";

/**
 * DSP shift screen: one card per person on shift. The big control starts or stops
 * the service time; the red dots are the required elements still missing.
 */
export default function DSPNoteCards({ user, staffRecord, myShifts = [], clients = [] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const nowTime = () => format(new Date(), "HH:mm");

  const { data: todayNotes = [] } = useQuery({
    queryKey: ["session-notes-today", todayStr],
    queryFn: () => base44.entities.SessionNote.filter({ date: todayStr }),
    enabled: !!user?.id,
  });
  const { data: serviceCodes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["isp-plans"],
    queryFn: () => base44.entities.ISPlan.list(),
  });
  const { data: agencies = [] } = useQuery({
    queryKey: ["agency-settings"],
    queryFn: () => base44.entities.Agency.list(),
  });
  const lateHours = agencies[0]?.service_note_late_hours ?? DEFAULT_LATE_HOURS;

  const myNotes = todayNotes.filter(n => n.staff_id === user?.id || n.staff_name === user?.full_name);

  const peopleOnShift = useMemo(() => {
    const ids = [];
    for (const s of myShifts) {
      if (s.client_id && !ids.includes(s.client_id)) ids.push(s.client_id);
    }
    if (ids.length) return ids.map(id => clients.find(c => c.id === id)).filter(Boolean);
    const assigned = staffRecord?.assigned_client_ids || [];
    return clients.filter(c => assigned.includes(c.id) && (c.status === "Active" || !c.status));
  }, [myShifts, clients, staffRecord]);

  const codesFor = (client, dateISO) => {
    const pcsp = activePcsp(plans, client.id);
    if (pcsp) return planServiceCodes(pcsp, serviceCodes, dateISO);
    return serviceCodes.filter(c => c.active !== false && c.daily_note_required !== false);
  };

  const startNote = async (client) => {
    setBusy(client.id);
    try {
      const shift = myShifts.find(s => s.client_id === client.id);
      const eligible = codesFor(client, todayStr);
      const preCode = eligible.find(c => c.id === shift?.service_code_id)
        || eligible.find(c => String(c.code || "").toUpperCase() === String(shift?.service_code || "").toUpperCase())
        || null;
      const created = await base44.entities.SessionNote.create({
        client_id: client.id,
        client_name: `${client.first_name} ${client.last_name}`,
        staff_id: user?.id || "",
        staff_name: user?.full_name || "",
        shift_id: shift?.id || "",
        service_code_id: preCode?.id || "",
        service_code: preCode?.code || "",
        date: todayStr,
        start_time: nowTime(),
        status: "Draft",
      });
      queryClient.invalidateQueries({ queryKey: ["session-notes-today"] });
      queryClient.invalidateQueries({ queryKey: ["session-notes"] });
      navigate(`/session-notes?client=${client.id}&note=${created.id}`);
    } catch (e) {
      toast.error(e?.message || "Could not start the note.");
    } finally {
      setBusy(null);
    }
  };

  const stopNote = async (client, note) => {
    setBusy(client.id);
    try {
      await base44.entities.SessionNote.update(note.id, { end_time: nowTime() });
      queryClient.invalidateQueries({ queryKey: ["session-notes-today"] });
      queryClient.invalidateQueries({ queryKey: ["session-notes"] });
      navigate(`/session-notes?client=${client.id}&note=${note.id}`);
    } catch (e) {
      toast.error(e?.message || "Could not stop the note.");
    } finally {
      setBusy(null);
    }
  };

  if (peopleOnShift.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <NotebookPen className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Service Notes Today</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {peopleOnShift.map((client) => {
          const note = myNotes.find(n => n.client_id === client.id && n.status !== "Cancelled") || null;
          const shift = myShifts.find(s => s.client_id === client.id);
          const noteNeeded = planRequiresDailyNote(activePcsp(plans, client.id), serviceCodes);
          const code = note
            ? serviceCodes.find(c => c.id === note.service_code_id)
            : codesFor(client, todayStr).find(c => c.id === shift?.service_code_id)
              || codesFor(client, todayStr).find(c => String(c.code || "").toUpperCase() === String(shift?.service_code || "").toUpperCase());
          const missing = note ? missingElements(note, { code }) : [];
          const late = note && isLateNote(note, lateHours);
          const running = note && note.start_time && !note.end_time && (note.status === "Draft" || note.status === "Returned");
          const done = note && (note.status === "Submitted" || note.status === "Approved");
          const isBusy = busy === client.id;

          return (
            <Card key={client.id} className={cn("overflow-hidden", running && "border-green-300", done && "border-emerald-200 bg-emerald-50/30")}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{client.first_name} {client.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {shift ? `${shift.start_time || ""}–${shift.end_time || ""}` : "No shift today"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                      code ? "bg-primary/10 text-primary" : "bg-red-50 text-red-700 border border-red-200"
                    )}
                  >
                    {code ? code.code : "No code"}
                  </span>
                </div>

                {!noteNeeded ? (
                  <div className="rounded-lg bg-muted/50 border border-border px-3 py-2.5 text-center">
                    <p className="text-xs font-medium text-muted-foreground">No daily note required for this plan</p>
                  </div>
                ) : !note ? (
                  <Button
                    onClick={() => startNote(client)}
                    disabled={isBusy}
                    className="w-full h-11 gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold"
                  >
                    <Play className="w-4 h-4" />{isBusy ? "Starting…" : "Start note"}
                  </Button>
                ) : running ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Started {note.start_time}</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => stopNote(client, note)}
                        disabled={isBusy}
                        className="flex-1 h-11 gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        <Square className="w-4 h-4" />{isBusy ? "Stopping…" : "Stop"}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 px-3"
                        onClick={() => navigate(`/session-notes?client=${client.id}&note=${note.id}`)}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/session-notes?client=${client.id}&note=${note.id}`)}
                    className="w-full h-11 gap-2 font-semibold"
                  >
                    {done ? (note.status === "Approved" ? "Approved — view note" : "Submitted — view note") : "Finish note"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}

                {note && (
                  <div className="flex items-start gap-2 flex-wrap">
                    {missing.length === 0 ? (
                      <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />All required elements complete
                      </span>
                    ) : (
                      missing.map((m) => (
                        <span key={m.key} className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
                          <span className="w-2 h-2 rounded-full bg-red-500" />{m.label}
                        </span>
                      ))
                    )}
                    {late && (
                      <span className="flex items-center gap-1 text-[11px] text-red-600 font-bold">
                        <AlertTriangle className="w-3 h-3" />Late entry
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}