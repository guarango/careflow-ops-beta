import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FileText, Clock, AlertTriangle, CheckCircle2, Send, Search, Plus, Loader2 } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { STATUS_STYLES, effectiveStatus } from "@/lib/quarterlySummary";
import toast from "react-hot-toast";

export default function QuarterlySummaries() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newDialog, setNewDialog] = useState(false);
  const [clientId, setClientId] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ["quarterly-summaries"],
    queryFn: () => base44.entities.QuarterlySummary.list("-due_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-active"],
    queryFn: () => base44.entities.Client.filter({ status: "Active" }),
  });

  const withStatus = summaries.map(s => ({ ...s, effective_status: effectiveStatus(s) }));

  const filtered = withStatus.filter(s => {
    if (statusFilter !== "all" && s.effective_status !== statusFilter) return false;
    if (search && !s.client_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const late = withStatus.filter(s => s.effective_status === "Late").length;
  const open = withStatus.filter(s => ["Draft", "Ready"].includes(s.effective_status)).length;
  const signed = withStatus.filter(s => s.effective_status === "Signed").length;
  const sent = withStatus.filter(s => s.effective_status === "Sent").length;

  const generate = async () => {
    if (!clientId) return;
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateQuarterlySummary", { client_id: clientId });
      queryClient.invalidateQueries({ queryKey: ["quarterly-summaries"] });
      setNewDialog(false);
      setClientId("");
      toast.success(`Built ${res.data?.quarter || "quarterly"} summary for ${res.data?.client_name || "client"}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not build the summary");
    }
    setGenerating(false);
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Quarterly Summaries
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            DHHS 91172 quarterly summaries (SOW 1.25). Due to the support coordinator 15 calendar days after the quarter ends.
          </p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => setNewDialog(true)}>
          <Plus className="w-4 h-4" /> New quarterly
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Late" value={late} icon={<AlertTriangle className="w-4 h-4" />} color="text-red-600" />
        <StatCard label="Draft / Ready" value={open} icon={<Clock className="w-4 h-4" />} color="text-amber-600" />
        <StatCard label="Signed" value={signed} icon={<CheckCircle2 className="w-4 h-4" />} color="text-blue-600" />
        <StatCard label="Sent" value={sent} icon={<Send className="w-4 h-4" />} color="text-green-600" />
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by client name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Late">Late</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Ready">Ready</SelectItem>
            <SelectItem value="Signed">Signed</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No quarterly summaries yet. Create one from a client's quarter of records.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const dueDate = s.due_date ? new Date(`${s.due_date}T00:00:00`) : null;
            const daysLeft = dueDate ? differenceInCalendarDays(dueDate, new Date()) : null;
            const isLate = s.effective_status === "Late";
            return (
              <Link
                key={s.id}
                to={`/summaries/quarterly/${s.id}`}
                className="block border rounded-lg p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{s.client_name}</span>
                      <Badge variant="outline" className={STATUS_STYLES[s.effective_status]}>{s.effective_status}</Badge>
                      <span className="text-xs text-muted-foreground">{s.quarter}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {dueDate && <span>Due: {format(dueDate, "MMM d, yyyy")}</span>}
                      {s.effective_status === "Sent" ? (
                        <span className="text-green-600">
                          Sent {s.sent_to_sc_date ? format(new Date(`${s.sent_to_sc_date}T00:00:00`), "MMM d") : ""}
                          {s.sent_to ? ` to ${s.sent_to}` : ""}
                        </span>
                      ) : isLate ? (
                        <span className="text-red-600 font-medium">{Math.abs(daysLeft)} day(s) late</span>
                      ) : (
                        <span className={daysLeft !== null && daysLeft <= 7 ? "text-amber-600 font-medium" : ""}>
                          {daysLeft} day(s) left
                        </span>
                      )}
                      {s.writer_name && <span>Writer: {s.writer_name}</span>}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <p>{s.services_provided?.length || 0} service(s)</p>
                    <p className="mt-1">{s.goal_progress?.length || 0} goal(s)</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Build a quarterly summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Builds the summary for the most recently completed quarter from that quarter's session notes, goal data
              and incidents.
            </p>
            <div>
              <Label className="text-xs">Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancel</Button>
            <Button onClick={generate} disabled={!clientId || generating} className="gap-1">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Build
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={color}>{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}