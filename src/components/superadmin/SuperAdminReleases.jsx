import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Megaphone, Tag, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function SuperAdminReleases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showReleaseForm, setShowReleaseForm] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [releaseForm, setReleaseForm] = useState({ version: "", title: "", content: "", release_date: new Date().toISOString().slice(0, 10), type: "feature", published: false });
  const [annForm, setAnnForm] = useState({ title: "", message: "", type: "info", active: true });

  const { data: releases = [] } = useQuery({
    queryKey: ["release-notes"],
    queryFn: () => base44.entities.ReleaseNote.list("-release_date", 50),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => base44.entities.SystemAnnouncement.list("-created_date", 20),
  });

  const createRelease = useMutation({
    mutationFn: (d) => base44.entities.ReleaseNote.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["release-notes"] }); setShowReleaseForm(false); toast({ title: "Release note created" }); },
  });

  const createAnn = useMutation({
    mutationFn: (d) => base44.entities.SystemAnnouncement.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["announcements"] }); setShowAnnouncementForm(false); toast({ title: "Announcement pushed to all agencies" }); },
  });

  const TYPE_COLORS = { feature: "bg-primary/10 text-primary", improvement: "bg-accent/10 text-accent", bugfix: "bg-destructive/10 text-destructive", maintenance: "bg-chart-4/10 text-chart-4" };
  const ANN_COLORS = { info: "bg-primary/10 text-primary", warning: "bg-chart-4/10 text-chart-4", maintenance: "bg-muted text-muted-foreground", critical: "bg-destructive/10 text-destructive" };

  return (
    <div className="space-y-6">
      {/* System Announcements */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-chart-4" />
            <h3 className="font-semibold text-foreground">System Announcements</h3>
          </div>
          <Button size="sm" onClick={() => setShowAnnouncementForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Announcement
          </Button>
        </div>
        {announcements.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No announcements yet.</p>}
        <div className="space-y-2">
          {announcements.map(ann => (
            <div key={ann.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${ANN_COLORS[ann.type] || ANN_COLORS.info}`}>{ann.type}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{ann.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ann.message}</p>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${ann.active ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                {ann.active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Release Notes */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Release Notes</h3>
          </div>
          <Button size="sm" onClick={() => setShowReleaseForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Release
          </Button>
        </div>
        {releases.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No release notes yet.</p>}
        <div className="space-y-3">
          {releases.map(r => (
            <div key={r.id} className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-primary">v{r.version}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${TYPE_COLORS[r.type] || TYPE_COLORS.feature}`}>{r.type}</span>
                <span className="text-xs text-muted-foreground ml-auto">{r.release_date}</span>
                {r.published && <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded">Published</span>}
              </div>
              <p className="text-sm font-medium text-foreground">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* New Release Dialog */}
      <Dialog open={showReleaseForm} onOpenChange={setShowReleaseForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Release Note</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Version</label><Input placeholder="3.0.0" value={releaseForm.version} onChange={e => setReleaseForm(p => ({ ...p, version: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Date</label><Input type="date" value={releaseForm.release_date} onChange={e => setReleaseForm(p => ({ ...p, release_date: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Type</label>
              <Select value={releaseForm.type} onValueChange={v => setReleaseForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["feature", "improvement", "bugfix", "maintenance"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">Title</label><Input placeholder="What's new?" value={releaseForm.title} onChange={e => setReleaseForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">Content</label><Textarea rows={4} placeholder="Describe the release..." value={releaseForm.content} onChange={e => setReleaseForm(p => ({ ...p, content: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReleaseForm(false)}>Cancel</Button>
            <Button onClick={() => createRelease.mutate({ ...releaseForm, published: true })} disabled={!releaseForm.version || !releaseForm.title}>
              <Send className="w-4 h-4 mr-2" /> Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Announcement Dialog */}
      <Dialog open={showAnnouncementForm} onOpenChange={setShowAnnouncementForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Push System Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Type</label>
              <Select value={annForm.type} onValueChange={v => setAnnForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["info", "warning", "maintenance", "critical"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">Title</label><Input placeholder="Announcement title" value={annForm.title} onChange={e => setAnnForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><label className="text-xs text-muted-foreground">Message</label><Textarea rows={3} placeholder="Message to all agencies..." value={annForm.message} onChange={e => setAnnForm(p => ({ ...p, message: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnnouncementForm(false)}>Cancel</Button>
            <Button onClick={() => createAnn.mutate(annForm)} disabled={!annForm.title || !annForm.message}>
              <Megaphone className="w-4 h-4 mr-2" /> Push to All Agencies
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}