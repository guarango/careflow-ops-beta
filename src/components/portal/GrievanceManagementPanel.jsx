import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Shield, CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_FLOW = ["Submitted", "Acknowledged", "Under Investigation", "Resolved", "Escalated"];
const statusColors = {
  "Submitted": "bg-blue-100 text-blue-700",
  "Acknowledged": "bg-amber-100 text-amber-700",
  "Under Investigation": "bg-violet-100 text-violet-700",
  "Resolved": "bg-emerald-100 text-emerald-700",
  "Escalated": "bg-red-100 text-red-700",
};

function GrievanceRow({ g, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    status: g.status,
    assigned_to: g.assigned_to || "",
    expected_resolution_date: g.expected_resolution_date || "",
    investigation_notes: g.investigation_notes || "",
    resolution_summary: g.resolution_summary || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const urgencyHours = g.submitted_date
    ? Math.round((Date.now() - new Date(g.submitted_date).getTime()) / 3600000)
    : null;
  const overdue = urgencyHours !== null && urgencyHours > 24 && g.status === "Submitted";

  return (
    <Card className={cn("border-0 shadow-sm", overdue && "border-2 border-red-200")}>
      <button className="w-full text-left" onClick={() => setExpanded(e => !e)}>
        <div className="p-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className={statusColors[g.status]}>{g.status}</Badge>
              <Badge variant="outline" className="text-xs">{g.grievance_type}</Badge>
              <Badge variant="outline" className="text-xs">{g.severity}</Badge>
              {overdue && <Badge className="bg-red-100 text-red-700 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Overdue — {urgencyHours}h without acknowledgment</Badge>}
            </div>
            <p className="text-sm font-medium text-slate-800">{g.client_name} · From: {g.portal_user_name}</p>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{g.description}</p>
            <p className="text-xs text-slate-400 mt-1">{g.submitted_date ? format(new Date(g.submitted_date), "MMM d, yyyy h:mm a") : ""}</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t pt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Full description:</p>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{g.description}</p>
          </div>
          {g.desired_resolution && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Desired resolution:</p>
              <p className="text-sm text-slate-700">{g.desired_resolution}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Update Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_FLOW.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Assigned To</Label>
              <Input value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)} className="mt-1 text-sm" placeholder="Investigator name" />
            </div>
            <div>
              <Label className="text-xs">Expected Resolution Date</Label>
              <Input type="date" value={form.expected_resolution_date} onChange={e => set("expected_resolution_date", e.target.value)} className="mt-1 text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Investigation Notes (internal only)</Label>
            <Textarea rows={3} value={form.investigation_notes} onChange={e => set("investigation_notes", e.target.value)} className="mt-1 text-sm" placeholder="Document investigation steps, findings..." />
          </div>

          {form.status === "Resolved" && (
            <div>
              <Label className="text-xs">Resolution Summary (sent to family member)</Label>
              <p className="text-[10px] text-slate-400 mt-0.5 mb-1">This will be shared with the family member through the portal. Write clearly and without defensive language.</p>
              <Textarea rows={4} value={form.resolution_summary} onChange={e => set("resolution_summary", e.target.value)} className="mt-1 text-sm" placeholder="What was investigated, what was found, what was done..." />
            </div>
          )}

          <Button
            size="sm"
            onClick={() => onUpdate(g.id, {
              ...form,
              acknowledged_at: form.status !== "Submitted" && !g.acknowledged_at ? new Date().toISOString() : g.acknowledged_at,
              resolved_at: form.status === "Resolved" && !g.resolved_at ? new Date().toISOString() : g.resolved_at,
              resolution_sent_at: form.status === "Resolved" && form.resolution_summary && !g.resolution_sent_at ? new Date().toISOString() : g.resolution_sent_at,
            })}
            className="bg-sky-600 hover:bg-sky-700 gap-2"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />Save Changes
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function GrievanceManagementPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("Open");

  const { data: grievances = [] } = useQuery({
    queryKey: ["all-grievances"],
    queryFn: () => base44.entities.PortalGrievance.list("-submitted_date"),
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PortalGrievance.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-grievances"] }),
  });

  const open = grievances.filter(g => !["Resolved"].includes(g.status));
  const overdue = open.filter(g => {
    const hours = g.submitted_date ? Math.round((Date.now() - new Date(g.submitted_date).getTime()) / 3600000) : 0;
    return hours > 24 && g.status === "Submitted";
  });

  const displayed = filter === "Open" ? open : filter === "All" ? grievances : grievances.filter(g => g.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />Grievance & Concern Management
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">All submissions route directly to program director. 24-hour acknowledgment required.</p>
        </div>
        <div className="flex gap-1.5">
          {["Open", "Resolved", "All"].map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="h-7 text-xs">{f}</Button>
          ))}
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">{overdue.length} grievance{overdue.length !== 1 ? "s" : ""} past 24-hour acknowledgment deadline</p>
            {overdue.map((g, i) => <p key={i} className="text-xs text-red-700">• {g.client_name} — {g.grievance_type} ({g.portal_user_name})</p>)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Open", value: open.length, color: "text-amber-600" },
          { label: "Overdue", value: overdue.length, color: "text-red-600" },
          { label: "Total (30d)", value: grievances.length, color: "text-slate-600" },
        ].map(s => (
          <div key={s.label} className="border border-slate-200 rounded-xl p-3 text-center bg-white">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="border-dashed border-2 border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400">
          No {filter.toLowerCase()} grievances.
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(g => (
            <GrievanceRow key={g.id} g={g} onUpdate={(id, data) => update.mutate({ id, data })} />
          ))}
        </div>
      )}
    </div>
  );
}