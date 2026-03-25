import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertTriangle, Send, Download, Search, RefreshCw, FileText } from "lucide-react";

const STATUS_COLORS = {
  Draft: "bg-gray-100 text-gray-700 border-gray-200",
  "Validation Failed": "bg-red-50 text-red-700 border-red-200",
  Ready: "bg-green-50 text-green-700 border-green-200",
  Submitted: "bg-blue-50 text-blue-700 border-blue-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Denied: "bg-red-100 text-red-800 border-red-300",
  Appealed: "bg-purple-50 text-purple-700 border-purple-200",
  Adjusted: "bg-sky-50 text-sky-700 border-sky-200",
};

const VALIDATION_RULES = [
  { key: "evv", label: "EVV Verified", check: (c) => c.evv_verified },
  { key: "medicaid_id", label: "Client Medicaid ID", check: (c) => !!c.client_medicaid_id },
  { key: "auth_number", label: "Authorization Number", check: (c) => !!c.auth_number },
  { key: "procedure_code", label: "Procedure Code", check: (c) => !!c.procedure_code },
  { key: "amount", label: "Amount > 0", check: (c) => (c.amount_billed || 0) > 0 },
];

function validateClaim(claim) {
  const errors = [];
  VALIDATION_RULES.forEach(rule => {
    if (!rule.check(claim)) errors.push(`Missing: ${rule.label}`);
  });
  return errors;
}

