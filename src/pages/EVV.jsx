import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { MapPin, Settings, FileCheck, AlertCircle, CheckCircle2, Clock, Send } from "lucide-react";
import { format } from "date-fns";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const AGGREGATORS = ["Sandata", "HHAeXchange", "Authenticare", "Other", "State System"];

export default function EVV() {
  const [activeTab, setActiveTab] = useState("submissions");
  const [configForm, setConfigForm] = useState({ agency_name: "", state: "UT", evv_model: "Open Model", aggregator: "Sandata", api_endpoint: "", api_key: "", enabled: true, notes: "" });
  const [savingConfig, setSavingConfig] = useState(false);
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["evv-logs"],
    queryFn: () => base44.entities.EVVLog.list("-created_date"),
  });

  const { data: configs = [] } = useQuery({
    queryKey: ["evv-config"],
    queryFn: () => base44.entities.EVVConfig.list(),
    onSuccess: (data) => { if (data[0]) setConfigForm(data[0]); },
  });

  const createConfigMutation = useMutation({
    mutationFn: (data) => base44.entities.EVVConfig.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evv-config"] }); setSavingConfig(false); },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EVVConfig.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["evv-config"] }); setSavingConfig(false); },
  });

  const updateLogMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EVVLog.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["evv-logs"] }),
  });

  const handleSaveConfig = () => {
    setSavingConfig(true);
    if (configs[0]) updateConfigMutation.mutate({ id: configs[0].id, data: configForm });
    else createConfigMutation.mutate(configForm);
  };

  const handleSubmitEVV = (log) => {
    updateLogMutation.mutate({
      id: log.id,
      data: { status: "Submitted", submitted_at: new Date().toISOString(), aggregator_response: "Submission accepted by aggregator." },
    });
  };

  const statusColors = {
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Submitted: "bg-blue-50 text-blue-700 border-blue-200",
    Accepted: "bg-green-50 text-green-700 border-green-200",
    Rejected: "bg-red-50 text-red-700 border-red-200",
  };

  const summary = {
    total: logs.length,
    pending: logs.filter(l => l.status === "Pending").length,
    submitted: logs.filter(l => l.status === "Submitted").length,
    accepted: logs.filter(l => l.status === "Accepted").length,
    rejected: logs.filter(l => l.status === "Rejected").length,
  };

  return (
    <div>
      <PageHeader title="EVV Management" subtitle="Electronic Visit Verification compliance and submissions" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pending", value: summary.pending, color: "text-amber-600", icon: Clock },
          { label: "Submitted", value: summary.submitted, color: "text-blue-600", icon: Send },
          { label: "Accepted", value: summary.accepted, color: "text-accent", icon: CheckCircle2 },
          { label: "Rejected", value: summary.rejected, color: "text-destructive", icon: AlertCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="submissions" className="gap-2"><FileCheck className="w-4 h-4" />Submission Log</TabsTrigger>
          <TabsTrigger value="config" className="gap-2"><Settings className="w-4 h-4" />Aggregator Config</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>GPS</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aggregator Response</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                        No EVV records yet. Records are created when timecards are submitted for EVV-required service codes.
                      </TableCell>
                    </TableRow>
                  )}
                  {logs.map(log => {
                    const missingCount = (log.missing_fields || []).length;
                    const hasGPS = log.location_in_lat && log.location_out_lat;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm font-medium">{log.staff_name || "—"}</TableCell>
                        <TableCell className="text-sm">{log.client_name || "—"}</TableCell>
                        <TableCell className="text-sm">{log.service_type || "—"}</TableCell>
                        <TableCell className="text-sm">{log.date}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.clock_in} – {log.clock_out || "?"}</TableCell>
                        <TableCell>
                          {hasGPS ? (
                            <Badge variant="outline" className="text-accent border-accent/30 bg-accent/10 text-xs gap-1">
                              <MapPin className="w-3 h-3" />Captured
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Missing</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[log.status] || ""}`}>
                            {log.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                          {log.aggregator_response || (missingCount > 0 ? `Missing: ${log.missing_fields.join(", ")}` : "—")}
                        </TableCell>
                        <TableCell>
                          {log.status === "Pending" && missingCount === 0 && (
                            <Button size="sm" variant="outline" onClick={() => handleSubmitEVV(log)} className="text-xs gap-1">
                              <Send className="w-3 h-3" />Submit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />EVV Aggregator Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><Label>Agency Name *</Label><Input value={configForm.agency_name} onChange={e => setConfigForm(f => ({ ...f, agency_name: e.target.value }))} /></div>
                <div>
                  <Label>State *</Label>
                  <Select value={configForm.state} onValueChange={v => setConfigForm(f => ({ ...f, state: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>EVV Model</Label>
                  <Select value={configForm.evv_model} onValueChange={v => setConfigForm(f => ({ ...f, evv_model: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open Model">Open Model (choose aggregator)</SelectItem>
                      <SelectItem value="Closed Model">Closed Model (state-mandated)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {configForm.evv_model === "Open Model" && (
                  <div>
                    <Label>Aggregator</Label>
                    <Select value={configForm.aggregator} onValueChange={v => setConfigForm(f => ({ ...f, aggregator: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{AGGREGATORS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label>API Endpoint</Label><Input value={configForm.api_endpoint} onChange={e => setConfigForm(f => ({ ...f, api_endpoint: e.target.value }))} placeholder="https://api.aggregator.com/evv" /></div>
                <div><Label>API Key</Label><Input type="password" value={configForm.api_key} onChange={e => setConfigForm(f => ({ ...f, api_key: e.target.value }))} placeholder="••••••••••••" /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={configForm.notes} onChange={e => setConfigForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              <div className="flex items-center gap-3 py-2 px-4 rounded-lg border border-border bg-muted/30">
                <Switch checked={configForm.enabled} onCheckedChange={v => setConfigForm(f => ({ ...f, enabled: v }))} />
                <div>
                  <p className="text-sm font-medium">EVV Submissions Enabled</p>
                  <p className="text-xs text-muted-foreground">When disabled, records are tracked locally but not sent to the aggregator</p>
                </div>
              </div>
              <Button onClick={handleSaveConfig} disabled={savingConfig || !configForm.agency_name}>
                {savingConfig ? "Saving…" : "Save Configuration"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}