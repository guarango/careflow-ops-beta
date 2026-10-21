import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Repeat, Trash2, Pencil, LogIn, LogOut, Clock, MapPin, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatTimeRange } from "./scheduleUtils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import DictationButton from "@/components/shared/DictationButton";
import MissedGoalsDialog from "@/components/goals/MissedGoalsDialog";

const STATUSES = ["Scheduled", "In Progress", "Completed", "Missed", "Cancelled"];
const STATUS_COLORS = {
  Scheduled: "bg-blue-100 text-blue-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
  Missed: "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-600",
};

function haversineMeters(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R = 6371e3;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ShiftDetailModal({ shift, conflictInfo, canEdit, onClose, onEdit, onDelete, serviceColor, houses = [], agency, serviceCodes = [] }) {
  const [status, setStatus] = useState(shift?.status || "Scheduled");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shiftNotes, setShiftNotes] = useState(shift?.notes || "");
  const [showMissedGoals, setShowMissedGoals] = useState(false);
  const [gpsCapturing, setGpsCapturing] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [evvLogId, setEvvLogId] = useState(shift?.evv_log_id || "");
  const [geofenceResult, setGeofenceResult] = useState(null);
  const [showExceptionReason, setShowExceptionReason] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [pendingClockAction, setPendingClockAction] = useState(null);
  const queryClient = useQueryClient();

  const { data: clientGoals = [] } = useQuery({
    queryKey: ["client-goals", shift?.client_id],
    queryFn: () => base44.entities.ClientGoal.filter({ client_id: shift?.client_id, status: "Active" }),
    enabled: !!shift?.client_id && showMissedGoals,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftSchedule.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shifts"] }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShiftSchedule.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shifts"] }); onClose(); },
  });
  const createEvvLogMutation = useMutation({
    mutationFn: (data) => base44.entities.EVVLog.create(data),
    onSuccess: (log) => { setEvvLogId(log.id); queryClient.invalidateQueries({ queryKey: ["evv-logs"] }); queryClient.invalidateQueries({ queryKey: ["evv-exceptions"] }); },
  });
  const updateEvvLogMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EVVLog.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evv-logs"] }); queryClient.invalidateQueries({ queryKey: ["evv-exceptions"] }); },
  });

  const serviceCode = serviceCodes.find(sc => sc.id === shift?.service_code_id);
  const isEvvRequired = serviceCode?.is_evv_required || false;
  const trackLocation = agency?.track_location_clock_in !== false;
  const shouldCaptureLocation = isEvvRequired || trackLocation;

  const house = houses.find(h => h.id === shift?.house_id);

  const captureGPS = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("GPS not available")); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          if (data.display_name) address = data.display_name.split(",").slice(0, 3).join(",");
        } catch (_) {}
        resolve({ lat: latitude, lng: longitude, address });
      },
      (err) => reject(new Error("Could not capture location. Please allow location access.")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  const checkGeofence = (gps) => {
    if (!house || house.latitude == null || house.longitude == null) return { verified: true, distance: null };
    const dist = haversineMeters(gps.lat, gps.lng, house.latitude, house.longitude);
    const radius = house.geofence_radius || 100;
    return { verified: dist <= radius, distance: Math.round(dist) };
  };

  const handleClockIn = async () => {
    setGpsError(null);
    let gps = null;
    if (shouldCaptureLocation) {
      setGpsCapturing("in");
      try {
        gps = await captureGPS();
      } catch (e) {
        setGpsError(e.message);
        setGpsCapturing(null);
        setPendingClockAction("in");
        setShowExceptionReason(true);
        return;
      }
      setGpsCapturing(null);
    }

    const now = format(new Date(), "HH:mm");
    const gf = gps ? checkGeofence(gps) : { verified: true, distance: null };
    setGeofenceResult(gf);

    const evvData = {
      shift_id: shift.id,
      staff_id: shift.staff_id, staff_name: shift.staff_name,
      client_id: shift.client_id, client_name: shift.client_name,
      house_id: shift.house_id || "", house_name: shift.house_name || "",
      service_type: shift.service_type || "", service_code: shift.service_code || "",
      is_evv_required: isEvvRequired,
      date: shift.date,
      clock_in: now,
      status: "Pending",
    };
    if (gps) {
      evvData.location_in_lat = gps.lat;
      evvData.location_in_lng = gps.lng;
      evvData.location_in_address = gps.address;
      evvData.geofence_distance_in = gf.distance;
    }
    if (!gf.verified) {
      evvData.exception_type = "geofence_violation";
      evvData.exception_status = "pending";
      setPendingClockAction("in");
      setShowExceptionReason(true);
    } else if (!gps && shouldCaptureLocation) {
      evvData.exception_type = "manual_entry";
      evvData.exception_status = "pending";
    }

    const log = await createEvvLogMutation.mutateAsync(evvData);
    updateMutation.mutate({ id: shift.id, data: { evv_clock_in: now, status: "In Progress", evv_verified: gf.verified, evv_log_id: log.id } });
  };

  const handleClockOut = async () => {
    const today = new Date();
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];
    const todayStr = today.toISOString().split("T")[0];
    const scheduledDue = clientGoals.filter(g =>
      g.charting_mode === "Scheduled" &&
      (!g.schedule_days || g.schedule_days.length === 0 || g.schedule_days.includes(dayName))
    );
    const uncharted = scheduledDue.filter(g => {
      const entries = g.progress_entries || [];
      return !entries.some(e => e.date === todayStr && !e.missed_reason);
    });
    if (uncharted.length > 0) { setShowMissedGoals(true); return; }
    await doClockOut();
  };

  const doClockOut = async () => {
    setGpsError(null);
    let gps = null;
    if (shouldCaptureLocation) {
      setGpsCapturing("out");
      try {
        gps = await captureGPS();
      } catch (e) {
        setGpsError(e.message);
        setGpsCapturing(null);
        setPendingClockAction("out");
        setShowExceptionReason(true);
        return;
      }
      setGpsCapturing(null);
    }

    const now = format(new Date(), "HH:mm");
    const gf = gps ? checkGeofence(gps) : { verified: true, distance: null };
    setGeofenceResult(gf);

    if (evvLogId) {
      const updateData = { clock_out: now };
      if (gps) {
        updateData.location_out_lat = gps.lat;
        updateData.location_out_lng = gps.lng;
        updateData.location_out_address = gps.address;
        updateData.geofence_distance_out = gf.distance;
      }
      if (!gf.verified && gps) {
        updateData.exception_type = "geofence_violation";
        updateData.exception_status = "pending";
        setPendingClockAction("out");
        setShowExceptionReason(true);
      }
      await updateEvvLogMutation.mutateAsync({ id: evvLogId, data: updateData });
    }

    updateMutation.mutate({ id: shift.id, data: { evv_clock_out: now, status: "Completed", evv_verified: geofenceResult?.verified !== false } });
    setShowMissedGoals(false);
  };

  const submitExceptionReason = async () => {
    if (!exceptionReason || !pendingClockAction) return;
    const now = format(new Date(), "HH:mm");
    const evvData = {
      shift_id: shift.id,
      staff_id: shift.staff_id, staff_name: shift.staff_name,
      client_id: shift.client_id, client_name: shift.client_name,
      house_id: shift.house_id || "", house_name: shift.house_name || "",
      service_type: shift.service_type || "", service_code: shift.service_code || "",
      is_evv_required: isEvvRequired,
      date: shift.date,
      exception_type: "manual_entry",
      reason_code: exceptionReason,
      exception_status: "pending",
      status: "Pending",
    };
    if (pendingClockAction === "in") {
      evvData.clock_in = now;
    } else {
      evvData.clock_in = shift.evv_clock_in || now;
      evvData.clock_out = now;
    }
    const log = await createEvvLogMutation.mutateAsync(evvData);
    updateMutation.mutate({
      id: shift.id,
      data: pendingClockAction === "in"
        ? { evv_clock_in: now, status: "In Progress", evv_log_id: log.id }
        : { evv_clock_out: now, status: "Completed", evv_log_id: log.id },
    });
    setShowExceptionReason(false);
    setExceptionReason("");
    setPendingClockAction(null);
  };

  const handleMissedGoalsSave = async (reasons) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const today = new Date();
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];
    for (const r of reasons) {
      const goal = clientGoals.find(g => g.id === r.goal_id);
      if (!goal) continue;
      const entries = goal.progress_entries || [];
      entries.push({ date: todayStr, score: "Missed", recorded_by: shift.staff_name || "Staff", shift_id: shift.id, charting_mode: "Scheduled", missed_reason: r.reason, missed_comment: r.comment || "" });
      await base44.entities.ClientGoal.update(goal.id, { progress_entries: entries });
    }
    queryClient.invalidateQueries({ queryKey: ["goals"] });
    doClockOut();
  };

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
          {shift.house_name && <Row label="House" value={shift.house_name} />}
          {shift.location && <Row label="Location" value={shift.location} />}
          {shift.notes && !canEdit && <Row label="Notes" value={shift.notes} />}
          {canEdit && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium">Shift Notes</p>
              <div className="relative">
                <textarea value={shiftNotes} onChange={(e) => setShiftNotes(e.target.value)} placeholder="Add shift log notes..." rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm pr-12 resize-none" />
                <div className="absolute right-2 top-2"><DictationButton value={shiftNotes} onChange={setShiftNotes} /></div>
              </div>
              {shiftNotes !== (shift?.notes || "") && (
                <Button size="sm" className="mt-1.5" onClick={() => updateMutation.mutate({ id: shift.id, data: { notes: shiftNotes } })} disabled={updateMutation.isPending}>Save Notes</Button>
              )}
            </div>
          )}

          {shift.recurring_series_id && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <Repeat className="w-3.5 h-3.5" />
              This is part of a recurring series.
            </div>
          )}

          {/* EVV Clock In/Out */}
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />EVV — Clock In / Out
              {isEvvRequired && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">EVV Required</Badge>}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Clock In</p>
                <p className="text-sm font-semibold">{shift.evv_clock_in || "—"}</p>
              </div>
              <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Clock Out</p>
                <p className="text-sm font-semibold">{shift.evv_clock_out || "—"}</p>
              </div>
            </div>

            {/* GPS status */}
            {geofenceResult && (
              <div className={cn("flex items-center gap-1.5 text-xs mt-2 px-2 py-1 rounded-md", geofenceResult.verified ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                {geofenceResult.verified ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                {geofenceResult.verified
                  ? `Location verified${geofenceResult.distance != null ? ` (${geofenceResult.distance}m from house)` : ""}`
                  : `Outside geofence (${geofenceResult.distance}m from house)`}
              </div>
            )}

            {gpsError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 mt-2 px-2 py-1 rounded-md bg-red-50">
                <AlertTriangle className="w-3.5 h-3.5" />{gpsError}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              {!shift.evv_clock_in && (
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={handleClockIn} disabled={updateMutation.isPending || createEvvLogMutation.isPending || gpsCapturing === "in"}>
                  {gpsCapturing === "in" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                  {gpsCapturing === "in" ? "Locating…" : "Clock In Now"}
                </Button>
              )}
              {shift.evv_clock_in && !shift.evv_clock_out && (
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-red-700 border-red-300 hover:bg-red-50" onClick={handleClockOut} disabled={updateMutation.isPending || updateEvvLogMutation.isPending || gpsCapturing === "out"}>
                  {gpsCapturing === "out" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  {gpsCapturing === "out" ? "Locating…" : "Clock Out Now"}
                </Button>
              )}

              {showMissedGoals && (
                <MissedGoalsDialog
                  goals={clientGoals.filter(g => {
                    const today = new Date();
                    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];
                    const todayStr = today.toISOString().split("T")[0];
                    return g.charting_mode === "Scheduled" &&
                      (!g.schedule_days || g.schedule_days.length === 0 || g.schedule_days.includes(dayName)) &&
                      !(g.progress_entries || []).some(e => e.date === todayStr && !e.missed_reason);
                  })}
                  onSave={handleMissedGoalsSave}
                  onClose={() => setShowMissedGoals(false)}
                />
              )}
              {shift.evv_clock_in && shift.evv_clock_out && (
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Visit verified
                </p>
              )}
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">Status</p>
            <div className="flex gap-2 items-center">
              <Select value={status} onValueChange={setStatus} disabled={!canEdit}>
                <SelectTrigger className="h-8 text-sm flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => deleteMutation.mutate(shift.id)} disabled={deleteMutation.isPending}>Confirm Delete</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      {/* Exception reason dialog */}
      <Dialog open={showExceptionReason} onOpenChange={setShowExceptionReason}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Reason Required</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {gpsError ? "GPS capture failed. " : "Location is outside the house geofence. "}
            Please provide a reason code for this {pendingClockAction === "in" ? "clock-in" : "clock-out"}.
          </p>
          <Textarea value={exceptionReason} onChange={e => setExceptionReason(e.target.value)} rows={3} placeholder="e.g. Client had a medical appointment off-site" />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowExceptionReason(false); setGpsError(null); }}>Cancel</Button>
            <Button size="sm" onClick={submitExceptionReason} disabled={!exceptionReason || createEvvLogMutation.isPending}>Submit Reason</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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