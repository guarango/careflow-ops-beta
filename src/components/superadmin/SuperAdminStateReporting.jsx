import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe, FileText, Download, Edit, CheckCircle2 } from "lucide-react";

const INITIAL_TEMPLATES = [
  { state_code: "UT", state_name: "Utah", report_name: "DSPD Service Delivery Report", report_type: "Service Delivery", clearinghouse: "Authenticare", file_format: "837P EDI", submission_protocol: "SFTP", frequency: "Monthly", regulatory_authority: "DSPD", description: "Division of Services for People with Disabilities — monthly service delivery and incident reporting.", is_active: true, version: "1.0" },
  { state_code: "UT", state_name: "Utah", report_name: "DSPD Incident Report", report_type: "Incident", clearinghouse: "Direct State", file_format: "XML", submission_protocol: "Web Portal Upload", frequency: "As Needed", regulatory_authority: "DSPD", description: "Critical incident report submission to Utah DSPD portal.", is_active: true, version: "1.0" },
  { state_code: "CO", state_name: "Colorado", report_name: "CCB HCBS Waiver Documentation", report_type: "Waiver Documentation", clearinghouse: "DXC Technology", file_format: "837P EDI", submission_protocol: "Direct EDI", frequency: "Monthly", regulatory_authority: "HCPF / CCB", description: "Community Centered Board HCBS waiver service documentation per HCPF requirements.", is_active: true, version: "1.0" },
  { state_code: "TX", state_name: "Texas", report_name: "HHSC EVV Reporting", report_type: "EVV", clearinghouse: "HHAeXchange", file_format: "CSV", submission_protocol: "API", frequency: "Daily", regulatory_authority: "HHSC", description: "Health and Human Services Commission EVV data submission for IDD waiver services.", is_active: true, version: "1.0" },
  { state_code: "TX", state_name: "Texas", report_name: "IDD Waiver Claims", report_type: "Claims", clearinghouse: "HHAeXchange", file_format: "837P EDI", submission_protocol: "Direct EDI", frequency: "Weekly", regulatory_authority: "HHSC", description: "Texas IDD waiver claims submission via HHAeXchange clearinghouse.", is_active: true, version: "1.0" },
  { state_code: "OH", state_name: "Ohio", report_name: "DODD Provider Portal Report", report_type: "Provider Portal", clearinghouse: "Sandata", file_format: "837P EDI", submission_protocol: "API", frequency: "Monthly", regulatory_authority: "DODD", description: "Department of Developmental Disabilities provider reporting and EVV via Sandata.", is_active: true, version: "1.0" },
  { state_code: "NY", state_name: "New York", report_name: "OPWDD / eMedNY Claims", report_type: "Claims", clearinghouse: "eMedNY", file_format: "837P EDI", submission_protocol: "Direct EDI", frequency: "Weekly", regulatory_authority: "OPWDD", description: "Office for People With Developmental Disabilities claims submission via eMedNY.", is_active: true, version: "1.0" },
  { state_code: "NY", state_name: "New York", report_name: "OPWDD HCBS Reporting", report_type: "Waiver Documentation", clearinghouse: "eMedNY", file_format: "XML", submission_protocol: "Web Portal Upload", frequency: "Monthly", regulatory_authority: "OPWDD", description: "OPWDD Home and Community Based Services documentation requirements.", is_active: true, version: "1.0" },
];

const empty = { state_code: "", state_name: "", report_name: "", report_type: "Service Delivery", clearinghouse: "Sandata", file_format: "837P EDI", submission_protocol: "SFTP", frequency: "Monthly", regulatory_authority: "", description: "", config_json: "", is_active: true, version: "1.0" };

