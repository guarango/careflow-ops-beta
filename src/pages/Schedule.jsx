import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays, Calendar, Grid3x3, Users } from "lucide-react";
import { startOfWeek, addDays, format, parseISO } from "date-fns";
import { useAssignedClients } from "@/hooks/useAssignedClients";
import NoDSPClientsState from "@/components/shared/NoDSPClientsState";
import { useRole } from "@/hooks/useRole";
import { detectConflicts, getServiceColor, calcHours, SERVICE_COLORS } from "@/components/schedule/scheduleUtils";
import { cn } from "@/lib/utils";

import DayView from "@/components/schedule/DayView";
import WeekView from "@/components/schedule/WeekView";
import MonthView from "@/components/schedule/MonthView";
import StaffView from "@/components/schedule/StaffView";
import NewCreateShiftDialog from "@/components/schedule/NewCreateShiftDialog";
import ShiftDetailModal from "@/components/schedule/ShiftDetailModal";
import CopyWeekDialog from "@/components/schedule/CopyWeekDialog";

const VIEWS = [
  { id: "day", label: "Day", icon: CalendarDays },
  { id: "week", label: "Week", icon: Calendar },
  { id: "month", label: "Month", icon: Grid3x3 },
  { id: "staff", label: "Staff", icon: Users },
];

