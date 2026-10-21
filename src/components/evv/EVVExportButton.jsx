import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";

export default function EVVExportButton() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [exporting, setExporting] = useState(false);

  const { data: serviceCodes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });

  const evvRequiredCodeIds = new Set(
    serviceCodes.filter(sc => sc.is_evv_required).map(sc => sc.id)
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const { items } = await base44.entities.EVVLog.filter(
        { date: { $gte: from, $lte: to } },
        { sort: "date", limit: 500 }
      );
      const filtered = items.filter(l => l.is_evv_required || evvRequiredCodeIds.has(l.service_code));
      const headers = ["Date", "Staff", "Client", "House", "Service Type", "Service Code", "Clock In", "Clock Out", "Location In", "Location Out", "Exception Type", "Exception Status", "Reason Code", "Status"];
      const rows = filtered.map(l => [
        l.date || "", l.staff_name || "", l.client_name || "", l.house_name || "",
        l.service_type || "", l.service_code || "", l.clock_in || "", l.clock_out || "",
        l.location_in_address || "", l.location_out_address || "",
        l.exception_type || "none", l.exception_status || "none", l.reason_code || "", l.status || "",
      ]);
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evv-export_${from}_to_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-sm" /></div>
      <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-sm" /></div>
      <Button onClick={handleExport} disabled={exporting || !from || !to}>
        {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
        Export EVV CSV
      </Button>
      <p className="text-xs text-muted-foreground">Exports EVV-required service records only.</p>
    </div>
  );
}