export default function SuperAdminStateReporting() {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [seeding, setSeeding] = useState(false);
  const qc = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["state-report-templates"],
    queryFn: () => base44.entities.StateReportTemplate.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StateReportTemplate.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["state-report-templates"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StateReportTemplate.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["state-report-templates"] }); closeDialog(); },
  });

  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(empty); };
  const openNew = () => { setForm(empty); setEditing(null); setShowDialog(true); };
  const openEdit = (t) => { setForm(t); setEditing(t); setShowDialog(true); };
  const handleSave = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const handleSeedTemplates = async () => {
    setSeeding(true);
    for (const t of INITIAL_TEMPLATES) {
      await base44.entities.StateReportTemplate.create(t);
    }
    qc.invalidateQueries({ queryKey: ["state-report-templates"] });
    setSeeding(false);
  };

  const exportJSON = (t) => {
    const blob = new Blob([JSON.stringify(t, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${t.state_code}_${t.report_name.replace(/\s+/g, "_")}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const stateGroups = templates.reduce((acc, t) => {
    if (!acc[t.state_code]) acc[t.state_code] = [];
    acc[t.state_code].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />State Reporting Library</h2>
          <p className="text-xs text-muted-foreground mt-1">Configurable reporting templates — add new states without a platform redeploy.</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button size="sm" variant="outline" onClick={handleSeedTemplates} disabled={seeding} className="gap-1.5">
              {seeding ? "Seeding…" : "Seed Default Templates"}
            </Button>
          )}
          <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="w-3.5 h-3.5" />Add Template</Button>
        </div>
      </div>

      {templates.length === 0 && !isLoading && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Globe className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No state templates yet.</p>
          <p className="text-xs mt-1">Seed the default templates for UT, CO, TX, OH, NY or add your own.</p>
        </CardContent></Card>
      )}

      {Object.entries(stateGroups).sort(([a], [b]) => a.localeCompare(b)).map(([state, temps]) => (
        <Card key={state}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{state}</span>
              {temps[0]?.state_name}
              <Badge variant="outline" className="text-xs">{temps.length} template{temps.length !== 1 ? "s" : ""}</Badge>
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Clearinghouse</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Authority</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {temps.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-sm">{t.report_name}</TableCell>
                    <TableCell className="text-xs"><span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{t.report_type}</span></TableCell>
                    <TableCell className="text-xs">{t.clearinghouse}</TableCell>
                    <TableCell className="font-mono text-xs">{t.file_format}</TableCell>
                    <TableCell className="text-xs">{t.submission_protocol}</TableCell>
                    <TableCell className="text-xs">{t.frequency}</TableCell>
                    <TableCell className="text-xs font-medium text-primary">{t.regulatory_authority}</TableCell>
                    <TableCell>{t.is_active ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <span className="text-xs text-muted-foreground">Off</span>}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => exportJSON(t)}><Download className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ))}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit State Template" : "New State Reporting Template"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>State Code *</Label><Input value={form.state_code} onChange={e => setForm(f => ({ ...f, state_code: e.target.value.toUpperCase() }))} maxLength={2} placeholder="e.g. UT" /></div>
            <div><Label>State Name *</Label><Input value={form.state_name} onChange={e => setForm(f => ({ ...f, state_name: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Report Name *</Label><Input value={form.report_name} onChange={e => setForm(f => ({ ...f, report_name: e.target.value }))} /></div>
            <div>
              <Label>Report Type</Label>
              <Select value={form.report_type} onValueChange={v => setForm(f => ({ ...f, report_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Service Delivery","Incident","Claims","EVV","Waiver Documentation","Provider Portal","Custom"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Clearinghouse</Label>
              <Select value={form.clearinghouse} onValueChange={v => setForm(f => ({ ...f, clearinghouse: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Sandata","HHAeXchange","Authenticare","DXC Technology","Tellus","eMedNY","Direct State","Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>File Format</Label>
              <Select value={form.file_format} onValueChange={v => setForm(f => ({ ...f, file_format: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["837P EDI","837I EDI","835 ERA","270/271 EDI","CSV","XML","PDF","JSON","Custom"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Protocol</Label>
              <Select value={form.submission_protocol} onValueChange={v => setForm(f => ({ ...f, submission_protocol: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["SFTP","API","Web Portal Upload","Direct EDI","Manual"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Daily","Weekly","Monthly","Quarterly","As Needed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Regulatory Authority</Label><Input value={form.regulatory_authority} onChange={e => setForm(f => ({ ...f, regulatory_authority: e.target.value }))} placeholder="e.g. DSPD" /></div>
            <div><Label>Version</Label><Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="col-span-2"><Label>Config JSON (optional)</Label><Textarea value={form.config_json} onChange={e => setForm(f => ({ ...f, config_json: e.target.value }))} rows={3} placeholder='{"required_fields": ["medicaid_id", "npi"], "endpoint": "..."}' className="font-mono text-xs" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.state_code || !form.state_name || !form.report_name}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}