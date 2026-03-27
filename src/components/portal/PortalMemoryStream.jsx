import React, { useContext, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PortalContext } from "@/pages/Portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, Plus, Shield, Upload, Heart, Lock } from "lucide-react";
import { format } from "date-fns";

export default function PortalMemoryStream() {
  const { portalUser } = useContext(PortalContext);
  const qc = useQueryClient();
  const firstName = portalUser?.client_name?.split(" ")[0] || "them";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ caption: "", memory_date: new Date().toISOString().split("T")[0], location: "", notes: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [fileRef, setFileRef] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: milestones = [] } = useQuery({
    queryKey: ["qol-milestones-portal", portalUser?.client_id],
    queryFn: () => base44.entities.QoLMilestone.filter({ client_id: portalUser?.client_id }),
  });

  const createMilestone = useMutation({
    mutationFn: (data) => base44.entities.QoLMilestone.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qol-milestones-portal"] });
      setShowForm(false);
      setForm({ caption: "", memory_date: new Date().toISOString().split("T")[0], location: "", notes: "" });
      setUploadedUrl(null);
    },
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadedUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = () => {
    createMilestone.mutate({
      client_id: portalUser?.client_id,
      client_name: portalUser?.client_name,
      milestone_date: form.memory_date,
      milestone_type: "Other",
      title: form.caption || "Family memory",
      description: `${form.location ? form.location + " · " : ""}${form.notes}`,
      is_featured: false,
    });
  };

  const sorted = [...milestones].sort((a, b) => new Date(b.milestone_date) - new Date(a.milestone_date));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Memories & Milestones</h2>
        <p className="text-sm text-slate-500 mt-0.5">Moments from {firstName}'s life — from the program and from home</p>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex gap-3 text-sm text-violet-800">
        <Shield className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Photos here are subject to {firstName}'s consent.</p>
          <p className="text-xs mt-1 text-violet-700">Only photos where everyone pictured has consented are shared. {firstName} can request removal of any photo at any time with no questions asked. Photos you add from family time become part of {firstName}'s life story — a fuller picture than services alone can capture.</p>
        </div>
      </div>

      <Button onClick={() => setShowForm(s => !s)} variant="outline" className="gap-2">
        <Plus className="w-4 h-4" />Add a Memory from Home
      </Button>

      {showForm && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4 text-violet-500" />Add a Family Memory</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.memory_date} onChange={e => set("memory_date", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Caption / Title *</Label>
              <Input value={form.caption} onChange={e => set("caption", e.target.value)} className="mt-1" placeholder="e.g. Birthday dinner at Grandma's" />
            </div>
            <div>
              <Label>Location (optional)</Label>
              <Input value={form.location} onChange={e => set("location", e.target.value)} className="mt-1" placeholder="e.g. Home, Local park" />
            </div>
            <div>
              <Label>What happened? What was memorable?</Label>
              <Textarea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1 text-sm" placeholder="Share whatever feels right to share…" />
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />Add a Photo (optional)</Label>
              <p className="text-xs text-slate-400 mt-0.5 mb-2">Only add photos where everyone pictured would be comfortable being included in {firstName}'s care record.</p>
              <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm text-slate-600" />
              {uploading && <p className="text-xs text-slate-400 mt-1">Uploading…</p>}
              {uploadedUrl && <img src={uploadedUrl} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-xl border border-slate-200" />}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={!form.caption.trim() || createMilestone.isPending} className="bg-sky-600 hover:bg-sky-700 gap-2">
                <Heart className="w-4 h-4" />Save Memory
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sorted.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Camera className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 text-sm">No milestones yet.</p>
            <p className="text-xs text-slate-400 mt-1">Add a memory from home, or they'll appear here as the program team documents {firstName}'s achievements.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {sorted.map((m, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm text-slate-800">{m.title}</p>
                  <span className="text-xs text-slate-400 shrink-0">{m.milestone_date ? format(new Date(m.milestone_date), "MMM d, yyyy") : ""}</span>
                </div>
                {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                {m.in_persons_words && <p className="text-xs text-violet-700 italic mt-1">"{m.in_persons_words}"</p>}
                <Badge variant="outline" className="text-[10px] mt-1.5">{m.milestone_type}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}