import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { addDays, format, parseISO } from "date-fns";
import { logAudit } from "@/lib/auditLog";
import { todayISO } from "@/lib/dateUtils";
import { useAuth } from "@/lib/AuthContext";
import DayProgramSessionCard from "@/components/dayprogram/DayProgramSessionCard";
import DayProgramSessionDialog from "@/components/dayprogram/DayProgramSessionDialog";
import DsiWeeklyCard from "@/components/dayprogram/DsiWeeklyCard";
import { dsiWeekRows, oneToOneClientIds, ratioCheck, weekStartFor } from "@/lib/dayProgram";

export default function DayProgram() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const [editing, setEditing] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const canOverride = ["manager", "admin"].includes(user?.role);

  const { data: sessions = [] } = useQuery({
    queryKey: ["day-program-sessions"],
    queryFn: () => base44.entities.DayProgramSession.list("-date"),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });
  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["isp-plans"],
    queryFn: () => base44.entities.ISPlan.list(),
  });
  const { data: serviceCodes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["session-notes"],
    queryFn: () => base44.entities.SessionNote.list("-date"),
  });

  const oneToOneIds = useMemo(() => oneToOneClientIds(plans, serviceCodes), [plans, serviceCodes]);

  const sessionCheck = (session) => ratioCheck({
    staff: (session.staff_ids || []).length,
    persons: (session.client_ids || []).length,
    oneToOne: (session.client_ids || []).filter((id) => oneToOneIds.includes(id)).length,
  });

  const daySessions = sessions
    .filter((s) => s.date === date)
    .sort((a, b) => String(a.start_time || "").localeCompare(String(b.start_time || "")));

  const weekStart = weekStartFor(date);
  const dsiRows = dsiWeekRows(notes, { weekStart, serviceCodes });

  const shiftDate = (days) => setDate(format(addDays(parseISO(date), days), "yyyy-MM-dd"));

  const openNew = () => { setEditing(null); setShowDialog(true); };
  const openEdit = (session) => { setEditing(session); setShowDialog(true); };

  const handleSave = async (data) => {
    const check = ratioCheck({
      staff: data.staff_ids.length,
      persons: data.client_ids.length,
      oneToOne: data.client_ids.filter((id) => oneToOneIds.includes(id)).length,
    });
    const overrideReason = check.over && canOverride ? (data.ratio_override_reason || "").trim() : "";
    const payload = {
      ...data,
      ratio_override_reason: overrideReason,
      ratio_override_by: overrideReason ? user?.full_name || "Manager" : "",
      ratio_override_at: overrideReason ? new Date().toISOString() : "",
    };

    setSaving(true);
    try {
      const record = editing?.id
        ? await base44.entities.DayProgramSession.update(editing.id, payload)
        : await base44.entities.DayProgramSession.create(payload);
      queryClient.invalidateQueries({ queryKey: ["day-program-sessions"] });

      if (check.over) {
        logAudit({
          action: overrideReason ? "day_program_ratio_override" : "day_program_ratio_warning",
          target_type: "DayProgramSession",
          target_id: record?.id,
          target_name: `${data.date} · ${data.service_code} · ${data.start_time || "?"}–${data.end_time || "?"}`,
          field: "ratio",
          new_value: `${check.persons} persons / ${check.staff} staff`,
          details: `${check.warnings.join("; ")}${overrideReason ? ` · Override reason: ${overrideReason}` : ""}`,
        });
        if (overrideReason) toast("Ratio override recorded with your reason.");
        else toast.error("Session saved above the 1:6 ratio — a manager override reason is needed.");
      }
      setShowDialog(false);
      setEditing(null);
    } catch (e) {
      toast.error("Could not save the session: " + (e?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Day Program"
        subtitle="DSG staffing ratio and DSI setting checks (DHHS91172 SOW 7.3, 8.4)"
        action={<Button onClick={openNew} className="gap-1.5"><Plus className="w-4 h-4" />New session</Button>}
      />

      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftDate(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-40" />
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftDate(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDate(todayISO())}>Today</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-3">
          {daySessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">No day program sessions on {date}.</p>
              <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={openNew}>
                <Plus className="w-3.5 h-3.5" />Create a session
              </Button>
            </div>
          ) : (
            daySessions.map((session) => (
              <DayProgramSessionCard
                key={session.id}
                session={session}
                check={sessionCheck(session)}
                onEdit={openEdit}
              />
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          <DsiWeeklyCard rows={dsiRows} weekStart={weekStart} />
        </div>
      </div>

      {showDialog && (
        <DayProgramSessionDialog
          initial={editing}
          clients={clients.filter((c) => c.status === "Active" || !c.status)}
          staff={staff.filter((s) => s.status !== "Inactive")}
          oneToOneIds={oneToOneIds}
          canOverride={canOverride}
          saving={saving}
          onClose={() => { setShowDialog(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}