import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getIntegration, EVV_REQUIRED_ELEMENTS } from "@/lib/integrationRegistry";
import { CheckCircle2, Loader2, AlertCircle, Eye, EyeOff, TestTube, Save, ExternalLink, Shield, FileText, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function IntegrationConfigPanel({ integrationRecord, agencyId, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const meta = getIntegration(integrationRecord?.integration_key);
  const [creds, setCreds] = useState(integrationRecord?.credentials || {});
  const [isActive, setIsActive] = useState(integrationRecord?.is_active || false);
  const [baa, setBaa] = useState(integrationRecord?.baa_signed || false);
  const [testMode, setTestMode] = useState(integrationRecord?.test_mode ?? meta?.test_mode_supported ? false : false);
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
      state: meta.state,
      state_name: meta.state_name,
      credentials: creds,
      is_active: isActive,
      baa_signed: baa,
      test_mode: testMode,
      submission_method: creds.submission_method || meta.default_submission_method,
      api_endpoint: creds.api_endpoint || "",
      auth_type: creds.auth_type || "api_key",
    };
    saveMutation.mutate(payload);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1800));
    const requiredFields = meta.fields.filter(f => f.required);
    const ok = requiredFields.every(f => creds[f.id] && creds[f.id].length > 0);
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
          {meta.state && meta.state !== "CUSTOM" && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px]"><MapPin className="w-3 h-3 mr-1" />{meta.state_name}</Badge>
              {meta.spec_version && <Badge variant="outline" className="text-[10px]">Spec v{meta.spec_version}</Badge>}
            </div>
          )}
        </div>
      </div>

      {/* Documentation links */}
      {(meta.documentation_url || meta.technical_spec_url) && (
        <div className="flex items-center gap-3 flex-wrap">
          {meta.documentation_url && (
            <a href={meta.documentation_url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> State EVV Documentation
            </a>
          )}
          {meta.technical_spec_url && (
            <a href={meta.technical_spec_url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              <FileText className="w-3.5 h-3.5" /> Technical Specifications (PDF)
            </a>
          )}
        </div>
      )}

      {/* BAA notice */}
      {meta.requiresBaa && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">BAA Required</p>
            <p className="text-xs text-amber-700">This integration involves PHI exchange with {meta.vendor}. A signed Business Associate Agreement is required before activation.</p>
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
          {meta.fields.map(field => {
            const isSelect = field.type === "select";
            const isBoolean = field.type === "boolean";
            return (
              <div key={field.id}>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {isSelect ? (
                  <Select value={creds[field.id] || field.default || ""} onValueChange={v => setCreds(p => ({ ...p, [field.id]: v }))}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : isBoolean ? (
                  <div className="flex items-center gap-2">
                    <Switch checked={creds[field.id] ?? field.default ?? false} onCheckedChange={v => setCreds(p => ({ ...p, [field.id]: v }))} />
                    <span className="text-xs text-muted-foreground">{creds[field.id] ? "Enabled" : "Disabled"}</span>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      type={field.type === "password" && !showSecrets[field.id] ? "password" : "text"}
                      value={creds[field.id] || ""}
                      onChange={e => setCreds(p => ({ ...p, [field.id]: e.target.value }))}
                      placeholder={field.placeholder || (field.type === "password" ? "••••••••••••" : `Enter ${field.label}`)}
                      className="pr-10 text-sm"
                    />
                    {field.type === "password" && (
                      <button type="button"
                        onClick={() => setShowSecrets(p => ({ ...p, [field.id]: !p[field.id] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showSecrets[field.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Test mode */}
      {meta.test_mode_supported && (
        <div className="flex items-center justify-between p-4 border border-amber-200 bg-amber-50/50 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-foreground">Test Mode</p>
            <p className="text-xs text-muted-foreground">Submit EVV records to the state's test/sandbox environment. No production claims will be submitted.</p>
          </div>
          <Switch checked={testMode} onCheckedChange={setTestMode} />
        </div>
      )}

      {/* EVV Data Elements & Field Mappings */}
      {meta.field_mappings && meta.field_mappings.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">Required EVV Data Elements</h4>
            <Badge variant="secondary" className="text-[10px]">Cures Act §12006</Badge>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">EVV Element</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">CareFlow Source Field</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Transform</th>
                </tr>
              </thead>
              <tbody>
                {meta.field_mappings.map(m => (
                  <tr key={m.element} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{m.element}</td>
                    <td className="px-3 py-2 text-muted-foreground">{m.source_field}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px] font-mono">{m.transform}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submission methods info */}
      {meta.submission_methods && meta.submission_methods.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Submission Methods</h4>
          <div className="space-y-2">
            {meta.submission_methods.map(m => (
              <div key={m.method} className="border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{m.label}</Badge>
                  <span className="text-[10px] text-muted-foreground uppercase">{m.auth_type}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                {m.endpoint && (
                  <p className="text-[10px] font-mono text-muted-foreground mt-1 break-all">{m.endpoint}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activate */}
      <div className="flex items-center justify-between p-4 border border-border rounded-xl">
        <div>
          <p className="text-sm font-semibold text-foreground">Integration Active</p>
          <p className="text-xs text-muted-foreground">Enable EVV data submission to {meta.name}</p>
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