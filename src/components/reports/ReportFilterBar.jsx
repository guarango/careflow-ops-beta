import React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

export default function ReportFilterBar({ filters, onChange, onExport, onRefresh, exportFormats = ["CSV", "PDF"] }) {
  const { dateRange, program, fundingSource } = filters;

  return (
    <div className="flex flex-wrap gap-3 items-center mb-6 p-4 bg-muted/40 rounded-xl border border-border">
      <Select value={dateRange} onValueChange={v => onChange({ ...filters, dateRange: v })}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Date Range" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
          <SelectItem value="6m">Last 6 months</SelectItem>
          <SelectItem value="1y">Last 12 months</SelectItem>
          <SelectItem value="ytd">Year to Date</SelectItem>
        </SelectContent>
      </Select>

      <Select value={program} onValueChange={v => onChange({ ...filters, program: v })}>
        <SelectTrigger className="w-44"><SelectValue placeholder="All Programs" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Programs</SelectItem>
          <SelectItem value="Residential">Residential</SelectItem>
          <SelectItem value="Day Program">Day Program</SelectItem>
          <SelectItem value="Community Living">Community Living</SelectItem>
          <SelectItem value="Supported Employment">Supported Employment</SelectItem>
          <SelectItem value="Respite">Respite</SelectItem>
        </SelectContent>
      </Select>

      <Select value={fundingSource} onValueChange={v => onChange({ ...filters, fundingSource: v })}>
        <SelectTrigger className="w-44"><SelectValue placeholder="All Funding Sources" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Funding Sources</SelectItem>
          <SelectItem value="Medicaid">Medicaid</SelectItem>
          <SelectItem value="Medicaid Waiver">Medicaid Waiver</SelectItem>
          <SelectItem value="State">State</SelectItem>
          <SelectItem value="Private">Private Pay</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-2 ml-auto">
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        )}
        {onExport && exportFormats.map(fmt => (
          <Button key={fmt} variant="outline" size="sm" onClick={() => onExport(fmt)} className="gap-2">
            <Download className="w-3.5 h-3.5" /> {fmt}
          </Button>
        ))}
      </div>
    </div>
  );
}