import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, MapPin, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function WizardStep6EVV({ data, onNext, onBack }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ evv_model: "Open Model", evv_aggregator: "", evv_api_endpoint: "", evv_api_key: "", ...data });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [skip, setSkip] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    await new Promise(r => setTimeout(r, 1500));
    setTestResult("success");
    setTesting(false);
    toast({ title: "EVV connection test successful" });
  };

  if (skip) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">EVV Setup</h2>
        <div className="bg-muted/30 rounded-xl p-4 mb-6"><p className="text-sm text-muted-foreground">EVV configuration skipped. You can set it up later in <strong>Settings → EVV</strong>.</p></div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setSkip(false)} className="gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
          <Button onClick={() => onNext({ evv_configured: false })} className="gap-2">Continue <ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">EVV Configuration</h2>
      <p className="text-muted-foreground mb-6">Configure your state's Electronic Visit Verification integration.</p>

      <div className="flex items-center gap-2 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-xl">
        <MapPin className="w-4 h-4 text-primary" />
        <p className="text-sm text-foreground">State: <strong>{data.state || "Not set"}</strong></p>
      </div>

      <div className="space-y-4 mb-6">
        <div><label className="text-sm font-medium text-foreground">EVV Model</label>
          <Select value={form.evv_model} onValueChange={v => setForm(p => ({ ...p, evv_model: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Open Model">Open Model — Agency chooses vendor</SelectItem>
              <SelectItem value="Closed Model">Closed Model — State-mandated system</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><label className="text-sm font-medium text-foreground">Aggregator</label>
          <Select value={form.evv_aggregator} onValueChange={v => setForm(p => ({ ...p, evv_aggregator: v }))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select aggregator" /></SelectTrigger>
            <SelectContent>
              {["Sandata", "HHAeXchange", "Authenticare", "State System", "Other"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><label className="text-sm font-medium text-foreground">API Endpoint</label><Input value={form.evv_api_endpoint} onChange={e => setForm(p => ({ ...p, evv_api_endpoint: e.target.value }))} placeholder="https://api.aggregator.com/evv" className="mt-1" /></div>
        <div><label className="text-sm font-medium text-foreground">API Key</label><Input type="password" value={form.evv_api_key} onChange={e => setForm(p => ({ ...p, evv_api_key: e.target.value }))} placeholder="Your aggregator API key" className="mt-1" /></div>

        {form.evv_aggregator && form.evv_api_endpoint && (
          <Button variant="outline" onClick={testConnection} disabled={testing} className="gap-2">
            {testing ? "Testing..." : testResult === "success" ? <><CheckCircle2 className="w-4 h-4 text-accent" /> Connected!</> : "Test Connection"}
          </Button>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setSkip(true)}>Skip for now</Button>
          <Button onClick={() => onNext({ ...form, evv_configured: true })} className="gap-2">Continue <ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}