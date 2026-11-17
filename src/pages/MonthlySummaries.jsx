import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Sparkles, Search, Settings2, CalendarClock, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";
import SummaryDueCard from "@/components/summaries/SummaryDueCard";
import SummarySettingsDialog from "@/components/summaries/SummarySettingsDialog";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function MonthlySummaries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("deliverable");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ["monthly-summaries"],
    queryFn: () => base44.entities.MonthlySummary.list("-period_start"),
  });
  const { data: agencies = [] } = useQuery({
    queryKey: ["agency-settings"],
    queryFn: () => base44.entities.Agency.list(),
  });
  const agency = agencies[0];
  const summarySettings = agency?.notification_settings?.summaries || {};

  const matchesFilters = (s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search && !s.client_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  };

  const filtered = summaries.filter(matchesFilters);
  const deliverable = filtered.filter((s) => s.deliverable !== false);
  const internal = filtered.filter((s) => s.deliverable === false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateCadenceSummaries", { year: selectedYear, month: selectedMonth });
      if (res.data?.error) throw new Error(res.data.error);
      const counts = res.data?.counts;
      toast.success(`${MONTHS[selectedMonth]} ${selectedYear}: ${counts?.created || 0} created, ${counts?.updated || 0} updated`);
      queryClient.invalidateQueries({ queryKey: ["monthly-summaries"] });
    } catch (e) {
      toast.error("Generation failed: " + (e?.message || "Unknown error"));
    }
    setGenerating(false);
  };

  const handleGenerateAi = async () => {
    setAiGenerating(true);
    try {
      await base44.functions.invoke("generateMonthlySummaries", {
        year: selectedYear,
        month: selectedMonth,
        force_regenerate: true,
      });
      queryClient.invalidateQueries({ queryKey: ["monthly-summaries"] });
      toast.success("AI drafts written into this month's summaries.");
    } catch (e) {
      toast.error("AI draft failed: " + (e?.message || "Unknown error"));
    }
    setAiGenerating(false);
  };

  const handleSaveSettings = async (values) => {
    if (!agency) return;
    setSavingSettings(true);
    try {
      await base44.entities.Agency.update(agency.id, {
        notification_settings: { ...(agency.notification_settings || {}), summaries: values },
      });
      queryClient.invalidateQueries({ queryKey: ["agency-settings"] });
      setShowSettings(false);
      toast.success("Summary settings saved.");
    } catch (e) {
      toast.error("Could not save settings: " + (e?.message || "Unknown error"));
    }
    setSavingSettings(false);
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Summaries
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Due dates follow each service code's cadence (SOW 1.25). Managers review and sign.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={generating} className="gap-1.5 h-9">
            <PlusCircle className="w-4 h-4" />
            {generating ? "Generating..." : "Generate"}
          </Button>
          <Button variant="outline" onClick={handleGenerateAi} disabled={aiGenerating} className="gap-1.5 h-9">
            <Sparkles className="w-4 h-4" />
            {aiGenerating ? "Drafting..." : "AI drafts"}
          </Button>
          {user?.role === "admin" && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowSettings(true)} aria-label="Summary settings">
              <Settings2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Pending Review">Pending Review</SelectItem>
            <SelectItem value="Signed">Signed</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="deliverable">Due to support coordinator ({deliverable.length})</TabsTrigger>
          <TabsTrigger value="internal">Internal monthly notes ({internal.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="deliverable" className="mt-3">
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-1.5">
            <CalendarClock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Due dates use the agency setting of {summarySettings.due_days ?? 15} calendar days after the period ends. The state due date is not confirmed yet.
          </p>
          {isLoading ? (
            <p className="text-center py-10 text-muted-foreground text-sm">Loading summaries...</p>
          ) : deliverable.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              Nothing due to the support coordinator. Use Generate to create this month's records.
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {deliverable.map((s) => <SummaryDueCard key={s.id} summary={s} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="internal" className="mt-3">
          <p className="text-[11px] text-muted-foreground mb-3">
            Internal progress notes for quarterly-cadence services — written monthly while details are fresh, and kept out of what goes to the support coordinator.
            {summarySettings.internal_monthly_enabled === false && " Internal notes are currently turned off in settings."}
          </p>
          {isLoading ? (
            <p className="text-center py-10 text-muted-foreground text-sm">Loading summaries...</p>
          ) : internal.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              No internal monthly notes for this view.
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {internal.map((s) => <SummaryDueCard key={s.id} summary={s} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showSettings && (
        <SummarySettingsDialog
          settings={summarySettings}
          saving={savingSettings}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}