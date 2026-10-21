import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Sparkles, Clock, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

const STATUS_STYLES = {
  "Draft": "bg-gray-100 text-gray-700",
  "Pending Review": "bg-amber-100 text-amber-700",
  "Signed": "bg-green-100 text-green-700",
  "Returned": "bg-red-100 text-red-700",
};

export default function MonthlySummaries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ["monthly-summaries"],
    queryFn: () => base44.entities.MonthlySummary.list("-period_start"),
  });

  const filtered = summaries.filter(s => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search && !s.client_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingReview = summaries.filter(s => s.status === "Pending Review").length;
  const signed = summaries.filter(s => s.status === "Signed").length;
  const drafts = summaries.filter(s => s.status === "Draft").length;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await base44.functions.invoke("generateMonthlySummaries", {});
      queryClient.invalidateQueries({ queryKey: ["monthly-summaries"] });
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Monthly Summaries
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-drafted monthly summaries for each active client, ready for review and signature
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
          <Sparkles className="w-4 h-4" />
          {generating ? "Generating..." : "Generate AI Drafts"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Pending Review" value={pendingReview} icon={<Clock className="w-4 h-4" />} color="text-amber-600" />
        <StatCard label="Signed" value={signed} icon={<CheckCircle2 className="w-4 h-4" />} color="text-green-600" />
        <StatCard label="Drafts" value={drafts} icon={<FileText className="w-4 h-4" />} color="text-gray-600" />
        <StatCard label="Total" value={summaries.length} icon={<AlertCircle className="w-4 h-4" />} color="text-blue-600" />
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
            <SelectItem value="Pending Review">Pending Review</SelectItem>
            <SelectItem value="Signed">Signed</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading summaries...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No summaries found. Click "Generate AI Drafts" to create them.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <Link
              key={s.id}
              to={`/summaries/monthly/${s.id}`}
              className="block border rounded-lg p-4 hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.client_name}</span>
                    <Badge className={STATUS_STYLES[s.status] || "bg-gray-100"}>{s.status}</Badge>
                    {s.ai_generated && <Badge variant="outline" className="gap-1"><Sparkles className="w-3 h-3" /> AI</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{s.month_year}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  {s.source_data && (
                    <div className="flex gap-3">
                      <span>{s.source_data.note_count} notes</span>
                      <span>{s.source_data.incident_count} incidents</span>
                      <span>{s.source_data.goals_charted_count} goals</span>
                    </div>
                  )}
                  {s.signed_by_name && (
                    <p className="mt-1">Signed by {s.signed_by_name}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
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