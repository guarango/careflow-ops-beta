import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Clock, AlertTriangle, CheckCircle2, Send, Search } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";

const STATUS_STYLES = {
  "Draft": "bg-gray-100 text-gray-700",
  "Pending Review": "bg-amber-100 text-amber-700",
  "Signed": "bg-blue-100 text-blue-700",
  "Sent to SC": "bg-green-100 text-green-700",
  "Overdue": "bg-red-100 text-red-700",
};

export default function QuarterlySummaries() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(null);
  const [sendDialog, setSendDialog] = useState(null);
  const [sendMethod, setSendMethod] = useState("Email");

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ["quarterly-summaries"],
    queryFn: () => base44.entities.QuarterlySummary.list("-due_date"),
  });

  const filtered = summaries.filter(s => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search && !s.client_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const overdue = summaries.filter(s => s.status === "Overdue").length;
  const pending = summaries.filter(s => s.status === "Pending Review" || s.status === "Draft").length;
  const signed = summaries.filter(s => s.status === "Signed").length;
  const sent = summaries.filter(s => s.status === "Sent to SC").length;

  const handleAssemble = async (clientId) => {
    setGenerating(clientId);
    try {
      await base44.functions.invoke("generateQuarterlySummary", { client_id: clientId });
      queryClient.invalidateQueries({ queryKey: ["quarterly-summaries"] });
    } catch (e) {
      console.error(e);
    }
    setGenerating(null);
  };

  const handleSendToSC = async () => {
    if (!sendDialog) return;
    try {
      const now = new Date().toISOString();
      await base44.entities.QuarterlySummary.update(sendDialog.id, {
        status: "Sent to SC",
        sent_to_support_coordinator: true,
        sent_to_sc_at: now,
        sent_to_sc_method: sendMethod,
        sent_to_sc_by: sendDialog.client_name,
      });
      queryClient.invalidateQueries({ queryKey: ["quarterly-summaries"] });
      setSendDialog(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Quarterly Summaries
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          DHHS 91172 quarterly summaries assembled from signed monthly summaries. Due 15 days after quarter end.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Overdue" value={overdue} icon={<AlertTriangle className="w-4 h-4" />} color="text-red-600" />
        <StatCard label="Pending" value={pending} icon={<Clock className="w-4 h-4" />} color="text-amber-600" />
        <StatCard label="Signed" value={signed} icon={<CheckCircle2 className="w-4 h-4" />} color="text-blue-600" />
        <StatCard label="Sent to SC" value={sent} icon={<Send className="w-4 h-4" />} color="text-green-600" />
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
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
            <SelectItem value="Pending Review">Pending Review</SelectItem>
            <SelectItem value="Signed">Signed</SelectItem>
            <SelectItem value="Sent to SC">Sent to SC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No quarterly summaries yet. They are auto-generated when all 3 monthly summaries are signed.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const dueDate = new Date(s.due_date);
            const daysLeft = differenceInCalendarDays(dueDate, new Date());
            const isOverdue = daysLeft < 0 && s.status !== "Sent to SC";
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
                      <Badge className={STATUS_STYLES[s.status] || "bg-gray-100"}>{s.status}</Badge>
                      <span className="text-xs text-muted-foreground">{s.quarter}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Due: {format(dueDate, "MMM d, yyyy")}</span>
                      {isOverdue ? (
                        <span className="text-red-600 font-medium">{Math.abs(daysLeft)} days overdue</span>
                      ) : s.status !== "Sent to SC" ? (
                        <span className={daysLeft <= 7 ? "text-amber-600 font-medium" : ""}>{daysLeft} days left</span>
                      ) : (
                        <span className="text-green-600">Sent {s.sent_to_sc_at ? format(new Date(s.sent_to_sc_at), "MMM d") : ""}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    {s.monthly_summary_ids && <p>{s.monthly_summary_ids.length}/3 monthly summaries</p>}
                    {s.signed_by_name && <p className="mt-1">Signed by {s.signed_by_name}</p>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
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