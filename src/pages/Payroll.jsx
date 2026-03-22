import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, DollarSign, Clock, Users, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import PayrollExportDialog from "@/components/payroll/PayrollExportDialog";

function calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100);
}

function calcPay(shift) {
  const hours = shift.total_hours || calcHours(shift.start_time, shift.end_time);
  if (!shift.rate) return 0;
  if (shift.rate_type === "Daily") return shift.rate;
  if (shift.rate_type === "Per Unit") return Math.ceil((hours * 60) / 15) * shift.rate;
  return hours * shift.rate; // Hourly default
}

export default function Payroll() {
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterStaff, setFilterStaff] = useState("all");
  const [showExport, setShowExport] = useState(false);

  const { data: shifts = [] } = useQuery({ queryKey: ["shifts"], queryFn: () => base44.entities.ShiftSchedule.list("-date") });
  const { data: staffList = [] } = useQuery({ queryKey: ["staff"], queryFn: () => base44.entities.StaffMember.list() });

  const completedShifts = useMemo(() => {
    return shifts.filter(s => {
      if (s.status !== "Completed") return false;
      if (!s.date) return false;
      try {
        const d = parseISO(s.date);
        return isWithinInterval(d, { start: parseISO(periodStart), end: parseISO(periodEnd) });
      } catch { return false; }
    });
  }, [shifts, periodStart, periodEnd]);

  const summaries = useMemo(() => {
    const map = {};
    completedShifts.forEach(shift => {
      const id = shift.staff_id;
      if (!id) return;
      if (!map[id]) {
        const staff = staffList.find(s => s.id === id);
        map[id] = {
          staff_id: id,
          staff_name: shift.staff_name || (staff ? `${staff.first_name} ${staff.last_name}` : "Unknown"),
          role: staff?.role || "",
          shifts: [],
          total_hours: 0,
          gross_pay: 0,
        };
      }
      const hours = shift.total_hours || calcHours(shift.start_time, shift.end_time);
      const pay = calcPay(shift);
      map[id].shifts.push(shift);
      map[id].total_hours += hours;
      map[id].gross_pay += pay;
    });
    return Object.values(map).sort((a, b) => b.gross_pay - a.gross_pay);
  }, [completedShifts, staffList]);

  const filtered = filterStaff === "all" ? summaries : summaries.filter(s => s.staff_id === filterStaff);

  const totals = useMemo(() => ({
    shifts: filtered.reduce((s, r) => s + r.shifts.length, 0),
    hours: filtered.reduce((s, r) => s + r.total_hours, 0),
    pay: filtered.reduce((s, r) => s + r.gross_pay, 0),
  }), [filtered]);

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Gross pay summaries for completed shifts by staff member"
        action={
          <Button onClick={() => setShowExport(true)} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" />Export
          </Button>
        }
      />

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end mb-6 p-4 bg-muted/40 rounded-lg border">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Period Start</span>
          <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="h-8 text-sm w-38" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Period End</span>
          <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="h-8 text-sm w-38" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Staff Member</span>
          <Select value={filterStaff} onValueChange={setFilterStaff}>
            <SelectTrigger className="h-8 text-sm w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Staff</span></div>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-blue-500" /><span className="text-xs text-muted-foreground">Shifts</span></div>
            <p className="text-2xl font-bold">{totals.shifts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-amber-500" /><span className="text-xs text-muted-foreground">Total Hours</span></div>
            <p className="text-2xl font-bold">{totals.hours.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-green-500" /><span className="text-xs text-muted-foreground">Gross Pay</span></div>
            <p className="text-2xl font-bold">${totals.pay.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Summaries Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No completed shifts found for this period</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Staff Payroll Summary — {format(parseISO(periodStart), "MMM d")} to {format(parseISO(periodEnd), "MMM d, yyyy")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Staff Member</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-right px-4 py-3 font-medium">Shifts</th>
                    <th className="text-right px-4 py-3 font-medium">Hours</th>
                    <th className="text-right px-4 py-3 font-medium">Gross Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr key={row.staff_id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3 font-medium">{row.staff_name}</td>
                      <td className="px-4 py-3">
                        {row.role && <Badge variant="outline" className="text-xs">{row.role}</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right">{row.shifts.length}</td>
                      <td className="px-4 py-3 text-right">{row.total_hours.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">${row.gross_pay.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td className="px-4 py-3" colSpan={2}>Total</td>
                    <td className="px-4 py-3 text-right">{totals.shifts}</td>
                    <td className="px-4 py-3 text-right">{totals.hours.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-green-700">${totals.pay.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <PayrollExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        summaries={filtered}
        periodStart={periodStart}
        periodEnd={periodEnd}
        totals={totals}
      />
    </div>
  );
}