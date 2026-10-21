import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer, Download, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";

const LOG_STATUSES = ["Administered", "Refused", "Held", "Not Available", "Missed"];

function MedRow({ med, log, onLogChange, isControlled, isPRN, isMissed, scheduledTime }) {
  const [qty, setQty] = useState(log?.qty || "1");
  const [notes, setNotes] = useState(log?.notes || "");
  const [temp, setTemp] = useState(log?.temp || "");
  const [signed, setSigned] = useState(!!log?.signed);
  const [status, setStatus] = useState(log?.status || "Administered");
  const [reason, setReason] = useState(log?.reason || "");
  const [prnReasonGiven, setPrnReasonGiven] = useState(log?.prn_reason_given || "");
  const { user } = useAuth();

  const needsReason = status !== "Administered";

  const handleSign = (checked) => {
    setSigned(checked);
    if (checked) {
      const fullName = user?.full_name || user?.email || "Staff";
      const initials = fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
      const now = new Date();
      const recordedTime = now.toTimeString().slice(0, 5);
      const recordedDate = now.toISOString().split("T")[0];

      // Check if late (30+ min after scheduled time)
      let isLate = false;
      if (scheduledTime) {
        const m = scheduledTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        if (m) {
          let h = parseInt(m[1]);
          const min = parseInt(m[2]);
          const ampm = m[3]?.toUpperCase();
          if (ampm === "PM" && h !== 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
          const schMin = h * 60 + min;
          const nowMin = now.getHours() * 60 + now.getMinutes();
          isLate = (nowMin - schMin) >= 30;
        }
      }

      onLogChange(med.id, {
        status, qty, notes, temp, reason, prn_reason_given: prnReasonGiven,
        signed: true,
        signed_by: fullName,
        signed_at: now.toISOString(),
        staff_initials: initials,
        time: recordedTime,
        date: recordedDate,
        is_late: isLate,
        review_status: needsReason ? "pending_review" : (isLate ? "pending_review" : null),
      });
    } else {
      onLogChange(med.id, { signed: false });
    }
  };

  return (
    <div className={cn(
      "border border-gray-200 p-4 bg-white",
      isMissed ? "rounded-b-xl bg-red-50 border-red-200" : "rounded-xl",
      !isMissed && isControlled && "border-l-4 border-l-red-400"
    )}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Signature checkbox */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-1">
          <label className="flex flex-col items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={signed}
              onChange={e => handleSign(e.target.checked)}
              className="w-5 h-5 accent-primary cursor-pointer"
            />
            <span className="text-[9px] text-gray-400 text-center leading-tight">Staff<br/>Sign</span>
          </label>
        </div>

        {/* Med details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-bold text-gray-900 text-sm">{med.medication_name}</span>
            {isControlled && (
              <span className="text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded uppercase tracking-wide">
                CONTROLLED
              </span>
            )}
            {isPRN && (
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded uppercase">PRN</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-gray-400 mb-1">Qty Admin</p>
              <Input
                value={qty}
                onChange={e => { setQty(e.target.value); onLogChange(med.id, { qty: e.target.value }); }}
                className="h-7 text-xs px-2 border-gray-200"
              />
            </div>
            <div>
              <p className="text-gray-400 mb-1">Qty/Unit</p>
              <p className="font-medium text-gray-700 pt-1">{med.dosage || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Status</p>
              <Select value={status} onValueChange={v => { setStatus(v); onLogChange(med.id, { status: v }); }}>
                <SelectTrigger className="h-7 text-xs border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOG_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Diagnosis</p>
              <p className="font-medium text-gray-700 pt-1 truncate">{med.diagnosis || "—"}</p>
            </div>
          </div>

          {med.instructions && (
            <p className="text-xs text-gray-500 mt-2 bg-gray-50 border border-gray-100 rounded px-2 py-1.5">
              <span className="font-semibold text-gray-600">Instructions: </span>{med.instructions}
            </p>
          )}

          {isPRN && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Reason for Giving *</Label>
                <Textarea
                  value={prnReasonGiven}
                  onChange={e => { setPrnReasonGiven(e.target.value); onLogChange(med.id, { prn_reason_given: e.target.value }); }}
                  rows={2}
                  placeholder="What prompted administering this PRN medication?"
                  className="text-xs border-gray-200 resize-none"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Temperature (if applicable)</Label>
                <Input
                  value={temp}
                  onChange={e => { setTemp(e.target.value); onLogChange(med.id, { temp: e.target.value }); }}
                  placeholder="98.6°F"
                  className="h-8 text-xs border-gray-200"
                />
              </div>
            </div>
          )}

          {needsReason && (
            <div className="mt-3">
              <Label className="text-xs text-gray-500 mb-1 block">Reason for {status} *</Label>
              <Textarea
                value={reason}
                onChange={e => { setReason(e.target.value); onLogChange(med.id, { reason: e.target.value }); }}
                rows={2}
                placeholder={`Explain why this medication was ${status.toLowerCase()}...`}
                className="text-xs border-gray-200 resize-none"
              />
            </div>
          )}

          {signed && (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-green-700 bg-green-50 border border-green-100 rounded px-2 py-1">
              <span>✓ Signed by {user?.full_name || user?.email || "Staff"} · {format(new Date(), "MM/dd/yyyy h:mm a")}</span>
            </div>
          )}
        </div>

        {/* Options dropdown placeholder */}
        <button type="button" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 pt-1">
          Options <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function isMissedWindow(timeLabel) {
  const TIME_HOURS = {
    "7:00 AM": 7, "Breakfast": 8, "8:00 AM": 8, "9:00 AM": 9,
    "10:00 AM": 10, "12:00 PM": 12, "2:00 PM": 14, "4:00 PM": 16,
    "Dinner": 18, "8:00 PM": 20, "9:00 PM": 21, "Bedtime": 21,
  };
  const windowHour = TIME_HOURS[timeLabel];
  if (windowHour == null) return false;
  return new Date().getHours() >= windowHour + 1;
}

export default function MARDetailView({ client, time, meds, date, allMeds, logs, onBack, onSave }) {
  const queryClient = useQueryClient();
  const [logMap, setLogMap] = useState({});

  const prnMeds = allMeds?.filter(m => m.client_id === client.id && m.is_prn && m.status === "Active") || [];
  const scheduledMeds = meds || [];

  const todayLogs = logs.filter(l => l.client_id === client.id && l.date === date);
  const windowIsMissed = isMissedWindow(time);

  const handleLogChange = (medId, data) => {
    setLogMap(p => ({ ...p, [medId]: { ...(p[medId] || {}), ...data } }));
  };

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicationLog.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["med-logs"] }),
  });

  const handleSave = async () => {
    for (const [medId, data] of Object.entries(logMap)) {
      if (!data.signed && !data.status) continue;
      const med = [...scheduledMeds, ...prnMeds].find(m => m.id === medId);
      if (!med) continue;
      await createLogMutation.mutateAsync({
        medication_id: medId,
        client_id: client.id,
        client_name: `${client.first_name} ${client.last_name}`,
        medication_name: med.medication_name,
        date: data.date || date,
        time: data.time || new Date().toTimeString().slice(0, 5),
        status: data.status || "Administered",
        notes: data.notes || "",
        reason: data.reason || "",
        prn_reason_given: data.prn_reason_given || "",
        administered_by_name: data.signed_by || "Staff",
        staff_initials: data.staff_initials || "",
        qty: data.qty || "1",
        signed: data.signed || false,
        signed_by: data.signed_by || "",
        signed_at: data.signed_at || "",
        is_late: data.is_late || false,
        review_status: data.review_status || null,
      });
    }
    onSave?.();
  };

  const displayDate = (() => {
    try { return format(new Date(date + "T12:00:00"), "MMMM d, yyyy"); } catch { return date; }
  })();

  return (
    <div className="bg-gray-50 min-h-full -m-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{time} — {displayDate}</h2>
            <p className="text-sm text-gray-500">{client.first_name} {client.last_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-gray-200" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-gray-200">
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Scheduled meds */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          Scheduled Medications
        </h3>
        {scheduledMeds.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No scheduled medications for this time window.</p>
        ) : (
          <div className="space-y-3">
            {scheduledMeds.map(med => {
              const hasExistingLog = todayLogs.some(l => l.medication_id === med.id);
              const isMissed = windowIsMissed && !hasExistingLog && !logMap[med.id]?.signed;
              return (
                <div key={med.id} className={cn(isMissed && "ring-2 ring-red-300 rounded-xl")}>
                  {isMissed && (
                    <div className="flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-t-xl">
                      <span>⚠</span>
                      <span>MISSED — Administration window has passed without a recorded signature</span>
                    </div>
                  )}
                  <MedRow
                    med={med}
                    log={logMap[med.id]}
                    onLogChange={handleLogChange}
                    isControlled={!!med.is_controlled}
                    isPRN={false}
                    isMissed={isMissed}
                    scheduledTime={time}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PRN meds */}
      {prnMeds.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            PRN Medications (As Needed)
          </h3>
          <div className="space-y-3">
            {prnMeds.map(med => (
              <MedRow
                key={med.id}
                med={med}
                log={logMap[med.id]}
                onLogChange={handleLogChange}
                isControlled={!!med.is_controlled}
                isPRN={true}
                scheduledTime={null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Previously administered today */}
      {todayLogs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
            Medications Previously Administered Today
          </h3>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs text-gray-500">Scheduled Time</TableHead>
                  <TableHead className="text-xs text-gray-500">Medication</TableHead>
                  <TableHead className="text-xs text-gray-500">Actual Time</TableHead>
                  <TableHead className="text-xs text-gray-500">Exception</TableHead>
                  <TableHead className="text-xs text-gray-500">Signature</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayLogs.map(l => (
                  <TableRow key={l.id} className="hover:bg-gray-50">
                    <TableCell className="text-xs text-gray-500">{time}</TableCell>
                    <TableCell className="text-xs font-medium">{l.medication_name}</TableCell>
                    <TableCell className="text-xs">{l.time || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {l.status !== "Administered" ? (
                        <span className="text-red-600 font-medium">{l.status}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {l.administered_by_name || "—"}
                      {l.created_date && (
                        <span className="block text-[10px] text-gray-400">
                          {(() => { try { return format(new Date(l.created_date), "MM/dd h:mm a"); } catch { return ""; } })()}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200">
        <Button onClick={handleSave} disabled={createLogMutation.isPending} className="px-6">
          {createLogMutation.isPending ? "Saving…" : "Save"}
        </Button>
        <Button variant="outline" onClick={handleSave} disabled={createLogMutation.isPending} className="border-gray-200">
          Save &amp; Refresh
        </Button>
        <Button variant="ghost" onClick={onBack} className="text-gray-500">
          Cancel
        </Button>
      </div>
    </div>
  );
}