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
import ReportStatCard from "./ReportStatCard";
import { Shield, FileText, Clock, AlertTriangle, CheckCircle, Download, Plus, Package } from "lucide-react";

export default function ComplianceAuditReport() {
  const [filters, setFilters] = useState({ dateRange: "90d", program: "all", fundingSource: "all" });
  const [subTab, setSubTab] = useState("overview");
  const [showAccredDialog, setShowAccredDialog] = useState(false);
  const [accredForm, setAccredForm] = useState({ body: "CARF", survey_date: "", next_survey_date: "", status: "In Progress", outcome_summary: "" });
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({ queryKey: ["notes-comp"], queryFn: () => base44.entities.SessionNote.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents-comp"], queryFn: () => base44.entities.IncidentReport.list() });
  const { data: staff = [] } = useQuery({ queryKey: ["staff-comp"], queryFn: () => base44.entities.StaffMember.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-comp"], queryFn: () => base44.entities.Client.list() });
  const { data: auths = [] } = useQuery({ queryKey: ["auths-comp"], queryFn: () => base44.entities.Authorization.list() });
  const { data: docs = [] } = useQuery({ queryKey: ["docs-comp"], queryFn: () => base44.entities.ComplianceDocument.list() });
  const { data: evv = [] } = useQuery({ queryKey: ["evv-comp"], queryFn: () => base44.entities.EVVLog.list() });
  const { data: accreds = [] } = useQuery({ queryKey: ["accreds-comp"], queryFn: () => base44.entities.AccreditationRecord.list() });

  const accredMutation = useMutation({
    mutationFn: d => base44.entities.AccreditationRecord.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["accreds-comp"] }); setShowAccredDialog(false); }
  });

  const unsignedNotes = notes.filter(n => !n.signed_date && n.status !== "Signed");
  const openIncidents = incidents.filter(i => i.status !== "Closed" && i.status !== "Resolved");
  const reportableIncidents = incidents.filter(i => i.reportable && i.status !== "Submitted");
  const expiredCerts = staff.filter(s => s.certifications?.some(c => c.status === "Expired")).length;
  const expiredAuths = auths.filter(a => { const e = new Date(a.end_date); const n30 = new Date(); n30.setDate(n30.getDate() + 30); return a.status === "Approved" && e <= n30; });
  const pendingDocs = docs.filter(d => d.status === "Pending" || d.status === "Requested");
  const verifiedEVV = evv.filter(e => e.status === "Verified" || e.clock_out_time);
  const evvRate = evv.length ? Math.round(verifiedEVV.length / evv.length * 100) : 0;
  const noteTimeliness = notes.length ? Math.round(notes.filter(n => n.signed_date || n.status === "Signed").length / notes.length * 100) : 0;

  const generateAuditPackage = (type, id) => {
    console.log(`Generating ${type} audit package for`, id);
    alert(`Generating ${type} audit package... In production, this would compile all records into a PDF with table of contents.`);
  };

  return (
    <div>
      <ReportFilterBar filters={filters} onChange={setFilters} onExport={fmt => console.log("Export compliance", fmt)} onRefresh={() => {}} exportFormats={["PDF", "CSV"]} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <ReportStatCard title="Unsigned Notes" value={unsignedNotes.length} subtitle="Pending signature" color={unsignedNotes.length > 10 ? "red" : "amber"} icon={FileText} />
        <ReportStatCard title="Open Incidents" value={openIncidents.length} subtitle="Require review" color={openIncidents.length > 5 ? "red" : "amber"} icon={AlertTriangle} />
        <ReportStatCard title="Reportable Incidents" value={reportableIncidents.length} subtitle="Pending submission" color={reportableIncidents.length > 0 ? "red" : "green"} icon={AlertTriangle} />
        <ReportStatCard title="Expired Certs" value={expiredCerts} subtitle="Staff members" color={expiredCerts > 3 ? "red" : expiredCerts > 0 ? "amber" : "green"} icon={Shield} />
        <ReportStatCard title="EVV Compliance" value={`${evvRate}%`} subtitle="Verified visits" color={evvRate >= 95 ? "green" : "amber"} icon={CheckCircle} />
        <ReportStatCard title="Note Timeliness" value={`${noteTimeliness}%`} subtitle="Submitted on time" color={noteTimeliness >= 90 ? "green" : "amber"} icon={Clock} />
      </div>

      <Tabs value={subTab} onValueChange={setSubTab} className="mb-0">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Compliance Overview</TabsTrigger>
          <TabsTrigger value="audit-packages">Audit Packages</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
          <TabsTrigger value="accreditation">Accreditation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Open Compliance Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: `${unsignedNotes.length} unsigned session notes`, severity: unsignedNotes.length > 10 ? "high" : "medium", action: "View Notes" },
                    { label: `${openIncidents.length} incidents pending review`, severity: openIncidents.length > 5 ? "high" : "medium", action: "View Incidents" },
                    { label: `${reportableIncidents.length} reportable incidents not yet submitted`, severity: "high", action: "Submit Now" },
                    { label: `${expiredCerts} staff with expired certifications`, severity: expiredCerts > 3 ? "high" : "low", action: "View Staff" },
                    { label: `${expiredAuths.length} authorizations expiring in 30 days`, severity: expiredAuths.length > 3 ? "high" : "medium", action: "View Auths" },
                    { label: `${pendingDocs.length} documents pending signature`, severity: pendingDocs.length > 0 ? "medium" : "low", action: "View Docs" },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                      item.severity === "high" ? "bg-red-500/10 border-red-500/20" :
                      item.severity === "medium" ? "bg-amber-500/10 border-amber-500/20" :
                      "bg-green-500/10 border-green-500/20"
                    }`}>
                      <p className="text-sm font-medium flex-1">{item.label}</p>
                      <Badge variant="outline" className={
                        item.severity === "high" ? "bg-red-500/10 text-red-500 border-red-500/20 ml-2 flex-shrink-0" :
                        item.severity === "medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20 ml-2 flex-shrink-0" :
                        "bg-green-500/10 text-green-500 border-green-500/20 ml-2 flex-shrink-0"
                      }>{item.severity.toUpperCase()}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Compliance Score by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mt-2">
                  {[
                    { label: "EVV Compliance", pct: evvRate, color: evvRate >= 95 ? "bg-green-500" : "bg-amber-500" },
                    { label: "Session Note Timeliness", pct: noteTimeliness, color: noteTimeliness >= 90 ? "bg-green-500" : "bg-amber-500" },
                    { label: "Staff Certification Compliance", pct: staff.length ? Math.round((staff.length - expiredCerts) / staff.length * 100) : 0, color: "bg-blue-500" },
                    { label: "Incident Reporting Timeliness", pct: incidents.length ? Math.round((incidents.length - openIncidents.length) / incidents.length * 100) : 100, color: "bg-purple-500" },
                    { label: "Document Signature Rate", pct: docs.length ? Math.round((docs.filter(d => d.status === "Signed" || d.status === "Approved").length) / docs.length * 100) : 0, color: "bg-cyan-500" },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-bold text-foreground">{row.pct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${row.color} rounded-full transition-all duration-500`} style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Authorization Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {auths.slice(0, 6).map(a => {
                    const daysLeft = a.end_date ? Math.ceil((new Date(a.end_date) - new Date()) / (1000*60*60*24)) : null;
                    return (
                      <div key={a.id} className="py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.client_name}</p>
                          <p className="text-xs text-muted-foreground">{a.service_code} — {a.payer}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-medium">{daysLeft !== null ? `${daysLeft}d left` : "No end date"}</p>
                          <Badge variant="outline" className={
                            !daysLeft || daysLeft <= 0 ? "bg-red-500/10 text-red-500 border-red-500/20 text-xs" :
                            daysLeft <= 30 ? "bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs" :
                            "bg-green-500/10 text-green-500 border-green-500/20 text-xs"
                          }>{a.status}</Badge>
                        </div>
                      </div>
                    );
                  })}
                  {auths.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No authorization data</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Incident Reporting Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {incidents.slice(0, 6).map(inc => (
                    <div key={inc.id} className="py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{inc.client_name}</p>
                        <p className="text-xs text-muted-foreground">{inc.incident_type} — {inc.incident_date}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {inc.reportable && <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Reportable</Badge>}
                        <Badge variant="outline" className={
                          inc.status === "Closed" || inc.status === "Resolved" ? "bg-green-500/10 text-green-500 border-green-500/20 text-xs" :
                          "bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs"
                        }>{inc.status || "Open"}</Badge>
                      </div>
                    </div>
                  ))}
                  {incidents.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No incident data</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit-packages">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" /> Client Audit Package
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate a complete audit-ready package for any client: demographics, authorizations, service history, session notes, incidents, goals, eMAR, and signed documents.
                </p>
                <div className="space-y-2">
                  {clients.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-muted-foreground">{c.service_enrollments?.[0]?.service_type || "Service Enrollment"}</p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => generateAuditPackage("Client", c.id)}>
                        <Download className="w-3.5 h-3.5" /> Generate PDF
                      </Button>
                    </div>
                  ))}
                  {clients.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No clients found</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-500" /> Staff Audit Package
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate a complete staff compliance package: profile, certifications, training, background check, performance reviews, and timecard history.
                </p>
                <div className="space-y-2">
                  {staff.slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-muted-foreground">{s.role}</p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => generateAuditPackage("Staff", s.id)}>
                        <Download className="w-3.5 h-3.5" /> Generate PDF
                      </Button>
                    </div>
                  ))}
                  {staff.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No staff found</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documentation">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Unsigned Session Notes</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {unsignedNotes.slice(0, 8).map(n => {
                    const daysOld = n.created_date ? Math.ceil((new Date() - new Date(n.created_date)) / (1000*60*60*24)) : 0;
                    return (
                      <div key={n.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{n.client_name || "Client"}</p>
                          <p className="text-xs text-muted-foreground">By {n.staff_name || "DSP"} — {n.session_date || n.created_date?.split("T")[0]}</p>
                        </div>
                        <Badge variant="outline" className={daysOld > 7 ? "bg-red-500/10 text-red-500 border-red-500/20 text-xs" : "bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs"}>
                          {daysOld}d old
                        </Badge>
                      </div>
                    );
                  })}
                  {unsignedNotes.length === 0 && (
                    <div className="py-8 text-center">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">All session notes are signed</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Pending Document Signatures</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {pendingDocs.slice(0, 8).map(d => (
                    <div key={d.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.document_name || d.title || "Document"}</p>
                        <p className="text-xs text-muted-foreground">{d.staff_name || d.client_name || "Recipient"}</p>
                      </div>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">{d.status}</Badge>
                    </div>
                  ))}
                  {pendingDocs.length === 0 && (
                    <div className="py-8 text-center">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No pending document signatures</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accreditation">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Track CARF, CQL, and other accreditation survey schedules and outcomes.</p>
            <Button size="sm" className="gap-2" onClick={() => setShowAccredDialog(true)}>
              <Plus className="w-4 h-4" /> Add Accreditation Record
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {accreds.map(a => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-foreground">{a.body} Accreditation</h3>
                        <Badge variant="outline" className={
                          a.status === "Accredited" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                          a.status === "In Progress" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }>{a.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Survey: {a.survey_date} {a.next_survey_date && `| Next: ${a.next_survey_date}`}</p>
                      {a.outcome_summary && <p className="text-sm mt-2 text-foreground">{a.outcome_summary}</p>}
                      {a.corrective_action_plan && (
                        <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                          <p className="text-xs font-medium text-amber-500">Corrective Action Plan</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.corrective_action_plan}</p>
                          {a.cap_due_date && <p className="text-xs text-amber-500 mt-0.5">Due: {a.cap_due_date}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {accreds.length === 0 && (
              <Card>
                <CardContent className="py-16 text-center">
                  <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No accreditation records yet.</p>
                  <Button size="sm" className="mt-4 gap-2" onClick={() => setShowAccredDialog(true)}>
                    <Plus className="w-4 h-4" /> Add First Record
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Dialog open={showAccredDialog} onOpenChange={setShowAccredDialog}>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Accreditation Record</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Accrediting Body</label>
                  <Select value={accredForm.body} onValueChange={v => setAccredForm(f => ({ ...f, body: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["CARF", "CQL", "Joint Commission", "State Licensure", "Other"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Survey Date</label>
                    <Input type="date" value={accredForm.survey_date} onChange={e => setAccredForm(f => ({ ...f, survey_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Next Survey Date</label>
                    <Input type="date" value={accredForm.next_survey_date} onChange={e => setAccredForm(f => ({ ...f, next_survey_date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <Select value={accredForm.status} onValueChange={v => setAccredForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Accredited", "Conditionally Accredited", "In Progress", "Expired", "Denied"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Outcome Summary</label>
                  <Input placeholder="Brief summary of survey outcome..." value={accredForm.outcome_summary} onChange={e => setAccredForm(f => ({ ...f, outcome_summary: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={() => accredMutation.mutate(accredForm)} disabled={accredMutation.isPending}>
                  {accredMutation.isPending ? "Saving..." : "Save Record"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}