import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useRole } from "@/hooks/useRole";
import { logAudit } from "@/lib/auditLog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AccessDenied from "@/components/shared/AccessDenied";
import AnnualReportGrid from "@/components/reports/AnnualReportGrid";
import AnnualReportColumnsDialog from "@/components/reports/AnnualReportColumnsDialog";
import { ArrowLeft, CalendarClock, CheckCircle2, Columns3, Download, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_COLUMNS,
  currentFiscalYearEndYear,
  daysUntil,
  downloadCsv,
  fiscalYearBounds,
  fiscalYearOptions,
  loadAnnualReport,
  localTodayISO,
  toCsv,
} from "@/lib/annualReport";

const STATUS_STYLE = {
  "Not run": "bg-gray-100 text-gray-700",
  Run: "bg-blue-100 text-blue-700",
  Submitted: "bg-green-100 text-green-700",
};

export default function AnnualReport() {
  const { isAdmin, isReadOnly } = useRole();
  const [fye, setFye] = useState(currentFiscalYearEndYear());
  const [codes, setCodes] = useState([]);
  const [templates, setTemplates] = useState({});
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [scope, setScope] = useState("all");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [submissionDate, setSubmissionDate] = useState(localTodayISO());
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const bounds = fiscalYearBounds(fye);
  const days = daysUntil(bounds.due);
  const submitted = report?.status === "Submitted";

  const load = useCallback(async () => {
    setLoading(true);
    const data = await loadAnnualReport(fye);
    setCodes(data.codes);
    setTemplates(data.templates);
    setReport(data.report);
    setLoading(false);
  }, [fye]);

  useEffect(() => { load(); }, [load]);

  const runReport = async () => {
    setRunning(true);
    setError("");
    try {
      await base44.functions.invoke("generateAnnualReport", { fiscal_year_end_year: fye });
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "The report could not be generated.");
    } finally {
      setRunning(false);
    }
  };

  const selectedCode = scope !== "all" ? codes.find((c) => c.id === scope) : null;
  const selectedTemplate = selectedCode ? templates[selectedCode.id] : null;
  const columns = selectedTemplate?.columns?.length ? selectedTemplate.columns : DEFAULT_COLUMNS;
  const rows = (report?.rows || []).filter((r) => scope === "all" || r.service_code_id === scope);

  const exportCsv = () => {
    if (!rows.length) return;
    const suffix = selectedCode ? `-${selectedCode.code}` : "";
    downloadCsv(`annual-dspd-report-FY${fye}${suffix}.csv`, toCsv(columns, rows));
  };

  const saveManualValue = async (serviceCodeId, key, value) => {
    if (!report || isReadOnly) return;
    const nextRows = (report.rows || []).map((r) =>
      r.service_code_id === serviceCodeId
        ? { ...r, custom_values: { ...(r.custom_values || {}), [key]: value } }
        : r
    );
    await base44.entities.AnnualReport.update(report.id, { rows: nextRows });
    setReport({ ...report, rows: nextRows });
  };

  const recordSubmission = async () => {
    if (!report) return;
    if (!submissionDate) { setError("Enter the date you submitted the form."); return; }
    setSaving(true);
    setError("");
    try {
      const me = await base44.auth.me();
      await base44.entities.AnnualReport.update(report.id, {
        status: "Submitted",
        submission_date: submissionDate,
        submitted_by: me?.id || "",
        submitted_by_name: me?.full_name || me?.email || "",
        submitted_at: new Date().toISOString(),
        confirmation_number: confirmation,
      });
      await logAudit({
        action: "annual_report_submitted",
        target_type: "AnnualReport",
        target_id: report.id,
        target_name: report.fiscal_year_label || bounds.label,
        field: "submission_date",
        new_value: submissionDate,
        details: `Google Form submission recorded for ${report.fiscal_year_label || bounds.label}. Reminders stopped.`,
      });
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "The submission could not be recorded.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return <AccessDenied />;

  return (
    <div>
      <div className="mb-5">
        <Link to="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Reports
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-2">Annual DSPD report</h1>
        <p className="text-muted-foreground text-sm mt-1">
          One row per reported code for the state fiscal year, July 1 to June 30. Submitted through the state Google Form by August 30.
        </p>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="min-w-[240px]">
            <Label className="text-xs">Fiscal year</Label>
            <Select value={String(fye)} onValueChange={(v) => { setScope("all"); setFye(Number(v)); }}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fiscalYearOptions(4).map((y) => (
                  <SelectItem key={y} value={String(y)}>{fiscalYearBounds(y).label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[220px]">
            <Label className="text-xs">Rows</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reported codes</SelectItem>
                {codes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Badge className={cn("text-[10px]", STATUS_STYLE[report?.status || "Not run"])}>{loading ? "Loading" : report?.status || "Not run"}</Badge>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold",
                submitted
                  ? "text-green-700 bg-green-50 border border-green-200"
                  : days !== null && days < 0
                    ? "text-red-700 bg-red-50 border border-red-200"
                    : days !== null && days <= 45
                      ? "text-amber-800 bg-amber-50 border border-amber-200"
                      : "text-emerald-700 bg-emerald-50 border border-emerald-200"
              )}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              {submitted
                ? `Submitted ${report?.submission_date || ""}`
                : days === null
                  ? "No due date"
                  : days < 0
                    ? `Past due by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`
                    : days === 0
                      ? "Due today (Aug 30)"
                      : `${days} day${days === 1 ? "" : "s"} to Aug 30`}
            </span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Button onClick={runReport} disabled={running || isReadOnly} className="gap-1.5">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {report ? "Run report again" : "Run report"}
        </Button>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length} className="gap-1.5">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
        <Button variant="outline" onClick={() => setColumnsOpen(true)} disabled={!selectedCode} className="gap-1.5">
          <Columns3 className="w-4 h-4" /> Edit columns
        </Button>
        {!selectedCode && (
          <span className="text-[11px] text-muted-foreground">Choose a single code to rename or add its columns.</span>
        )}
        {report?.last_run_at && (
          <span className="text-[11px] text-muted-foreground ml-auto">
            Last run {new Date(report.last_run_at).toLocaleString()} by {report.last_run_by_name}
          </span>
        )}
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card py-10 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <AnnualReportGrid
          columns={columns}
          rows={rows}
          editing={Boolean(selectedCode) && !isReadOnly}
          onManualChange={saveManualValue}
        />
      )}

      <Card className="mt-4">
        <CardContent className="p-4">
          {submitted ? (
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Submission recorded</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {report.submission_date} · recorded by {report.submitted_by_name || "admin"}
                  {report.confirmation_number ? ` · confirmation ${report.confirmation_number}` : ""}
                  {" · reminders stopped"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs">Date submitted in the state Google Form</Label>
                <Input type="date" value={submissionDate} onChange={(e) => setSubmissionDate(e.target.value)} className="h-9 mt-1 w-44" />
              </div>
              <div>
                <Label className="text-xs">Confirmation number (optional)</Label>
                <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="h-9 mt-1 w-56" />
              </div>
              <Button onClick={recordSubmission} disabled={saving || !report || isReadOnly} className="gap-1.5">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Record submission
              </Button>
              <p className="text-[11px] text-muted-foreground">Recording the date closes the reminder task.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AnnualReportColumnsDialog
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        code={selectedCode ? { id: selectedCode.id, code: selectedCode.code, label: selectedCode.description } : null}
        template={selectedTemplate}
        onSaved={() => load()}
      />
    </div>
  );
}