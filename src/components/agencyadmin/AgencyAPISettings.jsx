import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Save, Key, Plus, Trash2, Eye, EyeOff, Copy, Zap, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

export default function AgencyAPISettings({ agency, onSave, saving }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ api_enabled: false, webhook_urls: [], ...agency });
  const [showKey, setShowKey] = useState(false);
  const [newWebhook, setNewWebhook] = useState("");

  useEffect(() => { if (agency) setForm(f => ({ ...f, ...agency, webhook_urls: agency.webhook_urls || [] })); }, [agency]);

  const { data: logs = [] } = useQuery({
    queryKey: ["api-logs", agency?.id],
    queryFn: () => agency?.id ? base44.entities.APILog.filter({ agency_id: agency.id }, "-timestamp", 50) : [],
    enabled: !!agency?.id,
  });

  const generateApiKey = () => {
    const key = "cpo_live_" + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, "0")).join("");
    setForm(p => ({ ...p, api_key: key }));
    toast({ title: "New API key generated", description: "Save settings to apply the new key." });
  };

  const addWebhook = () => {
    if (!newWebhook.startsWith("http")) return toast({ title: "Invalid URL", variant: "destructive" });
    setForm(p => ({ ...p, webhook_urls: [...(p.webhook_urls || []), newWebhook] }));
    setNewWebhook("");
  };

  const removeWebhook = (url) => setForm(p => ({ ...p, webhook_urls: p.webhook_urls.filter(u => u !== url) }));

  const copyKey = () => { navigator.clipboard.writeText(form.api_key || ""); toast({ title: "API key copied" }); };

  return (
    <div className="space-y-6">
      {/* API Key */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">API Access</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Enable API</span>
            <Switch checked={form.api_enabled} onCheckedChange={v => setForm(p => ({ ...p, api_enabled: v }))} />
          </div>
        </div>

        {form.api_enabled && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">API Key</label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={form.api_key || "Not generated yet"}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button size="icon" variant="ghost" onClick={() => setShowKey(p => !p)}>{showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button>
                <Button size="icon" variant="ghost" onClick={copyKey}><Copy className="w-4 h-4" /></Button>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={generateApiKey} className="gap-2">
              <Key className="w-4 h-4" /> Generate New Key
            </Button>
            <p className="text-xs text-muted-foreground">Rate limit: 1,000 requests/hour. Include key as <code className="bg-muted px-1 rounded">Authorization: Bearer YOUR_KEY</code></p>
          </div>
        )}

        <Link to="/api/docs" className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ExternalLink className="w-3.5 h-3.5" /> View API Documentation
        </Link>
      </div>

      {/* Webhooks */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-chart-4" />
          <h2 className="font-semibold text-foreground">Webhook URLs</h2>
        </div>
        <div className="space-y-2">
          {(form.webhook_urls || []).map(url => (
            <div key={url} className="flex items-center gap-2">
              <Input value={url} readOnly className="font-mono text-xs" />
              <Button size="icon" variant="ghost" onClick={() => removeWebhook(url)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input placeholder="https://yourserver.com/webhook" value={newWebhook} onChange={e => setNewWebhook(e.target.value)} className="font-mono text-xs" />
            <Button size="sm" variant="outline" onClick={addWebhook} className="gap-1 flex-shrink-0"><Plus className="w-4 h-4" /> Add</Button>
          </div>
        </div>
      </div>

      {/* API Log */}
      {logs.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border"><h3 className="font-semibold text-foreground text-sm">Recent API Activity</h3></div>
          <table className="w-full text-xs">
            <thead><tr className="bg-muted/30 border-b border-border">
              {["Time", "Method", "Endpoint", "Status", "ms"].map(h => <th key={h} className="text-left px-4 py-2 text-muted-foreground font-semibold">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2 text-muted-foreground">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "—"}</td>
                  <td className="px-4 py-2"><span className={`font-mono font-bold ${log.method === "GET" ? "text-blue-400" : log.method === "POST" ? "text-green-400" : "text-yellow-400"}`}>{log.method}</span></td>
                  <td className="px-4 py-2 font-mono text-foreground">{log.endpoint}</td>
                  <td className="px-4 py-2"><span className={log.status_code < 400 ? "text-accent" : "text-destructive"}>{log.status_code}</span></td>
                  <td className="px-4 py-2 text-muted-foreground">{log.response_time_ms || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save API Settings"}
        </Button>
      </div>
    </div>
  );
}