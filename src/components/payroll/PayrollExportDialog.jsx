import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import jsPDF from "jspdf";

function exportCSV(summaries, periodStart, periodEnd, totals) {
  const headers = ["Staff Member", "Role", "Shifts", "Hours", "Gross Pay"];
  const rows = summaries.map(r => [
    r.staff_name,
    r.role || "",
    r.shifts.length,
    r.total_hours.toFixed(2),
    r.gross_pay.toFixed(2),
  ]);
  rows.push(["TOTAL", "", totals.shifts, totals.hours.toFixed(2), totals.pay.toFixed(2)]);

  const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payroll_${periodStart}_to_${periodEnd}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(summaries, periodStart, periodEnd, totals) {
  const doc = new jsPDF();
  const startFormatted = format(parseISO(periodStart), "MMM d, yyyy");
  const endFormatted = format(parseISO(periodEnd), "MMM d, yyyy");

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Payroll Summary", 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Period: ${startFormatted} – ${endFormatted}`, 14, 28);
  doc.text(`Generated: ${format(new Date(), "MMM d, yyyy")}`, 14, 34);
  doc.setTextColor(0);

  // Summary stats
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Staff: ${summaries.length}   |   Total Shifts: ${totals.shifts}   |   Total Hours: ${totals.hours.toFixed(2)}   |   Total Gross Pay: $${totals.pay.toFixed(2)}`, 14, 44);

  // Table header
  let y = 56;
  const colWidths = [70, 35, 20, 22, 30];
  const cols = ["Staff Member", "Role", "Shifts", "Hours", "Gross Pay"];
  const startX = 14;

  doc.setFillColor(240, 240, 240);
  doc.rect(startX, y - 5, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  let x = startX;
  cols.forEach((col, i) => {
    const align = i >= 2 ? "right" : "left";
    if (align === "right") {
      doc.text(col, x + colWidths[i], y, { align: "right" });
    } else {
      doc.text(col, x, y);
    }
    x += colWidths[i];
  });

  y += 8;

  // Table rows
  doc.setFont("helvetica", "normal");
  summaries.forEach((row, idx) => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(startX, y - 5, 182, 8, "F");
    }
    const rowData = [row.staff_name, row.role || "—", row.shifts.length.toString(), row.total_hours.toFixed(2), `$${row.gross_pay.toFixed(2)}`];
    x = startX;
    rowData.forEach((val, i) => {
      const align = i >= 2 ? "right" : "left";
      if (align === "right") {
        doc.text(val, x + colWidths[i], y, { align: "right" });
      } else {
        doc.text(val, x, y);
      }
      x += colWidths[i];
    });
    y += 8;
  });

  // Total row
  y += 2;
  doc.setFillColor(220, 240, 220);
  doc.rect(startX, y - 5, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  const totalRow = ["TOTAL", "", totals.shifts.toString(), totals.hours.toFixed(2), `$${totals.pay.toFixed(2)}`];
  x = startX;
  totalRow.forEach((val, i) => {
    const align = i >= 2 ? "right" : "left";
    if (align === "right") {
      doc.text(val, x + colWidths[i], y, { align: "right" });
    } else {
      doc.text(val, x, y);
    }
    x += colWidths[i];
  });

  doc.save(`payroll_${periodStart}_to_${periodEnd}.pdf`);
}

export default function PayrollExportDialog({ open, onClose, summaries, periodStart, periodEnd, totals }) {
  const handleCSV = () => { exportCSV(summaries, periodStart, periodEnd, totals); onClose(); };
  const handlePDF = () => { exportPDF(summaries, periodStart, periodEnd, totals); onClose(); };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Payroll</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{summaries.length} staff member(s) · {totals.shifts} shifts · ${totals.pay.toFixed(2)} gross pay</p>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Button variant="outline" className="h-20 flex-col gap-2" onClick={handleCSV}>
            <Download className="w-6 h-6 text-green-600" />
            <span className="text-xs font-medium">Export CSV</span>
            <span className="text-[10px] text-muted-foreground">For Excel / Accounting</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col gap-2" onClick={handlePDF}>
            <FileText className="w-6 h-6 text-red-500" />
            <span className="text-xs font-medium">Export PDF</span>
            <span className="text-[10px] text-muted-foreground">Print-ready report</span>
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}