function generateClaimNumber() {
  return `CLM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
}

export default function ClaimsQueue() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationReport, setValidationReport] = useState({ passed: [], failed: [] });
  const qc = useQueryClient();

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["claims"],
    queryFn: () => base44.entities.Claim.list("-created_date"),
  });

  const updateClaim = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Claim.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["claims"] }),
  });

  const handleValidateAll = () => {
    const passed = [];
    const failed = [];
    claims.filter(c => ["Draft", "Validation Failed", "Ready"].includes(c.status)).forEach(claim => {
      const errors = validateClaim(claim);
      if (errors.length === 0) {
        passed.push(claim);
        updateClaim.mutate({ id: claim.id, data: { status: "Ready", validation_errors: [] } });
      } else {
        failed.push({ ...claim, validation_errors: errors });
        updateClaim.mutate({ id: claim.id, data: { status: "Validation Failed", validation_errors: errors } });
      }
    });
    setValidationReport({ passed, failed });
    setShowValidation(true);
  };

  const handleSubmitReady = () => {
    claims.filter(c => c.status === "Ready").forEach(claim => {
      updateClaim.mutate({
        id: claim.id,
        data: {
          status: "Submitted",
          submission_date: new Date().toISOString().split("T")[0],
          claim_number: claim.claim_number || generateClaimNumber(),
        },
      });
    });
  };

  const handleExportEDI = (claim) => {
    const edi = generateEDI837(claim);
    const blob = new Blob([edi], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${claim.claim_number || "claim"}_837P.edi`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateEDI837 = (claim) => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return [
      `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *${today}*1200*^*00501*000000001*0*P*:~`,
      `GS*HC*SENDER*RECEIVER*${today}*1200*1*X*005010X222A1~`,
      `ST*837*0001*005010X222A1~`,
      `BPR*I*${(claim.amount_billed || 0).toFixed(2)}*C*ACH*CCP*01*BANKID*DA*ACCTNUM*01*PAYERBANKID*DA*PAYERACCT*${today}~`,
      `NM1*85*2*AGENCY NAME*****XX*${claim.client_medicaid_id || "UNKNOWN"}~`,
      `CLM*${claim.claim_number || "CLM001"}*${(claim.amount_billed || 0).toFixed(2)}***11:B:1*Y*A*Y*I~`,
      `DTP*472*D8*${(claim.service_date || "").replace(/-/g, "")}~`,
      `LX*1~`,
      `SV1*HC:${claim.procedure_code || "T2016"}*${(claim.amount_billed || 0).toFixed(2)}*UN*${claim.units_billed || 1}***1~`,
      `SE*9*0001~`,
      `GE*1*1~`,
      `IEA*1*000000001~`,
    ].join("\n");
  };

  const filtered = claims.filter(c => {
    const matchSearch = `${c.client_name} ${c.service_code} ${c.claim_number}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const readyCt = claims.filter(c => c.status === "Ready").length;
  const failedCt = claims.filter(c => c.status === "Validation Failed").length;
  const submittedCt = claims.filter(c => c.status === "Submitted" || c.status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Claims", value: claims.length, color: "text-foreground" },
          { label: "Ready to Submit", value: readyCt, color: "text-accent" },
          { label: "Validation Failed", value: failedCt, color: "text-destructive" },
          { label: "Submitted / Pending", value: submittedCt, color: "text-primary" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />Claims Queue
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleValidateAll} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />Validate All
              </Button>
              <Button size="sm" onClick={handleSubmitReady} disabled={readyCt === 0} className="gap-1.5">
                <Send className="w-3.5 h-3.5" />Submit Ready ({readyCt})
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search claims..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["Draft","Validation Failed","Ready","Submitted","Pending","Paid","Denied","Appealed"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service Code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>EVV</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Loading claims...</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No claims found. Claims are auto-generated from completed timecards.</TableCell></TableRow>
              )}
              {filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelected(c); setShowDetail(true); }}>
                  <TableCell className="font-mono text-xs">{c.claim_number || "—"}</TableCell>
                  <TableCell className="font-medium text-sm">{c.client_name}</TableCell>
                  <TableCell className="text-sm">{c.service_code}</TableCell>
                  <TableCell className="text-sm">{c.service_date}</TableCell>
                  <TableCell className="text-sm">{c.units_billed}</TableCell>
                  <TableCell className="font-semibold">${(c.amount_billed || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    {c.evv_verified
                      ? <CheckCircle2 className="w-4 h-4 text-accent" />
                      : <XCircle className="w-4 h-4 text-destructive" />}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[c.status] || ""}`}>
                      {c.status}
                    </span>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => handleExportEDI(c)} title="Export EDI">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Claim Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Claim Detail — {selected?.claim_number || "Draft"}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Client", selected.client_name],
                  ["Medicaid ID", selected.client_medicaid_id || "Missing"],
                  ["Service Code", selected.service_code],
                  ["Procedure Code", selected.procedure_code || "Missing"],
                  ["Service Date", selected.service_date],
                  ["Units Billed", selected.units_billed],
                  ["Amount Billed", `$${(selected.amount_billed || 0).toFixed(2)}`],
                  ["Amount Paid", `$${(selected.amount_paid || 0).toFixed(2)}`],
                  ["Payer", selected.payer || "—"],
                  ["Auth Number", selected.auth_number || "Missing"],
                  ["EVV Verified", selected.evv_verified ? "Yes ✓" : "No ✗"],
                  ["Claim Type", selected.claim_type],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`font-medium ${(value === "Missing" || value === "No ✗") ? "text-destructive" : ""}`}>{value}</p>
                  </div>
                ))}
              </div>
              {(selected.validation_errors || []).length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm font-semibold text-destructive flex items-center gap-1.5 mb-2"><AlertTriangle className="w-4 h-4" />Validation Errors</p>
                  {selected.validation_errors.map((e, i) => <p key={i} className="text-sm text-destructive/80">• {e}</p>)}
                </div>
              )}
              {selected.denial_reason && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-orange-700">Denial: {selected.denial_code}</p>
                  <p className="text-sm text-orange-600">{selected.denial_reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleExportEDI(selected)} className="gap-1.5">
              <Download className="w-4 h-4" />Export 837 EDI
            </Button>
            <Button variant="outline" onClick={() => setShowDetail(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Report Dialog */}
      <Dialog open={showValidation} onOpenChange={setShowValidation}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><RefreshCw className="w-4 h-4" />Pre-Submission Validation Report</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{validationReport.passed.length}</p>
                <p className="text-sm text-green-600">Passed — Ready to Submit</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{validationReport.failed.length}</p>
                <p className="text-sm text-red-600">Failed — Pending Corrections</p>
              </div>
            </div>
            {validationReport.failed.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 text-destructive">Failed Claims</p>
                <div className="space-y-2">
                  {validationReport.failed.map(c => (
                    <div key={c.id} className="bg-red-50 border border-red-100 rounded-lg p-3">
                      <p className="text-sm font-medium">{c.client_name} — {c.service_date}</p>
                      {c.validation_errors.map((e, i) => <p key={i} className="text-xs text-red-600">• {e}</p>)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {validationReport.passed.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 text-accent">Passed Claims</p>
                <div className="space-y-1">
                  {validationReport.passed.map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                      {c.client_name} — {c.service_date} — ${(c.amount_billed || 0).toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowValidation(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}