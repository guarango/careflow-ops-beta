import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/hooks/useRole";
import { useToast } from "@/components/ui/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  FileSignature, Plus, Search, Send, Edit, Trash2, Package,
  Pen, CheckCircle2, Clock, AlertTriangle, FileText, Layers
} from "lucide-react";
import TemplateBuilder from "@/components/signatures/TemplateBuilder";
import SendSignatureDialog from "@/components/signatures/SendSignatureDialog";
import AccessDenied from "@/components/shared/AccessDenied";

// ─── TEMPLATES TAB ─────────────────────────────────────────────────────────
function TemplatesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["sig-templates"],
    queryFn: () => base44.entities.SignatureTemplate.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SignatureTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sig-templates"] }); setBuilderOpen(false); setEditing(null); toast({ title: "Template saved" }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SignatureTemplate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sig-templates"] }); setBuilderOpen(false); setEditing(null); toast({ title: "Template updated" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SignatureTemplate.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sig-templates"] }); toast({ title: "Template deleted" }); },
  });

  const filtered = templates.filter(t =>
    `${t.name} ${t.description}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (data) => {
    if (editing?.id) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => { setEditing(null); setBuilderOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={FileSignature} title="No templates yet" description="Upload a document and place signature fields." action={<Button onClick={() => setBuilderOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1" />New Template</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm leading-tight">{t.name}</h3>
                      <span className="text-xs text-muted-foreground">v{t.version || 1}</span>
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                {t.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{t.description}</p>}
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">{t.fields?.length || 0} fields</Badge>
                  <Badge variant="outline" className="text-xs">{t.document_type}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => { setEditing(t); setBuilderOpen(true); }}>
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(t.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {builderOpen && (
        <TemplateBuilder
          template={editing}
          onSave={handleSave}
          onCancel={() => { setBuilderOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ─── PACKETS TAB ───────────────────────────────────────────────────────────
function PacketsTab({ templates }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", template_ids: [], default_due_days: 7, auto_send_on_hire: false, auto_send_roles: [] });

  const { data: packets = [] } = useQuery({
    queryKey: ["sig-packets"],
    queryFn: () => base44.entities.SignaturePacket.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SignaturePacket.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sig-packets"] }); setShowDialog(false); toast({ title: "Packet created" }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SignaturePacket.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sig-packets"] }); setShowDialog(false); toast({ title: "Packet updated" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SignaturePacket.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sig-packets"] }); toast({ title: "Packet deleted" }); },
  });

  const filtered = packets.filter(p =>
    `${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditing(null); setForm({ name: "", description: "", template_ids: [], default_due_days: 7, auto_send_on_hire: false, auto_send_roles: [] }); setShowDialog(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, description: p.description || "", template_ids: p.template_ids || [], default_due_days: p.default_due_days || 7, auto_send_on_hire: p.auto_send_on_hire || false, auto_send_roles: p.auto_send_roles || [] }); setShowDialog(true); };

  const toggleTemplate = (tid) => {
    setForm(f => ({
      ...f,
      template_ids: f.template_ids.includes(tid)
        ? f.template_ids.filter(x => x !== tid)
        : [...f.template_ids, tid],
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (form.template_ids.length === 0) { toast({ title: "Select at least one template", variant: "destructive" }); return; }
    const templateNames = form.template_ids.map(id => templates.find(t => t.id === id)?.name).filter(Boolean);
    const data = { ...form, template_names: templateNames };
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search packets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> New Packet</Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No packets yet" description="Group templates into packets for bulk sending." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(p => (
            <Card key={p.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Package className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{p.name}</h3>
                      <span className="text-xs text-muted-foreground">{p.template_ids?.length || 0} templates</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {p.description && <p className="text-xs text-muted-foreground mb-2">{p.description}</p>}
                <div className="flex flex-wrap gap-1 mb-2">
                  {(p.template_names || []).map((n, i) => <Badge key={i} variant="outline" className="text-xs">{n}</Badge>)}
                </div>
                <div className="flex items-center gap-2">
                  {p.auto_send_on_hire && <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">Auto-send on hire</Badge>}
                  <Badge variant="outline" className="text-xs">Due in {p.default_due_days || 7}d</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Packet" : "New Packet"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Packet Name *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. New Hire Packet" /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div>
              <Label>Templates *</Label>
              <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                {templates.length === 0 && <p className="text-xs text-muted-foreground p-2">No templates available. Create templates first.</p>}
                {templates.map(t => (
                  <label key={t.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer">
                    <input type="checkbox" checked={form.template_ids.includes(t.id)} onChange={() => toggleTemplate(t.id)} className="w-4 h-4" />
                    <span className="text-sm">{t.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{t.fields?.length || 0} fields</span>
                  </label>
                ))}
              </div>
            </div>
            <div><Label>Default Due (days)</Label><Input type="number" value={form.default_due_days} onChange={(e) => setForm(f => ({ ...f, default_due_days: parseInt(e.target.value) || 7 }))} min={1} /></div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.auto_send_on_hire} onChange={(e) => setForm(f => ({ ...f, auto_send_on_hire: e.target.checked }))} className="w-4 h-4" />
              <span className="text-sm">Auto-send when a new employee is created</span>
            </label>
            {form.auto_send_on_hire && (
              <div>
                <Label>Auto-send for Roles</Label>
                <Select value={form.auto_send_roles?.[0] || ""} onValueChange={(v) => setForm(f => ({ ...f, auto_send_roles: v ? [v] : [] }))}>
                  <SelectTrigger><SelectValue placeholder="All roles" /></SelectTrigger>
                  <SelectContent>
                    {["DSP", "Nurse", "QIDP", "Supervisor", "Admin", "Other"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── TRACKING TAB ──────────────────────────────────────────────────────────
function TrackingTab({ staff }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sendOpen, setSendOpen] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["sig-templates"],
    queryFn: () => base44.entities.SignatureTemplate.list(),
  });
  const { data: packets = [] } = useQuery({
    queryKey: ["sig-packets"],
    queryFn: () => base44.entities.SignaturePacket.list(),
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["sig-requests"],
    queryFn: () => base44.entities.SignatureRequest.list("-created_date"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SignatureRequest.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sig-requests"] }),
  });

  const sendMutation = useMutation({
    mutationFn: async (payload) => {
      const now = new Date().toISOString();
      const templatesToUse = payload.sendType === "packet"
        ? (payload.packet?.template_ids || []).map(tid => templates.find(t => t.id === tid)).filter(Boolean)
        : [payload.template];

      const requests = [];
      for (const recipient of payload.recipients) {
        for (const tmpl of templatesToUse) {
          requests.push({
            template_id: tmpl.id,
            template_name: tmpl.name,
            packet_id: payload.sendType === "packet" ? payload.packet.id : null,
            packet_name: payload.sendType === "packet" ? payload.packet.name : null,
            staff_id: recipient.staff_id,
            staff_name: recipient.staff_name,
            staff_email: recipient.staff_email,
            staff_role: recipient.staff_role,
            sent_by: "",
            sent_by_name: "",
            sent_at: now,
            due_date: payload.dueDate,
            status: "Sent",
          });
        }
      }
      const created = await base44.entities.SignatureRequest.bulkCreate(requests);

      // Build staff_id -> user_id map for notifications
      const userIdMap = {};
      for (const r of payload.recipients) {
        if (r.user_id) userIdMap[r.staff_id] = r.user_id;
      }

      // Create in-app notifications so staff see the request at login
      const notifications = [];
      for (const req of created) {
        const userId = userIdMap[req.staff_id];
        if (!userId) continue;
        notifications.push({
          type: "document_to_sign",
          recipient_user_id: userId,
          recipient_email: req.staff_email || "",
          recipient_role: "staff",
          staff_id: req.staff_id,
          staff_name: req.staff_name,
          related_record_id: req.id,
          related_record_type: "signature_request",
          message: `You have a document to sign: "${req.template_name}"${req.packet_name ? ` (from ${req.packet_name})` : ""}. Due ${req.due_date}.`,
          deep_link: `/sign?request_id=${req.id}`,
          status: "unread",
        });
      }
      if (notifications.length > 0) {
        await base44.entities.AppNotification.bulkCreate(notifications).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sig-requests"] });
      toast({ title: "Signature requests sent" });
    },
  });

  const STATUS_CHIPS = ["All", "Sent", "Viewed", "Signed", "Overdue"];

  const filtered = requests.filter(r => {
    const matchesSearch = `${r.staff_name} ${r.template_name} ${r.packet_name}`.toLowerCase().includes(search.toLowerCase());
    let isOverdue = false;
    if (r.due_date && r.status !== "Signed" && r.status !== "Voided") {
      isOverdue = differenceInDays(parseISO(r.due_date), new Date()) < 0;
    }
    const effectiveStatus = isOverdue ? "Overdue" : r.status;
    const matchesStatus = statusFilter === "All" || effectiveStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sent = requests.filter(r => r.status === "Sent").length;
  const viewed = requests.filter(r => r.status === "Viewed").length;
  const signed = requests.filter(r => r.status === "Signed").length;
  const overdue = requests.filter(r => r.due_date && r.status !== "Signed" && r.status !== "Voided" && differenceInDays(parseISO(r.due_date), new Date()) < 0).length;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Send className="w-4 h-4 text-blue-500" /><span className="text-xs text-muted-foreground">Sent</span></div>
          <p className="text-2xl font-bold text-blue-600">{sent}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-amber-500" /><span className="text-xs text-muted-foreground">Viewed</span></div>
          <p className="text-2xl font-bold text-amber-600">{viewed}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Signed</span></div>
          <p className="text-2xl font-bold text-emerald-600">{signed}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="text-xs text-muted-foreground">Overdue</span></div>
          <p className="text-2xl font-bold text-red-600">{overdue}</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by staff or document..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setSendOpen(true)}><Send className="w-4 h-4 mr-2" /> Send for Signature</Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_CHIPS.map(chip => (
          <button key={chip} onClick={() => setStatusFilter(chip)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${statusFilter === chip ? "bg-primary text-white border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}>
            {chip}
          </button>
        ))}
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={FileSignature} title="No signature requests" description="Send a template or packet to get started." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  let isOverdue = false;
                  if (r.due_date && r.status !== "Signed" && r.status !== "Voided") {
                    isOverdue = differenceInDays(parseISO(r.due_date), new Date()) < 0;
                  }
                  const effectiveStatus = isOverdue ? "Overdue" : r.status;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.staff_name || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {r.packet_name ? `${r.packet_name} (${r.template_name})` : r.template_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.sent_at ? format(new Date(r.sent_at), "MM/dd/yyyy") : "—"}</TableCell>
                      <TableCell className="text-sm">
                        {r.due_date ? (
                          <span className={isOverdue ? "text-red-600 font-medium" : ""}>{r.due_date}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell><StatusBadge status={effectiveStatus} /></TableCell>
                      <TableCell>
                        {r.status !== "Voided" && (
                          <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => updateMutation.mutate({ id: r.id, data: { status: "Voided", voided_at: new Date().toISOString() } })}>
                            Void
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
      )}

      <SendSignatureDialog
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        templates={templates}
        packets={packets}
        staff={staff}
        onSend={(payload) => sendMutation.mutate(payload)}
      />
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function ESignatures() {
  const { role, can } = useRole();
  const [activeTab, setActiveTab] = useState("templates");

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["sig-templates"],
    queryFn: () => base44.entities.SignatureTemplate.list(),
  });

  if (!can("manageSignatures")) {
    return <AccessDenied />;
  }

  return (
    <div>
      <PageHeader
        title="E-Signatures"
        subtitle="Paperless document signing for HR & Compliance"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="templates" className="gap-2"><FileSignature className="w-4 h-4" />Templates</TabsTrigger>
          <TabsTrigger value="packets" className="gap-2"><Package className="w-4 h-4" />Packets</TabsTrigger>
          <TabsTrigger value="tracking" className="gap-2"><Layers className="w-4 h-4" />Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="packets"><PacketsTab templates={templates} /></TabsContent>
        <TabsContent value="tracking"><TrackingTab staff={staff} /></TabsContent>
      </Tabs>
    </div>
  );
}