export default function Schedule() {
  const { isDSPMode, assignedClientIds } = useAssignedClients();
  const { role } = useRole();
  const canEdit = role === "admin";
  const canViewAll = role === "admin" || role === "hr";

  // DSPs can only see day and week
  const allowedViews = isDSPMode ? ["day", "week"] : ["day", "week", "month", "staff"];

  const [view, setView] = useState("week");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [dialogInitialDate, setDialogInitialDate] = useState("");
  const [editingShift, setEditingShift] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null); // for detail modal

  const queryClient = useQueryClient();

  const { data: shifts = [] } = useQuery({ queryKey: ["shifts"], queryFn: () => base44.entities.ShiftSchedule.list("-date") });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: staffList = [] } = useQuery({ queryKey: ["staff"], queryFn: () => base44.entities.StaffMember.list() });
  const { data: serviceCodes = [] } = useQuery({ queryKey: ["service-codes"], queryFn: () => base44.entities.ServiceCode.list() });

  const createBillingMutation = useMutation({ mutationFn: (data) => base44.entities.BillingRecord.create(data) });
  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftSchedule.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shifts"] }); queryClient.invalidateQueries({ queryKey: ["billing"] }); },
  });

  const handleStatusChange = async (shift, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === "Completed" && !shift.billing_created && shift.rate) {
      const hours = calcHours(shift.start_time, shift.end_time);
      let totalAmount = 0;
      if (shift.rate_type === "Hourly") totalAmount = hours * shift.rate;
      else if (shift.rate_type === "Daily") totalAmount = shift.rate;
      else if (shift.rate_type === "Per Unit") totalAmount = Math.ceil((hours * 60) / 15) * shift.rate;
      const billingRecord = await createBillingMutation.mutateAsync({
        client_id: shift.client_id, client_name: shift.client_name,
        service_type: shift.service_type || "Residential", date: shift.date, hours,
        rate: shift.rate, total_amount: totalAmount,
        insurance_provider: clients.find(c => c.id === shift.client_id)?.insurance_provider || "",
        status: "Pending",
      });
      updates.billing_created = true;
      updates.billing_record_id = billingRecord?.id || "";
    }
    updateShiftMutation.mutate({ id: shift.id, data: updates });
  };

  // Filter shifts for DSP
  const visibleShifts = useMemo(() => {
    if (isDSPMode) return shifts.filter(s => assignedClientIds.includes(s.client_id));
    return shifts;
  }, [shifts, isDSPMode, assignedClientIds]);

  const conflictIds = useMemo(() => detectConflicts(visibleShifts), [visibleShifts]);

  // Conflict info for a specific shift
  const getConflictInfo = (shift) => {
    if (!conflictIds.has(shift.id)) return null;
    const same = visibleShifts.filter(s =>
      s.id !== shift.id &&
      s.staff_id === shift.staff_id &&
      s.date === shift.date
    );
    if (same.length === 0) return null;
    const other = same[0];
    return `${shift.staff_name} is already scheduled from ${other.start_time} to ${other.end_time} on this day.`;
  };

  const openAddShift = (date) => {
    setDialogInitialDate(date || "");
    setEditingShift(null);
    setShowCreateDialog(true);
  };

  const openEditShift = (shift) => {
    setEditingShift(shift);
    setShowCreateDialog(true);
    setSelectedShift(null);
  };

  const handleShiftClick = (shift) => setSelectedShift(shift);

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setView("day");
  };

  // Service color legend
  const allServiceTypes = [...new Set(serviceCodes.map(sc => sc.service_type).filter(Boolean))];

  if (isDSPMode && assignedClientIds.length === 0) return <NoDSPClientsState />;

  return (
    <div>
      <PageHeader
        title={isDSPMode ? "My Schedule" : "Shift Scheduling"}
        subtitle={isDSPMode ? "Your shifts this week" : "Build and manage schedules for staff and clients"}
        action={
          canEdit ? (
            <Button onClick={() => openAddShift("")}>
              <Plus className="w-4 h-4 mr-2" /> Add Shift
            </Button>
          ) : null
        }
      />

      {/* View toggle + color legend */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
          {VIEWS.filter(v => allowedViews.includes(v.id)).map(v => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  view === v.id ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {v.label}
              </button>
            );
          })}
        </div>

        {/* Service type legend */}
        {allServiceTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {allServiceTypes.map((type, i) => {
              const color = SERVICE_COLORS[i % SERVICE_COLORS.length];
              return (
                <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("w-2.5 h-2.5 rounded-sm", color.bg)} />
                  {type}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Views */}
      {view === "day" && (
        <DayView
          selectedDay={selectedDay}
          onChange={setSelectedDay}
          shifts={visibleShifts}
          serviceCodes={serviceCodes}
          conflictIds={conflictIds}
          onShiftClick={handleShiftClick}
          onAddShift={canEdit ? openAddShift : null}
        />
      )}

      {view === "week" && (
        <WeekView
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          shifts={visibleShifts}
          serviceCodes={serviceCodes}
          conflictIds={conflictIds}
          canEdit={canEdit}
          onShiftClick={handleShiftClick}
          onAddShift={canEdit ? openAddShift : null}
          onCopyWeek={() => setShowCopyDialog(true)}
        />
      )}

      {view === "month" && (
        <MonthView
          month={currentMonth}
          onChange={setCurrentMonth}
          shifts={visibleShifts}
          serviceCodes={serviceCodes}
          conflictIds={conflictIds}
          onShiftClick={handleShiftClick}
          onDayClick={handleDayClick}
        />
      )}

      {view === "staff" && (
        <StaffView
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          shifts={visibleShifts}
          staffList={staffList}
          serviceCodes={serviceCodes}
          conflictIds={conflictIds}
          onShiftClick={handleShiftClick}
        />
      )}

      {/* Shift detail modal */}
      {selectedShift && (
        <ShiftDetailModal
          shift={selectedShift}
          conflictInfo={getConflictInfo(selectedShift)}
          canEdit={canEdit}
          serviceColor={getServiceColor(selectedShift?.service_type, serviceCodes)}
          onClose={() => setSelectedShift(null)}
          onEdit={openEditShift}
          onDelete={() => setSelectedShift(null)}
        />
      )}

      {/* Create / Edit dialog */}
      {canEdit && (
        <NewCreateShiftDialog
          open={showCreateDialog}
          onClose={() => { setShowCreateDialog(false); setEditingShift(null); }}
          initialDate={dialogInitialDate}
          clients={clients}
          staffList={staffList}
          serviceCodes={serviceCodes}
          editingShift={editingShift}
        />
      )}

      {/* Copy week dialog */}
      {canEdit && (
        <CopyWeekDialog
          open={showCopyDialog}
          onClose={() => setShowCopyDialog(false)}
          weekStart={weekStart}
          allShifts={shifts}
        />
      )}
    </div>
  );
}