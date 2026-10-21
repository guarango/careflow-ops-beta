import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { Download, AlertTriangle, Clock, FileSpreadsheet, FileText } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

export default function TrainingHoursReport() {
  const { user } = useAuth();
  const { role } = useRole();
  const [startDate, setStartDate] = useState(format(startOfYear(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfYear(new Date()), "yyyy-MM-dd"));

  const { data: staffRecords = [] } = useQuery({
    queryKey: ["all-staff"],
    queryFn: () => base44.entities.StaffMember.filter({ status: "Active" }),
  });
  const allStaff = staffRecords.items || staffRecords;

  const { data: teamStaff = [] } = useQuery({
    queryKey: ["team-staff-report"],
    queryFn: () => base44.entities.StaffMember.filter({ status: "Active" }),
    enabled: role === "manager",
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["training-hours-report"],
    queryFn: () => base44.entities.TrainingAssignment.filter({ status: "Verified" }),
  });
  const verifiedAssignments = assignments.items || assignments;

  // Filter to team for managers
  const teamIds = (teamStaff.items || teamStaff).map(s => s.id);
  const scopedStaff = role === "manager" ? allStaff.filter(s => teamIds.includes(s.id)) : allStaff;
  const scopedAssignments = role === "manager"
    ? verifiedAssignments.filter(a => teamIds.includes(a.staff_id))
    : verifiedAssignments;

  // Build per-staff summary
  const staffSummary = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const yearStart = startOfYear(new Date());

    return scopedStaff.map(staff => {
      const staffAssignments = scopedAssignments.filter(a => a.staff_id === staff.id);
      const inRange = staffAssignments.filter(a => {
        const completed = a.verified_at || a.completed_at;
        if (!completed) return false;
        return isWithinInterval(parseISO(completed), { start, end });
      });
      const yearTotal = staffAssignments.filter(a => {
        const completed = a.verified_at || a.completed_at;
        if (!completed) return false;
        return isWithinInterval(parseISO(completed), { start: yearStart, end: endOfYear(new Date()) });
      }).reduce((sum, a) => sum + (a.hours_awarded || 0), 0);

      const totalHours = inRange.reduce((sum, a) => sum + (a.hours_awarded || 0), 0);

      // Check if year 2+ (hire_date more than 1 year ago)
      const hireDate = staff.hire_date ? parseISO(staff.hire_date) : null;
      const isYear2Plus = hireDate && (new Date() - hireDate) > 365 * 24 * 60 * 60 * 1000;
      const under12Hours = isYear2Plus && yearTotal < 12;

      return {
        staff,
        totalHours,
        yearTotal,
        trainingsCompleted: inRange.length,
        under12Hours,
        isYear2Plus,
        assignments: inRange,
      };
    }).sort((a, b) => b.totalHours - a.totalHours);
  }, [scopedStaff, scopedAssignments, startDate, endDate]);

  const totalHours = staffSummary.reduce((sum, s) => sum + s.totalHours, 0);
  const underCount = staffSummary.filter(s => s.under12Hours).length;

  const exportCSV = () => {
    const rows = [["Staff Name", "Role", "Hours (Range)", "Trainings Completed", "Yearly Total", "Under 12 hrs flag"]];
    staffSummary.forEach(s => {
      rows.push([
        `${s.staff.first_name} ${s.staff.last_name}`,
        s.staff.role || "",
        String(s.totalHours),
        String(s.trainingsCompleted),
        String(s.yearTotal),
        s.under12Hours ? "YES" : "no",
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-hours-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    // Simple print-based PDF export
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Training Hours Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 18px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f0f0f0; }
        .flag { color: red; font-weight: bold; }
      </style></head><body>
      <h1>Training Hours Report</h1>
      <p>Period: ${startDate} to ${endDate}</p>
      <p>Total staff: ${staffSummary.length} · Total hours: ${totalHours.toFixed(1)} · Under 12 hrs: ${underCount}</p>
      <table><thead><tr><th>Staff</th><th>Role</th><th>Hours</th><th>Trainings</th><th>Yearly Total</th><th>Under 12</th></tr></thead>
      <tbody>
      ${staffSummary.map(s => `<tr><td>${s.staff.first_name} ${s.staff.last_name}</td><td>${s.staff.role || ""}</td><td>${s.totalHours.toFixed(1)}</td><td>${s.trainingsCompleted}</td><td>${s.yearTotal.toFixed(1)}</td><td class="${s.under12Hours ? "flag" : ""}">${s.under12Hours ? "YES" : ""}</td></tr>`).join("")}
      </tbody></table>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Training Hours Report</h1>
          <p className="text-sm text-muted-foreground">Hours per employee for a date range</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <FileSpreadsheet className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div>
          <label className="text-xs text-muted-foreground">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="block h-9 rounded-md border border-input bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="block h-9 rounded-md border border-input bg-background px-3 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-2xl">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Hours</p>
          <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Staff</p>
          <p className="text-2xl font-bold">{staffSummary.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Under 12 hrs</p>
          <p className="text-2xl font-bold text-red-600">{underCount}</p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="max-w-3xl space-y-2">
          {staffSummary.map(s => (
            <Card key={s.staff.id} className={s.under12Hours ? "border-red-300" : ""}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                    {s.staff.first_name?.[0]}{s.staff.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{s.staff.first_name} {s.staff.last_name}</p>
                    <p className="text-xs text-muted-foreground">{s.staff.role} · {s.trainingsCompleted} trainings</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.under12Hours && (
                    <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" /> Under 12 hrs
                    </span>
                  )}
                  <div className="text-right">
                    <p className="text-sm font-bold">{s.totalHours.toFixed(1)} hrs</p>
                    <p className="text-xs text-muted-foreground">{s.yearTotal.toFixed(1)} this year</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}