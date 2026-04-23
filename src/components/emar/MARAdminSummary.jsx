import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, Printer, Download, Search } from "lucide-react";
import { format, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useToast } from "@/components/ui/use-toast";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return "";
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

function getInitialsColor(name) {
  const colors = ["bg-sky-600", "bg-emerald-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-teal-600", "bg-indigo-600"];
  if (!name) return colors[0];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

// Determine which days in the month a scheduled medication is due
function scheduledDaysForMed(med, year, month) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const scheduleDays = med.schedule_days || dayNames; // default: every day
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
  const scheduled = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = getDay(new Date(year, month - 1, d));
    if (scheduleDays.includes(dayNames[dayOfWeek])) {
      scheduled.push(d);
    }
  }
  return new Set(scheduled);
}

// Cell indicator component
function DayCell({ log, isScheduled, isPRN }) {
  if (isPRN) {
    // PRN: only show if there's a log entry
    if (!log) return <div className="text-center text-muted-foreground text-xs">–</div>;
  } else {
    if (!isScheduled) return <div className="text-center text-muted-foreground text-xs">–</div>;
  }

  if (!log) {
    // Scheduled and no log = missed
    return (
      <div className="flex flex-col items-center gap-0.5">
        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
      </div>
    );
  }

  const initials = getInitials(log.administered_by_name);
  const initColor = getInitialsColor(log.administered_by_name);
  let icon;
  if (log.status === "Administered") {
    icon = <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  } else if (log.status === "Missed") {
    icon = <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  } else {
    // Refused, Held, Not Available, Late
    icon = <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      {initials && (
        <span className={`text-[8px] font-bold text-white ${initColor} rounded px-0.5 leading-tight`}>
          {initials}
        </span>
      )}
      {icon}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MARAdminSummary({ clients, medications, logs }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-based
  const [clientFilter, setClientFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef(null);
  const { toast } = useToast();

  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy");

  // Navigate month
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Filter clients
  const activeClients = clients.filter(c => c.status !== "Discharged");
  const searchLower = search.toLowerCase();
  const displayClients = activeClients.filter(c => {
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    if (clientFilter !== "all" && c.id !== clientFilter) return false;
    if (search && !name.includes(searchLower)) return false;
    return true;
  });

  // Build log lookup: clientId -> medId -> day -> log
  const logLookup = {};
  logs.forEach(log => {
    const logDate = log.date ? new Date(log.date) : null;
    if (!logDate) return;
    const logYear = logDate.getFullYear();
    const logMonth = logDate.getMonth() + 1;
    const logDay = logDate.getDate();
    if (logYear !== year || logMonth !== month) return;

    if (!logLookup[log.client_id]) logLookup[log.client_id] = {};
    if (!logLookup[log.client_id][log.medication_id]) logLookup[log.client_id][log.medication_id] = {};
    // Keep the most recent log per day (prefer Administered over Missed)
    const existing = logLookup[log.client_id][log.medication_id][logDay];
    if (!existing || log.status === "Administered") {
      logLookup[log.client_id][log.medication_id][logDay] = log;
    }
  });

  // Print — opens a new window with landscape-optimised stylesheet
  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>MAR Admin Summary - ${monthLabel}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 9px; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        table { border-collapse: collapse; width: 100%; table-layout: auto; }
        th, td { border: 1px solid #ccc; padding: 2px 4px; text-align: center; font-size: 8px; white-space: nowrap; }
        th { background: #f0f0f0; font-weight: bold; }
        .client-header { background: #1e3a5f; color: white; font-weight: bold; font-size: 10px; padding: 5px 8px; }
        .med-name { text-align: left; font-size: 8px; min-width: 120px; }
        .summary-row { background: #f8f8f8; font-weight: bold; }
        .controlled { color: red; font-size: 7px; font-weight: bold; margin-left: 3px; }
        .prn-label { color: #b45309; font-size: 7px; }
        .client-section { page-break-after: always; margin-bottom: 0; }
        .client-section:last-child { page-break-after: avoid; }
        @media print {
          body { zoom: 0.65; }
          .client-section { page-break-after: always; }
          .client-section:last-child { page-break-after: avoid; }
        }
      </style>
      </head><body>${printContents}</body></html>
    `);
    win.document.close();
    win.print();
  };

  // PDF Export — captures the rendered grid via html2canvas
  const handleExportPDF = async () => {
    const gridEl = printRef.current;
    if (!gridEl) {
      toast({ title: "Export failed", description: "Please wait for the page to fully load and try again.", variant: "destructive" });
      return;
    }
    setPdfLoading(true);
    try {
      // A4 landscape dimensions in mm / px at 96dpi
      const PAGE_W_MM = 287; // 297 - 10mm margins
      const PAGE_H_MM = 190; // 210 - 10mm margins
      const MM_TO_PX = 3.7795; // 1mm ≈ 3.7795px at 96dpi

      const canvas = await html2canvas(gridEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("Grid canvas is empty");
      }

      const imgData = canvas.toDataURL("image/png");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const contentW = pageW - margin * 2;
      const contentH = pageH - margin * 2;
      const headerH = 18; // space for title header

      // Header on first page
      doc.setFontSize(13);
      doc.setFont(undefined, "bold");
      doc.text(`Medication Administration Summary — ${monthLabel}`, margin, margin + 7);
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      doc.text(`Generated: ${format(new Date(), "MM/dd/yyyy")}`, margin, margin + 13);

      // Scale image to fit page width
      const imgW = canvas.width;
      const imgH = canvas.height;
      const scale = contentW / (imgW / 2); // divide by 2 because we captured at scale:2
      const scaledW = contentW;
      const scaledH = (imgH / 2) * scale;

      const availH = contentH - headerH;
      const startY = margin + headerH;

      if (scaledH <= availH) {
        // Fits on one page
        doc.addImage(imgData, "PNG", margin, startY, scaledW, scaledH);
      } else {
        // Slice across multiple pages
        const ratio = imgH / scaledH; // px per mm
        let yOffset = 0;

        // First page already has header
        let pageAvailH = availH;
        let pageStartY = startY;

        while (yOffset < imgH / 2) {
          const sliceHeightMM = pageAvailH;
          const sliceHeightPx = sliceHeightMM * ratio * 2;

          // Create a slice canvas
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = imgW;
          sliceCanvas.height = Math.min(sliceHeightPx, imgH - yOffset * 2);
          const ctx = sliceCanvas.getContext("2d");
          const img = new Image();
          await new Promise(res => { img.onload = res; img.src = imgData; });
          ctx.drawImage(img, 0, yOffset * 2, imgW, sliceCanvas.height, 0, 0, imgW, sliceCanvas.height);
          const sliceData = sliceCanvas.toDataURL("image/png");

          const actualSliceH = (sliceCanvas.height / 2) * scale;
          doc.addImage(sliceData, "PNG", margin, pageStartY, scaledW, actualSliceH);

          yOffset += sliceCanvas.height / 2;
          if (yOffset < imgH / 2) {
            doc.addPage();
            pageAvailH = contentH;
            pageStartY = margin;
          }
        }
      }

      doc.save(`MAR_Admin_Summary_${monthLabel.replace(/ /g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      toast({ title: "Export failed", description: "Please wait for the page to fully load and try again.", variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 justify-between bg-white border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 hover:bg-muted rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="font-semibold text-sm min-w-[120px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-muted rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-8 text-sm w-40">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {activeClients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-xs gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={pdfLoading} className="h-8 text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> {pdfLoading ? "Exporting…" : "PDF"}
          </Button>
        </div>
      </div>

      {/* Printable Grid */}
      <div ref={printRef} className="overflow-x-auto">
        <div className="min-w-max">
          {displayClients.map(client => {
            const clientMeds = medications.filter(m => m.client_id === client.id && m.status === "Active");
            if (clientMeds.length === 0) return null;

            const scheduledMeds = clientMeds.filter(m => !m.is_prn);
            const prnMeds = clientMeds.filter(m => m.is_prn);
            const allMeds = [...scheduledMeds, ...prnMeds];

            // Client-level totals
            let totalScheduled = 0, totalAdministered = 0, totalMissed = 0;

            return (
              <div key={client.id} className="mb-8 rounded-xl overflow-hidden border border-border client-section">
                {/* Client header */}
                <div className="bg-slate-800 text-white px-4 py-2.5 font-bold text-sm tracking-wide client-header">
                  {client.first_name} {client.last_name} — {monthLabel}
                </div>

                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-border">
                      <th className="text-left px-3 py-2 font-semibold text-slate-700 min-w-[160px] sticky left-0 bg-slate-100 z-10">Medication</th>
                      <th className="text-left px-2 py-2 font-semibold text-slate-700 min-w-[80px]">Time</th>
                      {dayNumbers.map(d => (
                        <th key={d} className="px-0.5 py-2 font-semibold text-slate-700 w-8 min-w-[32px] text-center">
                          <div className="font-bold">{d}</div>
                          <div className="text-[9px] text-slate-400 font-normal">
                            {format(new Date(year, month - 1, d), "EEE").slice(0, 1)}
                          </div>
                        </th>
                      ))}
                      <th className="px-2 py-2 font-semibold text-slate-700 min-w-[70px] text-center">Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allMeds.map((med, medIdx) => {
                      const isPRN = !!med.is_prn;
                      const scheduledDays = isPRN ? new Set() : scheduledDaysForMed(med, year, month);
                      const medLogs = logLookup[client.id]?.[med.id] || {};

                      // Compliance calculation
                      let medScheduled = 0, medAdministered = 0, medMissed = 0;
                      if (isPRN) {
                        // PRN: count actual administrations
                        medAdministered = Object.values(medLogs).filter(l => l.status === "Administered").length;
                      } else {
                        medScheduled = scheduledDays.size;
                        dayNumbers.forEach(d => {
                          if (!scheduledDays.has(d)) return;
                          const log = medLogs[d];
                          if (!log) { medMissed++; }
                          else if (log.status === "Administered") { medAdministered++; }
                          else { medMissed++; }
                        });
                        totalScheduled += medScheduled;
                        totalAdministered += medAdministered;
                        totalMissed += medMissed;
                      }

                      const compliance = medScheduled > 0
                        ? Math.round((medAdministered / medScheduled) * 100)
                        : null;

                      const complianceColor =
                        compliance === null ? "text-slate-400"
                        : compliance >= 90 ? "text-emerald-600 font-bold"
                        : compliance >= 75 ? "text-amber-600 font-bold"
                        : "text-red-600 font-bold";

                      const rowBg = medIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60";

                      return (
                        <tr key={med.id} className={`border-b border-border/50 ${rowBg}`}>
                          {/* Medication name */}
                          <td className={`px-3 py-2 font-medium text-slate-800 sticky left-0 z-10 ${rowBg} med-name`}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="truncate max-w-[130px]" title={med.medication_name}>
                                {med.medication_name}
                              </span>
                              {isPRN && <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded shrink-0 prn-label">PRN</span>}
                              {med.is_controlled && <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1 rounded shrink-0 controlled">CONTROLLED</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{med.dosage}</div>
                          </td>

                          {/* Scheduled time */}
                          <td className="px-2 py-2 text-slate-500 text-[10px]">
                            {isPRN ? <span className="text-amber-700">PRN</span>
                              : med.scheduled_times?.join(", ") || med.frequency || "—"}
                          </td>

                          {/* Day cells */}
                          {dayNumbers.map(d => {
                            const log = medLogs[d];
                            const isScheduled = scheduledDays.has(d);
                            return (
                              <td key={d} className="px-0.5 py-1.5 text-center">
                                <DayCell log={log} isScheduled={isScheduled} isPRN={isPRN} />
                              </td>
                            );
                          })}

                          {/* Compliance % */}
                          <td className={`px-2 py-2 text-center text-xs ${complianceColor}`}>
                            {compliance !== null ? `${compliance}%` : isPRN ? <span className="text-slate-400 text-[10px]">{medAdministered} doses</span> : "—"}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Client summary totals row */}
                    <tr className="bg-slate-100 border-t-2 border-slate-300 summary-row">
                      <td className="px-3 py-2 font-bold text-slate-800 sticky left-0 bg-slate-100 z-10" colSpan={2}>
                        Monthly Totals
                      </td>
                      {dayNumbers.map(d => <td key={d} className="px-0.5 py-2" />)}
                      <td className="px-2 py-2 text-xs text-center">
                        <div className="space-y-0.5">
                          <div className="text-slate-600"><span className="font-semibold">{totalScheduled}</span> <span className="text-[9px]">sched</span></div>
                          <div className="text-emerald-600"><span className="font-semibold">{totalAdministered}</span> <span className="text-[9px]">given</span></div>
                          <div className="text-red-500"><span className="font-semibold">{totalMissed}</span> <span className="text-[9px]">missed</span></div>
                          {totalScheduled > 0 && (
                            <div className={`font-bold ${Math.round((totalAdministered / totalScheduled) * 100) >= 90 ? "text-emerald-600" : Math.round((totalAdministered / totalScheduled) * 100) >= 75 ? "text-amber-600" : "text-red-600"}`}>
                              {Math.round((totalAdministered / totalScheduled) * 100)}%
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}

          {displayClients.filter(c => medications.some(m => m.client_id === c.id && m.status === "Active")).length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No active medications found for the selected client(s).
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white border border-border rounded-xl px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
        <span className="font-semibold text-slate-700 mr-1">Legend:</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Administered</span>
        <span className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-red-500" /> Missed</span>
        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-500" /> Refused / Held / Not Available</span>
        <span className="flex items-center gap-1.5 text-slate-400">— Not scheduled</span>
        <span className="flex items-center gap-1.5"><span className="text-[9px] font-bold text-white bg-sky-600 rounded px-0.5">CW</span> Staff initials</span>
        <span className="flex items-center gap-1.5"><span className="text-[9px] font-bold text-red-600 bg-red-100 rounded px-1">CONTROLLED</span> Controlled substance</span>
        <span className="flex items-center gap-1.5"><span className="text-[9px] font-bold text-amber-700 bg-amber-100 rounded px-1">PRN</span> As-needed medication</span>
      </div>
    </div>
  );
}