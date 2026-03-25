import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Upload, Palette } from "lucide-react";

export default function AgencyBranding({ agency, onSave, saving }) {
  const [form, setForm] = useState({
    display_name: "", primary_color: "#0ea5e9", secondary_color: "#10b981",
    email_sender_name: "", email_reply_to: "", logo_url: "", ...agency
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (agency) setForm(f => ({ ...f, ...agency })); }, [agency]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, logo_url: file_url }));
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      {/* Preview banner */}
      <div className="rounded-xl overflow-hidden border border-border">
        <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30">Preview</div>
        <div className="flex items-center gap-3 p-4" style={{ background: `linear-gradient(135deg, ${form.primary_color}15, ${form.secondary_color}10)` }}>
          {form.logo_url
            ? <img src={form.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
            : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: form.primary_color }}>{(form.display_name || "A").charAt(0)}</div>
          }
          <div>
            <p className="font-bold text-foreground">{form.display_name || "Your Agency Name"}</p>
            <p className="text-xs text-muted-foreground">Care Management Platform</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2"><Palette className="w-4 h-4" /> Brand Identity</h2>
        <div><label className="text-xs text-muted-foreground">Platform Display Name</label>
          <Input placeholder="MyAgency Care Portal" value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Primary Color</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} className="w-10 h-9 rounded-md border border-input cursor-pointer p-0.5" />
              <Input value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} className="font-mono text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Secondary / Accent Color</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))} className="w-10 h-9 rounded-md border border-input cursor-pointer p-0.5" />
              <Input value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))} className="font-mono text-sm" />
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Agency Logo</label>
          <div className="mt-1 flex items-center gap-3">
            {form.logo_url && <img src={form.logo_url} alt="logo" className="w-16 h-16 rounded-lg object-contain border border-border bg-white p-1" />}
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <div className="flex items-center gap-2 px-4 py-2 border border-input rounded-md text-sm hover:bg-muted/50 transition-colors">
                <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload Logo"}
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Email Settings</h2>
        <div><label className="text-xs text-muted-foreground">Email Sender Name</label>
          <Input placeholder="Sunrise Care Support" value={form.email_sender_name} onChange={e => setForm(p => ({ ...p, email_sender_name: e.target.value }))} />
        </div>
        <div><label className="text-xs text-muted-foreground">Reply-To Email Address</label>
          <Input type="email" placeholder="noreply@sunrisecares.com" value={form.email_reply_to} onChange={e => setForm(p => ({ ...p, email_reply_to: e.target.value }))} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Branding"}
        </Button>
      </div>
    </div>
  );
}