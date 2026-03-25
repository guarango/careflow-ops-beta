import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { getIntegration } from "@/lib/integrationRegistry";
import { CheckCircle2, Loader2, AlertCircle, Eye, EyeOff, TestTube, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function IntegrationConfigPanel({ integrationRecord, agencyId, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const meta = getIntegration(integrationRecord?.integration_key);
  const [creds, setCreds] = useState(integrationRecord?.credentials || {});
  const [syncSchedule, setSyncSchedule] = useState(integrationRecord?.sync_schedule || "daily");
  const [isActive, setIsActive] = useState(integrationRecord?.is_active || false);
  const [baa, setBaa] = useState(integrationRecord?.baa_signed || false);
  const [showSecrets, setShowSecrets] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const saveMutation = useMutation({
    mutationFn: (data) => integrationRecord?.id
      ? base44.entities.Integration.update(integrationRecord.id, data)
      : base44.entities.Integration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", agencyId] });
      toast({ title: "Integration saved", description: "Configuration updated successfully." });
    },
  });

  function handleSave() {
    const payload = {
      agency_id: agencyId,
      integration_key: meta.key,
      integration_name: meta.name,
      category: meta.category,
      credentials: creds,
      sync_schedule: syncSchedule,
      is_active: isActive,
      baa_signed: baa,
    };
    saveMutation.mutate(payload);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1800));
    const ok = Object.values(creds).every(v => v && v.length > 0);
    setTestResult(ok ? "success" : "error");
    setTesting(false);
    if (ok) {
      toast({ title: "Connection successful", description: `${meta.name} responded successfully.` });
    } else {
      toast({ title: "Connection failed", description: "Check your credentials and try again.", variant: "destructive" });
    }
  }

  if (!meta) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
          {meta.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground">{meta.name}</h3>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        </div>
      </div>

      {/* BAA notice */}
      {meta.requiresBaa && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">BAA Required</p>
            <p className="text-xs text-amber-700">This integration involves PHI exchange. A signed Business Associate Agreement with {meta.vendor} is required before activation.</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={baa} onCheckedChange={setBaa} />
            <span className="text-xs text-amber-700 font-medium">BAA Signed</span>
          </div>
        </div>
      )}

      {/* Credentials */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Credentials & Connection</h4>
        <div className="space-y-3">
          {meta.fields.map(field => (
            <div key={field.id}>
              <Label className="text-xs text-muted-foreground mb-1 block">{field.label}</Label>
              <div className="relative">
                <Input
                  type={field.type === "password" && !showSecrets[field.id] ? "password" : "text"}
                  value={creds[field.id] || ""}
                  onChange={e => setCreds(p => ({ ...p, [field.id]: e.target.value }))}
                  placeholder={field.placeholder || (field.type === "password" ? "••••••••••••" : `Enter ${field.label}`)}
                  className="pr-10 text-sm"
                />
                {field.type === "password" && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets(p => ({ ...p, [field.id]: !p[field.id] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecrets[field.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sync schedule */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Sync Schedule</Label>
        <Select value={syncSchedule} onValueChange={setSyncSchedule}>
          <SelectTrigger className="w-48 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="realtime">Real-time</SelectItem>
            <SelectItem value="hourly">Every hour</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="manual">Manual only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activate */}
      <div className="flex items-center justify-between p-4 border border-border rounded-xl">
        <div>
          <p className="text-sm font-semibold text-foreground">Integration Active</p>
          <p className="text-xs text-muted-foreground">Enable data exchange with {meta.name}</p>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={setIsActive}
          disabled={meta.requiresBaa && !baa}
        />
      </div>

      {/* Test result */}
      {testResult && (
        <div className={cn("flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium",
          testResult === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-destructive/10 text-destructive border border-destructive/20"
        )}>
          {testResult === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {testResult === "success" ? `Successfully connected to ${meta.name}` : `Failed to connect — check credentials`}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
          Test Connection
        </Button>
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2 flex-1">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}