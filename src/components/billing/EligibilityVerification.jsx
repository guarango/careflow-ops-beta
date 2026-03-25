import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Search, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function EligibilityVerification() {
  const [search, setSearch] = useState("");
  const [verifying, setVerifying] = useState(null);
  const [selectedState, setSelectedState] = useState("UT");
  const qc = useQueryClient();

  const { data: clients = [] } = useQuery({ queryKey: ["clients-list"], queryFn: () => base44.entities.Client.list() });
  const { data: checks = [] } = useQuery({ queryKey: ["eligibility-checks"], queryFn: () => base44.entities.EligibilityCheck.list("-created_date") });

  const createCheck = useMutation({
    mutationFn: (data) => base44.entities.EligibilityCheck.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["eligibility-checks"] }); setVerifying(null); },
  });

  const handleVerify = (client) => {
    setVerifying(client.id);
    // Simulate 270/271 eligibility check
    setTimeout(() => {
      createCheck.mutate({
        client_id: client.id,
        client_name: `${client.first_name} ${client.last_name}`,
        client_medicaid_id: client.insurance_id || "",
        check_date: new Date().toISOString(),
        checked_by: "System",
        payer: client.insurance_provider || "Medicaid",
        state: selectedState,
        is_eligible: Math.random() > 0.1,
        waiver_active: Math.random() > 0.15,
        waiver_programs: ["DSPD", "HCBS"],
        coverage_start: "2025-01-01",
        coverage_end: "2025-12-31",
        status: "Active",
        response_raw: JSON.stringify({ transaction: "271", trace: `TRN-${Date.now()}`, eligibility: "Active" }),
      });
    }, 1200);
  };

  const handleVerifyAll = () => {
    activeClients.forEach(c => handleVerify(c));
  };

  const activeClients = clients.filter(c => c.status === "Active");
  const filteredClients = activeClients.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  // Get latest check per client
  const latestChecks = {};
  checks.forEach(ch => {
    if (!latestChecks[ch.client_id] || new Date(ch.check_date) > new Date(latestChecks[ch.client_id].check_date)) {
      latestChecks[ch.client_id] = ch;
    }
  });

  const eligibilityLapsed = activeClients.filter(c => {
    const check = latestChecks[c.id];
    return check && !check.is_eligible;
  });

  return (
    <div className="space-y-6">
      {eligibilityLapsed.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-sm font-semibold text-red-700">Eligibility Lapsed — {eligibilityLapsed.length} Client(s)</span></div>
          {eligibilityLapsed.map(c => <p key={c.id} className="text-xs text-red-600">• {c.first_name} {c.last_name} — Last check showed ineligible. Verify and resolve before billing.</p>)}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" />Client Eligibility Verification (270/271)</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={handleVerifyAll} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />Verify All Active
              </Button>
            </div>
          </div>
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Medicaid ID</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Eligible</TableHead>
                <TableHead>Waiver Active</TableHead>
                <TableHead>Coverage Thru</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No active clients found.</TableCell></TableRow>
              )}
              {filteredClients.map(c => {
                const check = latestChecks[c.id];
                const isLoading = verifying === c.id;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.first_name} {c.last_name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.insurance_id || "—"}</TableCell>
                    <TableCell className="text-sm">{c.insurance_provider || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {check ? new Date(check.check_date).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      {check ? (
                        check.is_eligible
                          ? <CheckCircle2 className="w-4 h-4 text-accent" />
                          : <XCircle className="w-4 h-4 text-destructive" />
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {check ? (
                        check.waiver_active
                          ? <CheckCircle2 className="w-4 h-4 text-accent" />
                          : <XCircle className="w-4 h-4 text-amber-500" />
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs">{check?.coverage_end || "—"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleVerify(c)} disabled={isLoading} className="gap-1 text-xs">
                        {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Verify
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Check History */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Eligibility Check Log</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Check Date</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Eligible</TableHead>
                <TableHead>Waiver</TableHead>
                <TableHead>Coverage End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checks.slice(0, 20).map(ch => (
                <TableRow key={ch.id}>
                  <TableCell className="font-medium text-sm">{ch.client_name}</TableCell>
                  <TableCell className="text-xs">{new Date(ch.check_date).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{ch.state}</TableCell>
                  <TableCell className="text-sm">{ch.payer}</TableCell>
                  <TableCell>{ch.is_eligible ? <Badge variant="outline" className="text-accent border-accent/30 text-xs">Active</Badge> : <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">Inactive</Badge>}</TableCell>
                  <TableCell>{ch.waiver_active ? <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> : <XCircle className="w-3.5 h-3.5 text-amber-500" />}</TableCell>
                  <TableCell className="text-xs">{ch.coverage_end || "—"}</TableCell>
                </TableRow>
              ))}
              {checks.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">No eligibility checks run yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}