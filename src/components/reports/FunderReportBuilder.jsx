import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import ReportFilterBar from "./ReportFilterBar";
import { Globe, Plus, Download, Clock, CheckCircle, FileText, Calendar, Building } from "lucide-react";

const STATE_TEMPLATES = [
  { state: "Utah", code: "UT", authority: "DSPD", formats: ["CSV", "PDF", "837P EDI"], protocols: ["SFTP", "Web Portal Upload"], clearinghouse: "Sandata", programs: ["DSPD Waiver", "State-funded DD"] },
  { state: "Colorado", code: "CO", authority: "HCPF", formats: ["837P EDI", "CSV"], protocols: ["Direct EDI", "Web Portal Upload"], clearinghouse: "DXC Technology", programs: ["SLS Waiver", "CES Waiver"] },
  { state: "Texas", code: "TX", authority: "HHSC", formats: ["837P EDI", "CSV", "XML"], protocols: ["SFTP", "Web Portal Upload"], clearinghouse: "Gainwell Technologies", programs: ["CLASS", "HCS", "TxHmL"] },
  { state: "Ohio", code: "OH", authority: "DODD", formats: ["CSV", "PDF", "837P EDI"], protocols: ["Web Portal Upload", "Direct EDI"], clearinghouse: "Ohio Medicaid", programs: ["Level One Waiver", "SELF Waiver", "IO Waiver"] },
  { state: "New York", code: "NY", authority: "OPWDD", formats: ["XML", "837P EDI", "CSV"], protocols: ["API", "SFTP"], clearinghouse: "eMedNY", programs: ["HCBS Waiver", "Residential Habilitation", "Day Habilitation"] },
];

const FUNDER_METRICS = [
  "Total Active Clients", "Service Hours Delivered", "Goal Mastery Rate", "EVV Compliance Rate",
  "Incident Rate", "Staff Turnover Rate", "eMAR Accuracy", "Clean Claim Rate",
  "Authorization Utilization", "Community Integration Hours", "Session Note Timeliness", "Revenue YTD",
];

