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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus, FileCheck, Star, Plus, Search, Send, CheckCircle2,
  Clock, AlertTriangle, FileText, Eye
} from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";

// ─── ONBOARDING TAB ────────────────────────────────────────────────────────
function OnboardingTab({ staff }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ staff_id: "", staff_name: "", document_name: "", sent_date: format(new Date(), "yyyy-MM-dd"), status: "Pending" });

  const { data: docs = [] } = useQuery({
    queryKey: ["onboarding-docs"],
    queryFn: () => base44.entities.OnboardingDocument.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OnboardingDocument.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["onboarding-docs"] }); setShowDialog(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OnboardingDocument.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding-docs"] }),
  });

  const filtered = docs.filter(d =>
    `${d.staff_name} ${d.document_name} ${d.status}`.toLowerCase().includes(search.toLowerCase())
  );

  const pending = docs.filter(d => d.status === "Pending").length;
  const signed = docs.filter(d => d.status === "Signed").length;

  const handleStaffSelect = (staffId) => {
    const s = staff.find(st => st.id === staffId);
    setForm(f => ({ ...f, staff_id: staffId, staff_name: s ? `${s.first_name} ${s.last_name}` : "" }));
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Send className="w-4 h-4 text-blue-500" /><span className="text-xs text-muted-foreground">Pending Signature</span></div>
          <p className="text-2xl font-bold text-blue-600">{pending}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Signed & Complete</span></div>
          <p className="text-2xl font-bold text-emerald-600">{signed}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Total Sent</span></div>
          <p className="text-2xl font-bold">{docs.length}</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search onboarding documents…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => { setForm({ staff_id: "", staff_name: "", document_name: "", sent_date: format(new Date(), "yyyy-MM-dd"), status: "Pending" }); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />Send Document
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signed</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-sm">No onboarding documents sent yet.</TableCell></TableRow>
              )}
              {filtered.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.staff_name || "—"}</TableCell>
                  <TableCell className="text-sm">{doc.document_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{doc.sent_date}</TableCell>
                  <TableCell><StatusBadge status={doc.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{doc.signed_date || "—"}</TableCell>
                  <TableCell>
                    {doc.status === "Pending" && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => updateMutation.mutate({ id: doc.id, data: { status: "Signed", signed_date: format(new Date(), "yyyy-MM-dd") } })}>
                        <CheckCircle2 className="w-3 h-3 mr-1" />Mark Signed
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Send Onboarding Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Staff Member *</Label>
              <Select value={form.staff_id} onValueChange={handleStaffSelect}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Document Name *</Label><Input value={form.document_name} onChange={e => setForm(f => ({ ...f, document_name: e.target.value }))} placeholder="e.g. Employee Handbook, I-9, W-4" /></div>
            <div><Label>Sent Date</Label><Input type="date" value={form.sent_date} onChange={e => setForm(f => ({ ...f, sent_date: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.staff_id || !form.document_name}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── DOCUMENT COMPLIANCE TAB ─────────────────────────────────────────────
function DocumentComplianceTab({ staff }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyDoc = { staff_id: "", staff_name: "", document_type: "", expiration_date: "", status: "Active", notes: "" };
  const [form, setForm] = useState(emptyDoc);

  const { data: compDocs = [] } = useQuery({
    queryKey: ["compliance-docs"],
    queryFn: () => base44.entities.StaffComplianceDocument.list("-expiration_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffComplianceDocument.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["compliance-docs"] }); setShowDialog(false); setForm(emptyDoc); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffComplianceDocument.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["compliance-docs"] }); setShowDialog(false); setEditing(null); },
  });

  const getExpiryStatus = (dateStr) => {
    if (!dateStr) return null;
    const days = differenceInDays(parseISO(dateStr), new Date());
    if (days < 0) return { label: "Expired", color: "bg-red-100 text-red-700 border-red-200" };
    if (days <= 30) return { label: `Expires in ${days}d`, color: "bg-amber-100 text-amber-700 border-amber-200" };
    if (days <= 90) return { label: `Expires in ${days}d`, color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    return { label: "Valid", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  };

  const expiring = compDocs.filter(d => {
    if (!d.expiration_date) return false;
    const days = differenceInDays(parseISO(d.expiration_date), new Date());
    return days >= 0 && days <= 30;
  }).length;
  const expired = compDocs.filter(d => {
    if (!d.expiration_date) return false;
    return differenceInDays(parseISO(d.expiration_date), new Date()) < 0;
  }).length;

  const filtered = compDocs.filter(d =>
    `${d.staff_name} ${d.document_type} ${d.status}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleStaffSelect = (staffId) => {
    const s = staff.find(st => st.id === staffId);
    setForm(f => ({ ...f, staff_id: staffId, staff_name: s ? `${s.first_name} ${s.last_name}` : "" }));
  };

  return (
    <div>
      {expired > 0 && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span><strong>{expired}</strong> expired document{expired !== 1 ? "s" : ""} require immediate attention.</span>
        </div>
      )}
      {expiring > 0 && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <Clock className="w-4 h-4 shrink-0" />
          <span><strong>{expiring}</strong> document{expiring !== 1 ? "s" : ""} expiring within 30 days.</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search compliance documents…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => { setForm(emptyDoc); setEditing(null); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />Add Document
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">No compliance documents tracked yet.</TableCell></TableRow>
              )}
              {filtered.map(doc => {
                const expiryStatus = getExpiryStatus(doc.expiration_date);
                return (
                  <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setForm(doc); setEditing(doc); setShowDialog(true); }}>
                    <TableCell className="font-medium">{doc.staff_name || "—"}</TableCell>
                    <TableCell className="text-sm">{doc.document_type}</TableCell>
                    <TableCell className="text-sm">{doc.expiration_date || "No expiry"}</TableCell>
                    <TableCell>
                      {expiryStatus ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${expiryStatus.color}`}>{expiryStatus.label}</span>
                      ) : (
                        <StatusBadge status={doc.status} />
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{doc.notes || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Document" : "Add Compliance Document"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Staff Member *</Label>
              <Select value={form.staff_id} onValueChange={handleStaffSelect}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document Type *</Label>
              <Select value={form.document_type} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {["Driver's License", "CPR Certification", "First Aid", "Background Check", "Abuse/Neglect Registry", "Professional License", "TB Test", "Physical Exam", "Other"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Expiration Date</Label><Input type="date" value={form.expiration_date} onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Pending">Pending Renewal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => editing ? updateMutation.mutate({ id: editing.id, data: form }) : createMutation.mutate(form)} disabled={!form.staff_id || !form.document_type}>
              {editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── PERFORMANCE MANAGEMENT TAB ───────────────────────────────────────────
function PerformanceTab({ staff }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyReview = { staff_id: "", staff_name: "", review_date: format(new Date(), "yyyy-MM-dd"), review_type: "Annual", rating: "", notes: "", goals: "", status: "Draft" };
  const [form, setForm] = useState(emptyReview);

  const { data: reviews = [] } = useQuery({
    queryKey: ["performance-reviews"],
    queryFn: () => base44.entities.PerformanceReview.list("-review_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PerformanceReview.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["performance-reviews"] }); setShowDialog(false); setForm(emptyReview); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PerformanceReview.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["performance-reviews"] }); setShowDialog(false); setEditing(null); },
  });

  const filtered = reviews.filter(r =>
    `${r.staff_name} ${r.review_type} ${r.status}`.toLowerCase().includes(search.toLowerCase())
  );

  const ratingColor = (r) => {
    if (!r) return "";
    const n = parseFloat(r);
    if (n >= 4) return "text-emerald-600";
    if (n >= 3) return "text-blue-600";
    if (n >= 2) return "text-amber-600";
    return "text-red-600";
  };

  const handleStaffSelect = (staffId) => {
    const s = staff.find(st => st.id === staffId);
    setForm(f => ({ ...f, staff_id: staffId, staff_name: s ? `${s.first_name} ${s.last_name}` : "" }));
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search reviews…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => { setForm(emptyReview); setEditing(null); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />New Review
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-sm">No performance reviews yet.</TableCell></TableRow>
              )}
              {filtered.map(r => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setForm(r); setEditing(r); setShowDialog(true); }}>
                  <TableCell className="font-medium">{r.staff_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{r.review_type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{r.review_date}</TableCell>
                  <TableCell>
                    {r.rating ? <span className={`font-semibold text-sm ${ratingColor(r.rating)}`}>{r.rating}/5</span> : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{r.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Review" : "New Performance Review"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Staff Member *</Label>
              <Select value={form.staff_id} onValueChange={handleStaffSelect}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Review Type</Label>
                <Select value={form.review_type} onValueChange={v => setForm(f => ({ ...f, review_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Annual", "90-Day", "Corrective Action", "Check-In", "Termination"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Review Date</Label><Input type="date" value={form.review_date} onChange={e => setForm(f => ({ ...f, review_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rating (1–5)</Label>
                <Select value={form.rating} onValueChange={v => setForm(f => ({ ...f, rating: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4", "5"].map(v => <SelectItem key={v} value={v}>{v} — {["Poor", "Below Avg", "Meets Expectations", "Exceeds", "Outstanding"][parseInt(v) - 1]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Draft", "Completed", "Acknowledged"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes / Summary</Label><Textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Review notes, observations, corrective action details…" /></div>
            <div><Label>Goals</Label><Textarea value={form.goals || ""} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} rows={2} placeholder="Goals for next review period…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => editing ? updateMutation.mutate({ id: editing.id, data: form }) : createMutation.mutate(form)} disabled={!form.staff_id}>
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function HRCompliance() {
  const [activeTab, setActiveTab] = useState("onboarding");

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const activeStaff = staff.filter(s => s.status === "Active").length;

  return (
    <div>
      <PageHeader
        title="HR & Compliance"
        subtitle={`${activeStaff} active staff · Onboarding, document compliance, and performance`}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="onboarding" className="gap-2">
            <UserPlus className="w-4 h-4" />Onboarding
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileCheck className="w-4 h-4" />Document Compliance
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <Star className="w-4 h-4" />Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding">
          <OnboardingTab staff={staff} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentComplianceTab staff={staff} />
        </TabsContent>
        <TabsContent value="performance">
          <PerformanceTab staff={staff} />
        </TabsContent>
      </Tabs>
    </div>
  );
}