import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle2, Send, AlertTriangle, Clock } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import toast from "react-hot-toast";

const STATUS_STYLES = {
  "Draft": "bg-gray-100 text-gray-700",
  "Pending Review": "bg-amber-100 text-amber-700",
  "Signed": "bg-blue-100 text-blue-700",
  "Sent to SC": "bg-green-100 text-green-700",
  "Overdue": "bg-red-100 text-red-700",
};

export default function QuarterlySummaryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [overallStatus, setOverallStatus] = useState("");
  const [services, setServices] = useState([]);
  const [signDialog, setSignDialog] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [sendDialog, setSendDialog] = useState(false);
  const [sendMethod, setSendMethod] = useState("Email");

  const { data: summary, isLoading } = useQuery({
    queryKey: ["quarterly-summary", id],
    queryFn: () => base44.entities.QuarterlySummary.get(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (summary) {
      setOverallStatus(summary.overall_status_summary || "");
      setServices(summary.services_provided || []);
    }
  }, [summary]);

  const isManager = user?.role === "admin" || user?.role === "manager";
  const canEdit = isManager && summary?.status !== "Sent to SC";

  const dueDate = summary ? new Date(summary.due_date) : null;
  const daysLeft = dueDate ? differenceInCalendarDays(dueDate, new Date()) : 0;
  const isOverdue = daysLeft < 0 && summary?.status !== "Sent to SC";

  const handleSaveEdits = async () => {
    try {
      await base44.entities.QuarterlySummary.update(id, {
        overall_status_summary: overallStatus,
        services_provided: services,
      });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["quarterly-summary", id] });
      toast.success("Edits saved");
    } catch (e) {
      toast.error("Failed to save");
    }
  };

  const handleSign = async () => {
    try {
      const now = new Date().toISOString();
      await base44.entities.QuarterlySummary.update(id, {
        status: "Signed",
        signed_by_name: signerName,
        signed_by_role: signerRole,
        signed_at: now,
        signature_timestamp: now,
        overall_status_summary: overallStatus,
        services_provided: services,
      });
      setSignDialog(false);
      queryClient.invalidateQueries({ queryKey: ["quarterly-summary", id] });
      toast.success("Quarterly summary signed");
    } catch (e) {
      toast.error("Failed to sign");
    }
  };

  const handleSendToSC = async () => {
    try {
      const now = new Date().toISOString();
      await base44.entities.QuarterlySummary.update(id, {
        status: "Sent to SC",
        sent_to_support_coordinator: true,
        sent_to_sc_at: now,
        sent_to_sc_method: sendMethod,
        sent_to_sc_by: signerName || user?.full_name || "Manager",
      });
      setSendDialog(false);
      queryClient.invalidateQueries({ queryKey: ["quarterly-summary", id] });
      toast.success("Marked as sent to Support Coordinator");
    } catch (e) {
      toast.error("Failed to update");
    }
  };

  const updateServiceField = (idx, field, value) => {
    const updated = [...services];
    updated[idx] = { ...updated[idx], [field]: value };
    setServices(updated);
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!summary) return <div className="text-center py-12">Summary not found</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/summaries/quarterly")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{summary.client_name}</h1>
            <Badge className={STATUS_STYLES[summary.status]}>{summary.status}</Badge>
            <span className="text-sm text-muted-foreground">{summary.quarter}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>Period: {summary.period_start} to {summary.period_end}</span>
            {dueDate && (
              <span className={isOverdue ? "text-red-600 font-medium" : daysLeft <= 7 ? "text-amber-600 font-medium" : ""}>
                {isOverdue ? (
                  <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {Math.abs(daysLeft)} days overdue</span>
                ) : (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due in {daysLeft} days ({format(dueDate, "MMM d")})</span>
                )}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {editing ? (
              <Button size="sm" onClick={handleSaveEdits}>Save Edits</Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            )}
            {summary.status !== "Signed" && (
              <Button size="sm" onClick={() => setSignDialog(true)} className="gap-1">
                <CheckCircle2 className="w-3 h-3" /> Sign
              </Button>
            )}
            {summary.status === "Signed" && (
              <Button size="sm" onClick={() => setSendDialog(true)} className="gap-1">
                <Send className="w-3 h-3" /> Send to SC
              </Button>
            )}
          </div>
        )}
      </div>

      {summary.monthly_summary_dates && summary.monthly_summary_dates.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Assembled from monthly summaries:</span>
            {summary.monthly_summary_dates.map((d, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General Summary of Client's Status</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea value={overallStatus} onChange={e => setOverallStatus(e.target.value)} rows={6} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{overallStatus || "No data recorded."}</p>
            )}
          </CardContent>
        </Card>

        {services.length > 0 && (
          <div className="space-y-3">
            {services.map((svc, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {svc.service_type || `Service ${idx + 1}`}
                    {svc.service_code && <Badge variant="outline" className="text-xs">{svc.service_code}</Badge>}
                    {svc.goal_progress_exempt && <Badge variant="secondary" className="text-xs">Goal progress exempt</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {svc.date_range_start && svc.date_range_end && (
                    <p className="text-xs text-muted-foreground">
                      Date range: {svc.date_range_start} to {svc.date_range_end}
                    </p>
                  )}
                  <Field
                    label="General Summary"
                    value={svc.general_summary}
                    editing={editing}
                    onChange={v => updateServiceField(idx, "general_summary", v)}
                  />
                  <Field
                    label="Response to Services"
                    value={svc.response_to_services}
                    editing={editing}
                    onChange={v => updateServiceField(idx, "response_to_services", v)}
                  />
                  <Field
                    label="Notable Events"
                    value={svc.notable_events}
                    editing={editing}
                    onChange={v => updateServiceField(idx, "notable_events", v)}
                  />
                  {!svc.goal_progress_exempt && (
                    <Field
                      label="Progress Toward Goals"
                      value={svc.goal_progress}
                      editing={editing}
                      onChange={v => updateServiceField(idx, "goal_progress", v)}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {summary.signed_by_name && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Signed by (staff who wrote it)</p>
                <p className="font-medium">{summary.signed_by_name} ({summary.signed_by_role})</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Signed at</p>
                <p className="font-medium">{summary.signed_at ? format(new Date(summary.signed_at), "MMM d, yyyy h:mm a") : "N/A"}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-500" />
            </CardContent>
          </Card>
        )}

        {summary.sent_to_support_coordinator && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sent to Support Coordinator</p>
                <p className="font-medium">Via {summary.sent_to_sc_method || "N/A"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Sent at</p>
                <p className="font-medium">{summary.sent_to_sc_at ? format(new Date(summary.sent_to_sc_at), "MMM d, yyyy h:mm a") : "N/A"}</p>
              </div>
              <Send className="w-8 h-8 text-green-500" />
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={signDialog} onOpenChange={setSignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Quarterly Summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              By signing, you confirm this quarterly summary is accurate and complete. Your name will be recorded as the staff member who wrote it.
            </p>
            <div>
              <label className="text-xs font-medium">Your Name</label>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background mt-1"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Your Role</label>
              <input
                type="text"
                value={signerRole}
                onChange={e => setSignerRole(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background mt-1"
                placeholder="e.g. Program Manager"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialog(false)}>Cancel</Button>
            <Button onClick={handleSign} disabled={!signerName || !signerRole} className="gap-1">
              <CheckCircle2 className="w-4 h-4" /> Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendDialog} onOpenChange={setSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to Support Coordinator</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Record how this quarterly summary was sent to the Support Coordinator.
            </p>
            <div>
              <label className="text-xs font-medium">Method</label>
              <select
                value={sendMethod}
                onChange={e => setSendMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background mt-1"
              >
                <option value="Email">Email</option>
                <option value="Portal">Portal</option>
                <option value="Fax">Fax</option>
                <option value="Mail">Mail</option>
                <option value="Hand-delivered">Hand-delivered</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialog(false)}>Cancel</Button>
            <Button onClick={handleSendToSC} className="gap-1">
              <Send className="w-4 h-4" /> Mark as Sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, editing, onChange }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {editing ? (
        <Textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={3} />
      ) : (
        <p className="text-sm whitespace-pre-wrap">{value || "No data recorded."}</p>
      )}
    </div>
  );
}