export default function FunderReportBuilder() {
  const [filters, setFilters] = useState({ dateRange: "90d", program: "all", fundingSource: "all" });
  const [subTab, setSubTab] = useState("state");
  const [showFunderDialog, setShowFunderDialog] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [funderForm, setFunderForm] = useState({
    report_name: "", funder_name: "", funder_type: "State Agency",
    date_from: "", date_to: "", schedule: "One-Time", include_branding: true,
  });
  const queryClient = useQueryClient();

  const { data: funderReports = [] } = useQuery({ queryKey: ["funder-reports"], queryFn: () => base44.entities.FunderReport.list() });
  const { data: reportArchive = [] } = useQuery({ queryKey: ["report-archive"], queryFn: () => base44.entities.ReportArchive.list("-created_date", 20) });

  const funderMutation = useMutation({
    mutationFn: d => base44.entities.FunderReport.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["funder-reports"] }); setShowFunderDialog(false); setSelectedMetrics([]); }
  });

  const archiveMutation = useMutation({
    mutationFn: d => base44.entities.ReportArchive.create(d),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["report-archive"] }),
  });

  const toggleMetric = m => setSelectedMetrics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const handleGenerateState = (template, format) => {
    archiveMutation.mutate({
      report_name: `${template.state} ${template.authority} Report`,
      report_type: "State Report",
      generated_by: "Admin",
      generated_at: new Date().toISOString(),
      parameters: JSON.stringify({ state: template.state, format, authority: template.authority }),
      format,
      submission_status: "Generated",
    });
    alert(`Generating ${template.state} ${template.authority} report in ${format} format...\n\nIn production, this would generate a state-compliant report and optionally submit via ${template.protocols[0]}.`);
  };

  const handleGenerateFunder = (report) => {
    archiveMutation.mutate({
      report_name: report.report_name,
      report_type: "Funder Report",
      generated_by: "Admin",
      generated_at: new Date().toISOString(),
      parameters: JSON.stringify({ funder: report.funder_name, metrics: report.metrics }),
      format: "PDF",
      submission_status: "Generated",
    });
    alert(`Generating funder report for ${report.funder_name}...\n\nIn production, this would compile a branded PDF with selected metrics and charts.`);
  };

  return (
    <div>
      <ReportFilterBar filters={filters} onChange={setFilters} onExport={fmt => console.log("Export funder", fmt)} onRefresh={() => {}} exportFormats={["PDF", "CSV", "Excel"]} />

      <Tabs value={subTab} onValueChange={setSubTab} className="mb-0">
        <TabsList className="mb-6">
          <TabsTrigger value="state" className="gap-2"><Globe className="w-3.5 h-3.5" /> State Reports</TabsTrigger>
          <TabsTrigger value="funder" className="gap-2"><Building className="w-3.5 h-3.5" /> Funder Reports</TabsTrigger>
          <TabsTrigger value="archive" className="gap-2"><FileText className="w-3.5 h-3.5" /> Report Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="state">
          <div className="grid grid-cols-1 gap-4">
            {STATE_TEMPLATES.map(template => (
              <Card key={template.code}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap gap-4 items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-500">
                          {template.code}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{template.state}</h3>
                          <p className="text-xs text-muted-foreground">Authority: {template.authority}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <div className="text-xs">
                          <span className="text-muted-foreground mr-1">Formats:</span>
                          {template.formats.map(f => <Badge key={f} variant="outline" className="mr-1 text-xs">{f}</Badge>)}
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground mr-1">Submission:</span>
                          {template.protocols.map(p => <Badge key={p} variant="outline" className="mr-1 text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">{p}</Badge>)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.programs.map(p => <span key={p} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{p}</span>)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Clearinghouse: {template.clearinghouse}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      {template.formats.slice(0, 3).map(fmt => (
                        <Button key={fmt} size="sm" variant="outline" className="gap-2" onClick={() => handleGenerateState(template, fmt)}>
                          <Download className="w-3.5 h-3.5" /> {fmt}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="funder">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Build custom reports for private funders, grant makers, and managed care organizations.</p>
            <Button size="sm" className="gap-2" onClick={() => setShowFunderDialog(true)}>
              <Plus className="w-4 h-4" /> New Funder Report
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {funderReports.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-foreground">{r.report_name}</h3>
                        <Badge variant="outline" className={r.status === "Active" ? "bg-green-500/10 text-green-500 border-green-500/20 text-xs" : "bg-muted text-muted-foreground text-xs"}>{r.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.funder_name} ({r.funder_type}) — {r.date_from} to {r.date_to}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Schedule: {r.schedule}</p>
                      {r.metrics?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {r.metrics.slice(0, 5).map(m => <span key={m} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">{m}</span>)}
                          {r.metrics.length > 5 && <span className="text-xs text-muted-foreground">+{r.metrics.length - 5} more</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => handleGenerateFunder(r)}>
                        <Download className="w-3.5 h-3.5" /> Generate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {funderReports.length === 0 && (
              <Card>
                <CardContent className="py-16 text-center">
                  <Building className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No funder reports configured yet.</p>
                  <Button size="sm" className="mt-4 gap-2" onClick={() => setShowFunderDialog(true)}>
                    <Plus className="w-4 h-4" /> Create First Report
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Dialog open={showFunderDialog} onOpenChange={setShowFunderDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>New Funder Report Template</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Report Name</label>
                    <Input placeholder="e.g. Q1 DSPD Performance Report" value={funderForm.report_name} onChange={e => setFunderForm(f => ({ ...f, report_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Funder Name</label>
                    <Input placeholder="e.g. Utah DSPD" value={funderForm.funder_name} onChange={e => setFunderForm(f => ({ ...f, funder_name: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Funder Type</label>
                    <Select value={funderForm.funder_type} onValueChange={v => setFunderForm(f => ({ ...f, funder_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["State Agency", "Managed Care Org", "Grant Maker", "Private Funder", "Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Schedule</label>
                    <Select value={funderForm.schedule} onValueChange={v => setFunderForm(f => ({ ...f, schedule: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["One-Time", "Weekly", "Monthly", "Quarterly"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Date From</label>
                    <Input type="date" value={funderForm.date_from} onChange={e => setFunderForm(f => ({ ...f, date_from: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Date To</label>
                    <Input type="date" value={funderForm.date_to} onChange={e => setFunderForm(f => ({ ...f, date_to: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Metrics to Include</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FUNDER_METRICS.map(m => (
                      <button key={m} onClick={() => toggleMetric(m)} className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${selectedMetrics.includes(m) ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "border-border hover:bg-muted/40 text-muted-foreground"}`}>
                        {selectedMetrics.includes(m) && "✓ "}{m}
                      </button>
                    ))}
                  </div>
                  {selectedMetrics.length > 0 && <p className="text-xs text-muted-foreground mt-2">{selectedMetrics.length} metrics selected</p>}
                </div>
                <Button className="w-full" onClick={() => funderMutation.mutate({ ...funderForm, metrics: selectedMetrics, status: "Active" })} disabled={funderMutation.isPending || !funderForm.report_name || !funderForm.funder_name}>
                  {funderMutation.isPending ? "Saving..." : "Save Report Template"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="archive">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Report Generation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportArchive.length > 0 ? (
                <div className="divide-y divide-border">
                  {reportArchive.map(r => (
                    <div key={r.id} className="py-3 flex items-center gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.report_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Generated by {r.generated_by} — {new Date(r.generated_at || r.created_date).toLocaleDateString()}
                        </p>
                        {r.recipient && <p className="text-xs text-muted-foreground">Sent to: {r.recipient}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">{r.format}</Badge>
                        <Badge variant="outline" className={r.submission_status === "Confirmed" ? "bg-green-500/10 text-green-500 border-green-500/20 text-xs" : "bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs"}>
                          {r.submission_status}
                        </Badge>
                        {r.file_url && (
                          <Button size="sm" variant="outline" className="gap-2">
                            <Download className="w-3.5 h-3.5" /> Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No reports generated yet. Generate a state or funder report to see it here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}