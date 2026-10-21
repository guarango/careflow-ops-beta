import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileDown, History } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import toast from "react-hot-toast";

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function BillingExportTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const { data: records = [] } = useQuery({ queryKey: ["billing-records"], queryFn: () => base44.entities.BillingRecord.list("-created_date", 500) });
  const { data: exportLogs = [] } = useQuery({ queryKey: ["billing-export-logs"], queryFn: () => base44.entities.BillingExportLog.list("-exported_at", 50) });

  const billableRecords = useMemo(() => {
    return records.filter(r => {
      if (!r.billable) return false;
      if (!r.date) return false;
      try {
        const d = parseISO(r.date);
        return isWithinInterval(d, { start: parseISO(dateFrom), end: parseISO(dateTo) });
      } catch { return false; }
    });
  }, [records, dateFrom, dateTo]);

  const totalUnits = billableRecords.reduce((sum, r) => sum + (r.units || 0), 0);

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (billableRecords.length === 0) throw new Error("No billable records to export");
      const headers = ["Client", "Medicaid ID", "Service Code", "Date", "Units", "Staff"];
      const rows = billableRecords.map(r => [
        r.client_name || "",
        r.medicaid_id || "",
        r.service_code || "",
        r.date || "",
        r.units || 0,
        r.staff_name || "",
      ]);
      const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      const fileName = `billing_export_${dateFrom}_to_${dateTo}.csv`;
      downloadCSV(csv, fileName);

      const log = await base44.entities.BillingExportLog.create({
        exported_by: user?.id || "",
        exported_by_name: user?.full_name || user?.email || "",
        exported_at: new Date().toISOString(),
        date_from: dateFrom,
        date_to: dateTo,
        record_count: billableRecords.length,
        total_units: totalUnits,
        file_name: fileName,
      });

      await base44.entities.BillingRecord.bulkUpdate(
        billableRecords.map(r => ({
          id: r.id,
          exported: true,
          exported_at: new Date().toISOString(),
          export_id: log.id,
        }))
      );

      return { count: billableRecords.length, logId: log.id };
    },
    onSuccess: ({ count }) => {
      toast.success(`Exported ${count} billing record${count !== 1 ? "s" : ""} as CSV`);
      queryClient.invalidateQueries({ queryKey: ["billing-records"] });
      queryClient.invalidateQueries({ queryKey: ["billing-export-logs"] });
    },
    onError: (err) => toast.error(err.message),
  });

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
          <div className="text-center"><p className="text-2xl font-bold text-primary">{billableRecords.length}</p><p className="text-xs text-muted-foreground">Records</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-emerald-600">{totalUnits.toFixed(1)}</p><p className="text-xs text-muted-foreground">Total Units</p></div>
        </div>
        <Button size="sm" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending || billableRecords.length === 0} className="gap-1.5">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Medicaid ID</TableHead>
                  <TableHead>Service Code</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Exported</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billableRecords.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No billable records in this date range. Generate billing records from the Billable Review tab first.</TableCell></TableRow>}
                {billableRecords.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.client_name}</TableCell>
                    <TableCell className="text-sm font-mono">{r.medicaid_id || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.service_code}</TableCell>
                    <TableCell className="text-sm">{r.date}</TableCell>
                    <TableCell className="text-right text-sm">{r.units}</TableCell>
                    <TableCell className="text-sm">{r.staff_name}</TableCell>
                    <TableCell>{r.exported ? <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">Exported</Badge> : <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">Pending</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {exportLogs.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Export History</h3>
            </div>
            <div className="space-y-2">
              {exportLogs.map(log => (
                <div key={log.id} className="flex items-center gap-3 text-sm border-b last:border-0 pb-2 last:pb-0">
                  <FileDown className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">{log.file_name || `Export ${log.date_from}–${log.date_to}`}</span>
                  <span className="text-muted-foreground">{log.exported_by_name} · {log.exported_at ? format(new Date(log.exported_at), "MMM d, yyyy h:mm a") : ""}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">{log.record_count} records · {log.total_units || 0} units</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}