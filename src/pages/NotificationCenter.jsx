import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Pill, Target, Check, X, Download, Filter } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useRole } from "@/hooks/useRole";
import AccessDenied from "@/components/shared/AccessDenied";
import { cn } from "@/lib/utils";

const TYPE_LABELS = {
  emar_reminder: { label: "eMAR Reminder", color: "bg-blue-100 text-blue-700" },
  emar_missed: { label: "eMAR Missed", color: "bg-red-100 text-red-700" },
  goal_missed: { label: "Goal Missed", color: "bg-amber-100 text-amber-700" },
};

const STATUS_COLORS = {
  unread: "bg-blue-100 text-blue-700",
  read: "bg-gray-100 text-gray-600",
  acknowledged: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-400",
};

export default function NotificationCenter() {
  const { role } = useRole();
  const queryClient = useQueryClient();

  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClient, setFilterClient] = useState("");
  const [filterStaff, setFilterStaff] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [ackModal, setAckModal] = useState(null);
  const [ackNote, setAckNote] = useState("");

  const { data: notifications = [] } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => base44.entities.AppNotification.list("-created_date", 500),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppNotification.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  if (role !== "admin" && role !== "hr") return <AccessDenied />;

  const filtered = notifications.filter(n => {
    if (filterType !== "all" && n.type !== filterType) return false;
    if (filterStatus !== "all" && n.status !== filterStatus) return false;
    if (filterClient && !n.client_name?.toLowerCase().includes(filterClient.toLowerCase())) return false;
    if (filterStaff && !n.staff_name?.toLowerCase().includes(filterStaff.toLowerCase())) return false;
    if (filterDateFrom && n.created_date < filterDateFrom) return false;
    if (filterDateTo && n.created_date > filterDateTo + "T23:59:59") return false;
    return true;
  });

  const counts = {
    unread: notifications.filter(n => n.status === "unread").length,
    pending: notifications.filter(n => n.status === "read" && n.recipient_role === "admin").length,
    acknowledgedToday: notifications.filter(n => n.status === "acknowledged" && n.acknowledged_at?.startsWith(new Date().toISOString().split("T")[0])).length,
    dismissed: notifications.filter(n => n.status === "dismissed").length,
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(n => n.id)));
  };

  const bulkUpdate = async (data) => {
    for (const id of selected) {
      await base44.entities.AppNotification.update(id, data);
    }
    queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    setSelected(new Set());
  };

  const handleAckConfirm = async () => {
    if (!ackModal) return;
    await updateMutation.mutateAsync({ id: ackModal.id, data: { status: "acknowledged", acknowledged_note: ackNote, acknowledged_at: new Date().toISOString() } });
    setAckModal(null);
    setAckNote("");
  };

  const exportCSV = () => {
    const headers = ["Type", "Client", "Staff", "Message", "Triggered At", "Status", "Acknowledged Note"];
    const rows = filtered.map(n => [
      TYPE_LABELS[n.type]?.label || n.type,
      n.client_name || "",
      n.staff_name || "",
      `"${(n.message || "").replace(/"/g, '""')}"`,
      n.created_date ? format(new Date(n.created_date), "MM/dd/yyyy HH:mm") : "",
      n.status,
      `"${(n.acknowledged_note || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notifications-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Notification Center"
        subtitle="Monitor and manage all system notifications"
        action={
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Unread", count: counts.unread, color: "border-l-blue-500 bg-blue-50", textColor: "text-blue-700" },
          { label: "Pending Acknowledgment", count: counts.pending, color: "border-l-amber-500 bg-amber-50", textColor: "text-amber-700" },
          { label: "Acknowledged Today", count: counts.acknowledgedToday, color: "border-l-green-500 bg-green-50", textColor: "text-green-700" },
          { label: "Dismissed", count: counts.dismissed, color: "border-l-gray-400 bg-gray-50", textColor: "text-gray-600" },
        ].map(card => (
          <Card key={card.label} className={cn("border-l-4", card.color)}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={cn("text-2xl font-bold mt-1", card.textColor)}>{card.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
              <Filter className="w-4 h-4" /> Filters
            </div>
            <div className="w-36">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="emar_reminder">eMAR Reminder</SelectItem>
                  <SelectItem value="emar_missed">eMAR Missed</SelectItem>
                  <SelectItem value="goal_missed">Goal Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Client name..." value={filterClient} onChange={e => setFilterClient(e.target.value)} className="w-36 h-9" />
            <Input placeholder="Staff name..." value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="w-36 h-9" />
            <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-36 h-9" />
            <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-36 h-9" />
            <Button variant="ghost" size="sm" onClick={() => { setFilterType("all"); setFilterStatus("all"); setFilterClient(""); setFilterStaff(""); setFilterDateFrom(""); setFilterDateTo(""); }}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkUpdate({ status: "acknowledged", acknowledged_at: new Date().toISOString() })}>
            <Check className="w-3.5 h-3.5 mr-1.5" /> Bulk Acknowledge
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkUpdate({ status: "dismissed" })}>
            <X className="w-3.5 h-3.5 mr-1.5" /> Bulk Dismiss
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Cancel</Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} className="w-4 h-4 accent-primary" />
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Triggered At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No notifications match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(notif => {
                  const typeInfo = TYPE_LABELS[notif.type] || { label: notif.type, color: "bg-gray-100 text-gray-600" };
                  return (
                    <TableRow key={notif.id} className={notif.status === "unread" ? "bg-blue-50/30" : ""}>
                      <TableCell>
                        <input type="checkbox" checked={selected.has(notif.id)} onChange={() => toggleSelect(notif.id)} className="w-4 h-4 accent-primary" />
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", typeInfo.color)}>
                          {typeInfo.label}
                        </span>
                        {notif.is_controlled_substance && (
                          <div className="text-[10px] text-red-600 font-semibold mt-0.5">⚠️ CS</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{notif.client_name || "—"}</TableCell>
                      <TableCell className="text-sm">{notif.staff_name || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs">
                        <p className="line-clamp-2">{notif.message}</p>
                        {notif.acknowledged_note && (
                          <p className="mt-1 text-green-700 italic">Note: {notif.acknowledged_note}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {notif.created_date ? format(new Date(notif.created_date), "MM/dd/yy HH:mm") : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium capitalize", STATUS_COLORS[notif.status])}>
                          {notif.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(notif.status === "unread" || notif.status === "read") && (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setAckModal(notif); setAckNote(""); }}>
                              <Check className="w-3 h-3 mr-1" /> Ack
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-muted-foreground" onClick={() => updateMutation.mutate({ id: notif.id, data: { status: "dismissed" } })}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Acknowledge Modal */}
      <Dialog open={!!ackModal} onOpenChange={() => setAckModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Acknowledge Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground line-clamp-3">{ackModal?.message}</p>
            <div>
              <Label>Note (optional)</Label>
              <Textarea
                value={ackNote}
                onChange={e => setAckNote(e.target.value)}
                placeholder="Add a note about the follow-up action taken..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckModal(null)}>Cancel</Button>
            <Button onClick={handleAckConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}