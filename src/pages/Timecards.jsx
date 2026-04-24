import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Plus, Search, CheckCircle, XCircle, MapPin, AlertCircle, Lock, Unlock, AlertTriangle } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/lib/AuthContext";
import EVVCapturePanel from "@/components/evv/EVVCapturePanel";
import PayrollExportPanel from "@/components/timecards/PayrollExportPanel";
import PayrollPreviewModal from "@/components/timecards/PayrollPreviewModal";
import { computeOvertimeMap, filterByPeriod } from "@/lib/overtimeUtils";
import { exportCSV, exportPDF } from "@/components/timecards/payrollExportUtils";
import { useToast } from "@/components/ui/use-toast";
import AccessDenied from "@/components/shared/AccessDenied";

const emptyTC = {
  staff_id: "", staff_name: "", date: "", clock_in: "", clock_out: "",
  total_hours: 0, break_minutes: 0, status: "Pending", notes: "",
  evv_location_in: null, evv_location_out: null, service_code_id: "", service_type: ""
};

const PAYROLL_ROLES = ["admin", "hr", "billing", "program_director", "supervisor"];

export default function Timecards() {
  const { role, can } = useRole();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const canExport = ["admin", "hr"].includes(role);
  const isAdmin = role === "admin";
  const isAdminOrHR = ["admin", "hr"].includes(role);

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyTC);
  const [search, setSearch] = useState("");
  const [evvError, setEvvError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");

  // Payroll export state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewParams, setPreviewParams] = useState(null);
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [lockParams, setLockParams] = useState(null);
  const [otOverrideOpen, setOtOverrideOpen] = useState(false);
  const [otOverrideTarget, setOtOverrideTarget] = useState(null);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveSigChecked, setApproveSigChecked] = useState(false);
  const [approveSigTimestamp, setApproveSigTimestamp] = useState("");

  const queryClient = useQueryClient();

  const { data: timecards = [], isLoading } = useQuery({
    queryKey: ["timecards"],
    queryFn: () => base44.entities.Timecard.list("-date"),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const { data: serviceCodes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Timecard.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timecards"] });
      setShowDialog(false);
      setForm(emptyTC);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Timecard.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timecards"] }),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates) => {
      for (const { id, data } of updates) {
        await base44.entities.Timecard.update(id, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timecards"] });
      toast({ title: "Pay period locked", description: "All selected timecards have been locked." });
    },
  });

  // Overtime computation for ALL timecards
  const otMap = useMemo(() => computeOvertimeMap(timecards), [timecards]);

  const handleStaffSelect = (staffId) => {
    const s = staff.find(st => st.id === staffId);
    setForm({ ...form, staff_id: staffId, staff_name: s ? `${s.first_name} ${s.last_name}` : "" });
  };

  const calcHours = () => {
    if (form.clock_in && form.clock_out) {
      const [inH, inM] = form.clock_in.split(":").map(Number);
      const [outH, outM] = form.clock_out.split(":").map(Number);
      const diff = (outH * 60 + outM - inH * 60 - inM - (form.break_minutes || 0)) / 60;
      return Math.max(0, Math.round(diff * 100) / 100);
    }
    return 0;
  };

  const selectedCode = serviceCodes.find(c => c.id === form.service_code_id);
  const evvRequired = selectedCode?.evv_required;

  const handleSave = () => {
    setEvvError(null);
    if (evvRequired) {
      const missing = [];
      if (!form.evv_location_in) missing.push("Clock-In GPS Location");
      if (!form.evv_location_out) missing.push("Clock-Out GPS Location");
      if (!form.service_type) missing.push("Service Type");
      if (!form.staff_id) missing.push("Provider Identity");
      if (!form.date) missing.push("Date of Service");
      if (!form.clock_in || !form.clock_out) missing.push("Start/End Time");
      if (missing.length > 0) {
        setEvvError(`Missing required EVV data: ${missing.join(", ")}`);
        return;
      }
    }
    const hours = calcHours();
    createMutation.mutate({ ...form, total_hours: hours });
  };

  // Status filter chips
  const STATUS_CHIPS = ["All", "Pending", "Approved", "Rejected", "Locked"];

  const filtered = useMemo(() => {
    return timecards.filter(t => {
      const matchesSearch = `${t.staff_name} ${t.date} ${t.status}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All"
        ? true
        : statusFilter === "Locked" ? t.locked
        : t.status === statusFilter && !t.locked;
      return matchesSearch && matchesStatus;
    });
  }, [timecards, search, statusFilter]);

  // Payroll export handlers
  const getFilteredTCsForExport = ({ period, staffIds, statuses }) => {
    let tcs = filterByPeriod(timecards, period.start, period.end);
    tcs = tcs.filter(tc => staffIds.includes(tc.staff_id));
    if (!statuses.includes("All")) {
      tcs = tcs.filter(tc => statuses.includes(tc.status));
    }
    return tcs;
  };

  const handlePreview = (params) => {
    setPreviewParams(params);
    setPreviewOpen(true);
  };

  const handleExportCSV = (params) => {
    const tcs = getFilteredTCsForExport(params);
    exportCSV(tcs, params.period);
    logExport({ ...params, format: "CSV", tcs });
    toast({ title: "CSV exported", description: `${tcs.length} timecard entries exported.` });
  };

  const handleExportPDF = (params) => {
    const tcs = getFilteredTCsForExport(params);
    exportPDF(tcs, params.period, params.frequency, currentUser, "CareFlow Ops");
    logExport({ ...params, format: "PDF", tcs });
    toast({ title: "PDF opened", description: "Use your browser print dialog to save as PDF." });
  };

  const handleLockPeriod = (params) => {
    setLockParams(params);
    setLockConfirmOpen(true);
  };

  const confirmLock = () => {
    const tcs = getFilteredTCsForExport(lockParams);
    const updates = tcs.map(tc => ({
      id: tc.id,
      data: {
        locked: true,
        locked_by: currentUser?.full_name || currentUser?.email || "System",
        locked_at: new Date().toISOString(),
        pay_period_label: lockParams.period.label,
      }
    }));
    bulkUpdateMutation.mutate(updates);
    setLockConfirmOpen(false);
    setLockParams(null);
  };

  const handleOTOverride = (tc) => {
    const otInfo = otMap[tc.id];
    setOtOverrideTarget({ tc, otInfo });
    setOtOverrideOpen(true);
  };

  const confirmOTOverride = () => {
    if (!otOverrideTarget) return;
    updateMutation.mutate({ id: otOverrideTarget.tc.id, data: { status: "Approved" } });
    setOtOverrideOpen(false);
    setOtOverrideTarget(null);
    toast({ title: "Approved with OT override", description: `Timecard approved for ${otOverrideTarget.tc.staff_name}.` });
  };

  const handleApproveClick = (tc) => {
    setApproveTarget(tc);
    setApproveSigChecked(false);
    setApproveSigTimestamp("");
    setApproveConfirmOpen(true);
  };

  const confirmApproval = () => {
    if (!approveTarget) return;
    updateMutation.mutate({
      id: approveTarget.id,
      data: { status: "Approved", approval_timestamp: approveSigTimestamp }
    });
    setApproveConfirmOpen(false);
    setApproveTarget(null);
    setApproveSigChecked(false);
    setApproveSigTimestamp("");
  };

  // Silently log exports
  const logExport = ({ period, staffIds, format: fmt, tcs }) => {
    try {
      const locked = tcs.every(tc => tc.locked);
      base44.entities.AuditLog.create({
        action: `Payroll Export (${fmt})`,
        entity: "Timecard",
        details: JSON.stringify({
          pay_period: period.label,
          employees: staffIds.length,
          entries: tcs.length,
          format: fmt,
          period_locked: locked,
          exported_by: currentUser?.email,
          exported_at: new Date().toISOString(),
        }),
        performed_by: currentUser?.email || "unknown",
      }).catch(() => {}); // silent
    } catch (_) {}
  };

  if (!PAYROLL_ROLES.includes(role)) {
    return <AccessDenied />;
  }

  return (
    <div>
      <PageHeader
        title="Timecards"
        subtitle={`${timecards.length} entries`}
        action={
          <Button onClick={() => { setForm(emptyTC); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />New Entry
          </Button>
        }
      />

      {/* Payroll Export Panel (Admin / HR only) */}
      {canExport && (
        <PayrollExportPanel
          staff={staff}
          onPreview={handlePreview}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          onLockPeriod={handleLockPeriod}
        />
      )}

      {/* Search + Status Filter */}
      <Card className="mb-6">
        <CardContent className="py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search timecards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-0 bg-transparent focus-visible:ring-0"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => setStatusFilter(chip)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  statusFilter === chip
                    ? chip === "Locked" ? "bg-slate-600 text-white border-slate-600"
                      : chip === "Approved" ? "bg-accent text-white border-accent"
                      : chip === "Pending" ? "bg-amber-500 text-white border-amber-500"
                      : chip === "Rejected" ? "bg-destructive text-white border-destructive"
                      : "bg-primary text-white border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timecard Table */}
      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          icon={Clock}
          title="No timecards"
          description="Create your first timecard entry."
          action={<Button onClick={() => setShowDialog(true)} size="sm"><Plus className="w-4 h-4 mr-1" />New Entry</Button>}
        />
      ) : (
        <Card>
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const otInfo = otMap[t.id];
                  const isOT = otInfo?.isOT;
                  const isLocked = t.locked;

                  return (
                    <TableRow
                      key={t.id}
                      className={isLocked ? "bg-slate-50 opacity-80" : ""}
                    >
                      <TableCell className="font-medium">{t.staff_name || "—"}</TableCell>
                      <TableCell className="text-sm">{t.date}</TableCell>
                      <TableCell className="text-sm">{t.clock_in}</TableCell>
                      <TableCell className="text-sm">{t.clock_out || "—"}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{t.total_hours ? `${t.total_hours}h` : "—"}</span>
                        {isOT && (
                          <Badge className="ml-1.5 bg-orange-500 text-white text-xs px-1.5 py-0 h-4">OT</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            {isLocked && <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
                            <StatusBadge status={isLocked ? "Locked" : t.status} />
                          </div>
                          {t.approval_timestamp && t.status === "Approved" && (
                            <span className="text-[10px] text-muted-foreground leading-tight">{t.approval_timestamp}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isLocked ? (
                          isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-500 hover:text-primary"
                              title="Unlock timecard"
                              onClick={() => updateMutation.mutate({ id: t.id, data: { locked: false, locked_by: null, locked_at: null } })}
                            >
                              <Unlock className="w-4 h-4" />
                            </Button>
                          )
                        ) : (
                          can("approveTimecards") && t.status === "Pending" && (
                            isOT ? (
                              <div className="flex gap-1 items-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={!isAdminOrHR}
                                  className={`h-7 text-xs px-2 ${isAdminOrHR ? "text-orange-600 hover:bg-orange-50" : "opacity-40 cursor-not-allowed"}`}
                                  onClick={() => isAdminOrHR && handleOTOverride(t)}
                                  title={isAdminOrHR ? "Override & Approve OT entry" : "OT Review Required — Admin/HR only"}
                                >
                                  {isAdminOrHR ? (
                                    <><AlertTriangle className="w-3 h-3 mr-1" />Override</>
                                  ) : (
                                    "OT Review Required"
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => updateMutation.mutate({ id: t.id, data: { status: "Rejected" } })}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-accent"
                                  onClick={() => handleApproveClick(t)}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => updateMutation.mutate({ id: t.id, data: { status: "Rejected" } })}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            )
                          )
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

      {/* New Timecard Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Timecard Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Staff Member *</Label>
              <Select value={form.staff_id} onValueChange={handleStaffSelect}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Clock In *</Label><Input type="time" value={form.clock_in} onChange={(e) => setForm({...form, clock_in: e.target.value})} /></div>
              <div><Label>Clock Out</Label><Input type="time" value={form.clock_out} onChange={(e) => setForm({...form, clock_out: e.target.value})} /></div>
            </div>
            <div>
              <Label>Service Code</Label>
              <Select value={form.service_code_id} onValueChange={v => { const c = serviceCodes.find(x => x.id === v); setForm({...form, service_code_id: v, service_type: c?.service_type || ""}); }}>
                <SelectTrigger><SelectValue placeholder="Select service code" /></SelectTrigger>
                <SelectContent>{serviceCodes.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.description}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Break (minutes)</Label><Input type="number" value={form.break_minutes} onChange={(e) => setForm({...form, break_minutes: parseInt(e.target.value) || 0})} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} /></div>
            {evvRequired && (
              <EVVCapturePanel
                capturedIn={form.evv_location_in}
                capturedOut={form.evv_location_out}
                onCapture={(type, data) => setForm(f => type === "in" ? { ...f, evv_location_in: data } : { ...f, evv_location_out: data })}
                required={true}
              />
            )}
            {evvError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{evvError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.staff_id || !form.date || !form.clock_in}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payroll Preview Modal */}
      {previewOpen && previewParams && (
        <PayrollPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          timecards={getFilteredTCsForExport(previewParams)}
          period={previewParams.period}
          frequency={previewParams.frequency || "semi-monthly"}
          user={currentUser}
          agencyName="CareFlow Ops"
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          params={previewParams}
        />
      )}

      {/* Lock Confirmation Dialog */}
      <Dialog open={lockConfirmOpen} onOpenChange={setLockConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              Lock Pay Period
            </DialogTitle>
            <DialogDescription>
              Lock all timecards for <strong>{lockParams?.period?.label}</strong>?
              This action cannot be undone without Admin access. Locked timecards cannot be edited.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockConfirmOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={confirmLock} disabled={bulkUpdateMutation.isPending}>
              {bulkUpdateMutation.isPending ? "Locking..." : "Lock Pay Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timecard Approval Confirmation Dialog */}
      <Dialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-accent" />
              Approve Timecard
            </DialogTitle>
            <DialogDescription>
              Approving timecard for <strong>{approveTarget?.staff_name}</strong> on <strong>{approveTarget?.date}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={approveSigChecked}
                onChange={e => {
                  const checked = e.target.checked;
                  setApproveSigChecked(checked);
                  if (checked) {
                    const now = new Date();
                    const name = currentUser?.full_name || currentUser?.email || "Supervisor";
                    const ts = `Approved by ${name} on ${format(now, "MM/dd/yyyy")} at ${format(now, "h:mm aa")}`;
                    setApproveSigTimestamp(ts);
                  } else {
                    setApproveSigTimestamp("");
                  }
                }}
                className="w-4 h-4 accent-primary mt-0.5 cursor-pointer"
              />
              <span className="text-sm text-foreground leading-snug">
                I confirm these hours are accurate and approved
              </span>
            </label>
            {approveSigTimestamp && (
              <p className="text-[11px] text-muted-foreground pl-6">{approveSigTimestamp}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveConfirmOpen(false)}>Cancel</Button>
            <Button
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={confirmApproval}
              disabled={!approveSigChecked || updateMutation.isPending}
            >
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OT Override Confirmation Dialog */}
      <Dialog open={otOverrideOpen} onOpenChange={setOtOverrideOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirm OT Override Approval
            </DialogTitle>
            <DialogDescription>
              This entry contributes to overtime for{" "}
              <strong>{otOverrideTarget?.tc?.staff_name}</strong> during the week of{" "}
              <strong>{otOverrideTarget?.otInfo?.weekLabel}</strong>. Confirm approval?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOtOverrideOpen(false)}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={confirmOTOverride}>
              Override & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}