import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Loader2, Download, Send, FileText, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function EvvSubmissionPanel({ agencyId, integration }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");

  // Fetch pending EVV records
  const { data: buildResult, isLoading, refetch } = useQuery({
    queryKey: ["evv_records", agencyId],
    queryFn: async () => {
      const res = await base44.functions.invoke("buildEvvRecords", { agency_id: agencyId });
      return res.data;
    },
    enabled: !!agencyId && !!integration?.is_active,
    refetchInterval: 60000,
  });

  // CSV download mutation
  const csvMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("submitEvvBatch", {
        agency_id: agencyId,
        integration_key: integration.integration_key,
        submission_method: "csv",
        test_mode: integration.test_mode,
      });
      // The response is a CSV file — trigger download
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `utah_evv_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evv_records", agencyId] });
      toast({ title: "CSV generated", description: "EVV CSV file downloaded. Upload it to the Utah EVV Portal." });
    },
    onError: (err) => {
      toast({ title: "CSV generation failed", description: err.response?.data?.error || err.message, variant: "destructive" });
    },
  });

  // SOAP submission mutation
  const soapMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("submitEvvBatch", {
        agency_id: agencyId,
        integration_key: integration.integration_key,
        submission_method: "soap",
        test_mode: integration.test_mode,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["evv_records", agencyId] });
      if (data.success) {
        toast({ title: "EVV batch accepted", description: `${data.recordCount} records submitted to Utah Medicaid.` });
      } else {
        toast({ title: "EVV batch rejected", description: "Some records were rejected. Check the error details.", variant: "destructive" });
      }
    },
    onError: (err) => {
      toast({ title: "Submission failed", description: err.response?.data?.error || err.message, variant: "destructive" });
    },
  });

  const records = buildResult?.records || [];
  const errors = buildResult?.errors || [];
  const summary = buildResult?.summary || {};

  if (!integration?.is_active) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">EVV integration not active</p>
          <p className="text-xs text-muted-foreground mt-1">Activate the {integration?.integration_name || "EVV"} integration to start submitting records.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground font-medium">Pending Records</p>
            <p className="text-xl font-bold text-foreground">{records.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground font-medium">Validation Errors</p>
            <p className={`text-xl font-bold ${errors.length > 0 ? "text-destructive" : "text-foreground"}`}>{errors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground font-medium">Submission Method</p>
            <p className="text-sm font-bold text-foreground uppercase">{integration.submission_method || "csv"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground font-medium">Mode</p>
            <p className={`text-sm font-bold ${integration.test_mode ? "text-amber-600" : "text-green-600"}`}>
              {integration.test_mode ? "Test" : "Production"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submission actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => csvMutation.mutate()}
          disabled={csvMutation.isPending || records.length === 0}
          className="gap-2"
        >
          {csvMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download CSV
        </Button>
        <Button
          size="sm"
          onClick={() => soapMutation.mutate()}
          disabled={soapMutation.isPending || records.length === 0}
          className="gap-2"
        >
          {soapMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Submit via API
        </Button>
        {integration.test_mode && (
          <Badge variant="secondary" className="text-amber-600 bg-amber-50">Test Mode — no production claims</Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="text-xs gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready ({records.length})
          </TabsTrigger>
          <TabsTrigger value="errors" className="text-xs gap-1">
            <AlertCircle className="w-3 h-3" /> Errors ({errors.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {isLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No pending EVV records. Completed shifts with EVV data will appear here.
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Client</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Staff</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Service Code</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Clock In</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Clock Out</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Medicaid ID</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.shift_id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 text-foreground">{r.client_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.staff_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.service_date}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[10px] font-mono">{r.service_type}</Badge></td>
                      <td className="px-3 py-2 text-muted-foreground">{r.service_start_time?.substring(11, 19) || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.service_end_time?.substring(11, 19) || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground font-mono">{r.recipient_id || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="errors" className="mt-4">
          {errors.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              No validation errors. All records are ready for submission.
            </div>
          ) : (
            <div className="space-y-2">
              {errors.map((err, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{err.client_name} — {err.staff_name} ({err.date})</p>
                    <p className="text-xs text-destructive mt-0.5">{err.error}</p>
                    {err.missingFields && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {err.missingFields.map(f => <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}