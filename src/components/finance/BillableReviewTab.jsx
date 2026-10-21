import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, FileCheck, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import toast from "react-hot-toast";

function computeUnits(shift, serviceCode) {
  const hours = shift.total_hours || 0;
  const unitType = serviceCode?.unit_type || "Hourly";
  if (unitType === "15-minute") return Math.ceil(hours * 4);
  if (unitType === "Daily") return 1;
  return hours;
}

function checkBillability(shift, sessionNotes, evvLogs, authorizations, serviceCodes) {
  const blockers = [];

  const note = sessionNotes.find(sn => sn.shift_id === shift.id && sn.status === "Approved");
  if (!note) blockers.push("Note not approved");

  const sc = serviceCodes.find(s => s.id === shift.service_code_id || s.code === shift.service_code);
  if (sc?.is_evv_required) {
    const evvLog = evvLogs.find(el => el.shift_id === shift.id);
    const evvOk = shift.evv_verified || (evvLog && evvLog.exception_status === "approved");
    if (!evvOk) blockers.push("EVV exception open");
  }

  const auth = authorizations.find(a =>
    a.client_id === shift.client_id &&
    a.service_code === shift.service_code &&
    a.status === "Approved"
  );
  if (!auth) blockers.push("No authorization");
  else {
    const remaining = a.remaining_units ?? (a.authorized_units - (a.used_units || 0));
    if (remaining <= 0) blockers.push("Units exhausted");
  }

  const units = computeUnits(shift, sc);
  return { billable: blockers.length === 0, blockers, units, note, auth, sc };
}

export default function BillableReviewTab() {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const { data: shifts = [] } = useQuery({ queryKey: ["shifts"], queryFn: () => base44.entities.ShiftSchedule.list("-date", 500) });
  const { data: sessionNotes = [] } = useQuery({ queryKey: ["session-notes-all"], queryFn: () => base44.entities.SessionNote.list("-created_date", 500) });
  const { data: evvLogs = [] } = useQuery({ queryKey: ["evv-logs"], queryFn: () => base44.entities.EVVLog.list("-created_date", 500) });
  const { data: authorizations = [] } = useQuery({ queryKey: ["authorizations"], queryFn: () => base44.entities.Authorization.list() });
  const { data: serviceCodes = [] } = useQuery({ queryKey: ["service-codes"], queryFn: () => base44.entities.ServiceCode.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: existingBills = [] } = useQuery({ queryKey: ["billing-records"], queryFn: () => base44.entities.BillingRecord.list("-created_date", 500) });

  const completedShifts = useMemo(() => {
    return shifts.filter(s => {
      if (s.status !== "Completed") return false;
      if (!s.date) return false;
      try {
        const d = parseISO(s.date);
        return isWithinInterval(d, { start: parseISO(dateFrom), end: parseISO(dateTo) });
      } catch { return false; }
    });
  }, [shifts, dateFrom, dateTo]);

  const reviewData = useMemo(() => {
    return completedShifts.map(shift => {
      const result = checkBillability(shift, sessionNotes, evvLogs, authorizations, serviceCodes);
      const client = clients.find(c => c.id === shift.client_id);
      const alreadyBilled = existingBills.some(b => b.shift_id === shift.id);
      return { shift, ...result, client, alreadyBilled };
    });
  }, [completedShifts, sessionNotes, evvLogs, authorizations, serviceCodes, clients, existingBills]);

  const billableCount = reviewData.filter(r => r.billable).length;
  const blockedCount = reviewData.length - billableCount;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const toCreate = reviewData.filter(r => r.billable && !r.alreadyBilled);
      if (toCreate.length === 0) throw new Error("No new billable records to generate");
      const records = toCreate.map(r => ({
        client_id: r.shift.client_id,
        client_name: r.shift.client_name,
        medicaid_id: r.client?.insurance_id || "",
        service_type: r.shift.service_type || "Residential",
        service_code_id: r.shift.service_code_id,
        service_code: r.shift.service_code,
        shift_id: r.shift.id,
        session_note_id: r.note?.id,
        staff_id: r.shift.staff_id,
        staff_name: r.shift.staff_name,
        date: r.shift.date,
        hours: r.shift.total_hours || 0,
        units: r.units,
        unit_type: r.sc?.unit_type || "Hourly",
        rate: r.sc?.rate || 0,
        total_amount: (r.sc?.rate || 0) * r.units,
        evv_verified: r.shift.evv_verified || false,
        status: "Pending",
        billable: true,
        blockers: [],
      }));
      await base44.entities.BillingRecord.bulkCreate(records);
      return records.length;
    },
    onSuccess: (count) => {
      toast.success(`Generated ${count} billing record${count !== 1 ? "s" : ""}`);
      queryClient.invalidateQueries({ queryKey: ["billing-records"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const queryClient = useQueryClient();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end p-4 bg-muted/40 rounded-lg border">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">From</span>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">To</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm w-36" />
        </div>
        <div className="flex gap-4 ml-auto">
          <div className="text-center"><p className="text-2xl font-bold text-emerald-600">{billableCount}</p><p className="text-xs text-muted-foreground">Billable</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-amber-600">{blockedCount}</p><p className="text-xs text-muted-foreground">Blocked</p></div>
        </div>
        <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending || billableCount === 0} className="gap-1.5">
          <FileCheck className="w-4 h-4" /> Generate Billing Records
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Service Code</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Blockers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewData.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No completed shifts in this date range.</TableCell></TableRow>}
                {reviewData.map(({ shift, billable, blockers, units, alreadyBilled }) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium text-sm">{shift.client_name}</TableCell>
                    <TableCell className="font-mono text-xs">{shift.service_code}</TableCell>
                    <TableCell className="text-sm">{shift.date}</TableCell>
                    <TableCell className="text-sm">{shift.staff_name}</TableCell>
                    <TableCell className="text-right text-sm">{units}</TableCell>
                    <TableCell>
                      {alreadyBilled ? <Badge variant="outline" className="bg-blue-50 text-blue-700 gap-1 text-xs"><FileCheck className="w-3 h-3" />Billed</Badge>
                        : billable ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Ready</Badge>
                        : <Badge variant="outline" className="bg-amber-50 text-amber-700 gap-1 text-xs"><XCircle className="w-3 h-3" />Blocked</Badge>}
                    </TableCell>
                    <TableCell>
                      {blockers.length === 0 ? <span className="text-xs text-muted-foreground">—</span>
                        : <div className="flex flex-wrap gap-1">{blockers.map((b, i) => <span key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" />{b}</span>)}</div>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}