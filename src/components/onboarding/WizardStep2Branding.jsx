import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, Upload } from "lucide-react";

export default function WizardStep2Branding({ data, onNext, onBack }) {
  const [form, setForm] = useState({ display_name: data.name || "", primary_color: "#0ea5e9", secondary_color: "#10b981", logo_url: "", ...data });
  const [uploading, setUploading] = useState(false);

  const handleLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, logo_url: file_url }));
    setUploading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Branding</h2>
      <p className="text-muted-foreground mb-6">Set your agency's brand colors and platform name.</p>

      {/* Live preview */}
      <div className="rounded-xl border border-border overflow-hidden mb-6">
        <p className="text-xs text-muted-foreground bg-muted/30 px-3 py-1.5">Preview</p>
        <div className="flex items-center gap-3 p-4" style={{ background: `linear-gradient(135deg, ${form.primary_color}20, ${form.secondary_color}10)` }}>
          {form.logo_url
            ? <img src={form.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
            : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: form.primary_color }}>{(form.display_name || "A").charAt(0)}</div>
          }
          <div>
            <p className="font-bold text-foreground">{form.display_name || "Your Platform Name"}</p>
            <p className="text-xs text-muted-foreground">Care Management</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div><label className="text-sm font-medium text-foreground">Platform Name</label><Input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} placeholder="MyAgency Care Portal" className="mt-1" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium text-foreground">Primary Color</label>
            <div className="flex gap-2 mt-1"><input type="color" value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} className="w-10 h-9 rounded-md border border-input cursor-pointer p-0.5" /><Input value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} className="font-mono" /></div>
          </div>
          <div><label className="text-sm font-medium text-foreground">Accent Color</label>
            <div className="flex gap-2 mt-1"><input type="color" value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))} className="w-10 h-9 rounded-md border border-input cursor-pointer p-0.5" /><Input value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))} className="font-mono" /></div>
          </div>
        </div>
        <div><label className="text-sm font-medium text-foreground">Logo</label>
          <div className="mt-1 flex items-center gap-3">
            {form.logo_url && <img src={form.logo_url} alt="logo" className="w-14 h-14 rounded-lg object-contain border border-border p-1 bg-white" />}
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-input rounded-md text-sm hover:bg-muted/50 transition-colors">
              <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload Logo"}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            </label>
          </div>
        </div>
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} className="gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
          <Button onClick={() => onNext(form)} className="gap-2">Continue <ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}