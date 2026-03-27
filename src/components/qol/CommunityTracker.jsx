import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, MapPin, CheckCircle2 } from "lucide-react";
import { hasIntegratedActivityInDays, detectRepetitiveActivities } from "@/lib/qolEngine";
import { cn } from "@/lib/utils";
import { format, subMonths, startOfMonth } from "date-fns";

const INT_TYPES = ["Integrated (includes non-disabled people)", "IDD-Specific (only people with IDD)", "Mixed"];

export default function CommunityTracker({ client, activities, lifeVision, onCreate }) {
  const [showDialog, setShowDialog] = useState(false);

  const hasIntegrated = hasIntegratedActivityInDays(activities, 60);
  const repetitive = detectRepetitiveActivities(activities);

  const integrated = activities.filter(a => a.integration_type === "Integrated (includes non-disabled people)");
  const iddOnly = activities.filter(a => a.integration_type === "IDD-Specific (only people with IDD)");
  const integrated_pct = activities.length > 0 ? Math.round((integrated.length / activities.length) * 100) : null;

  const personChose = activities.filter(a => a.person_chose_activity).length;
  const personChosePct = activities.length > 0 ? Math.round((personChose / activities.length) * 100) : null;

  // Monthly activity counts (last 6 months)
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return { label: format(d, "MMM"), start: startOfMonth(d) };
    });
    return months.map(m => ({
      label: m.label,
      count: activities.filter(a => {
        const d = new Date(a.date);
        return d >= m.start && d < subMonths(m.start, -1);
      }).length,
    }));
  }, [activities]);

  const maxCount = Math.max(...monthlyData.map(m => m.count), 1);

  const handleSave = (data) => {
    onCreate({ ...data, client_id: client.id, client_name: `${client.first_name} ${client.last_name}` });
    setShowDialog(false);
  };

  return (
    <div className="space-y-5">
      {/* Flags */}
      {!hasIntegrated && activities.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3">
          <p className="text-sm font-bold text-amber-800 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />No Integrated Community Activity in 60 Days</p>
          <p className="text-xs text-amber-700 mt-1">Federal HCBS rules require integrated community participation. This metric surfaces whether it is actually happening. The team should discuss what barriers are preventing {client.first_name} from participating in activities with non-disabled community members.</p>
        </div>
      )}

      {repetitive && (
        <div className="bg-blue-50 border border-blue-300 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-blue-800">Same Activities Repeated</p>
          <p className="text-xs text-blue-700 mt-1">The following activities have occurred 3+ times in the last 6 outings: <strong>{repetitive.join(", ")}</strong>. Has {client.first_name} confirmed these are their top preferences? If not, the team should explore new options.</p>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className={cn("border-2 rounded-xl p-4 text-center", integrated_pct !== null && integrated_pct >= 60 ? "border-emerald-300 bg-emerald-50" : integrated_pct !== null ? "border-amber-300 bg-amber-50" : "border-border bg-white")}>
          <p className="text-2xl font-bold">{integrated_pct !== null ? `${integrated_pct}%` : "—"}</p>
          <p className="text-xs text-muted-foreground">Integrated Activities</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{integrated.length} integrated · {iddOnly.length} IDD-only</p>
        </div>
        <div className="border-2 border-border rounded-xl p-4 text-center bg-white">
          <p className="text-2xl font-bold">{activities.length}</p>
          <p className="text-xs text-muted-foreground">Total Activities</p>
        </div>
        <div className={cn("border-2 rounded-xl p-4 text-center", personChosePct !== null && personChosePct >= 70 ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50")}>
          <p className="text-2xl font-bold">{personChosePct !== null ? `${personChosePct}%` : "—"}</p>
          <p className="text-xs text-muted-foreground">Person Chose Activity</p>
        </div>
      </div>

      {/* Monthly bar chart */}
      {activities.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">Activity Frequency (last 6 months)</p>
          <div className="flex gap-1 items-end h-16">
            {monthlyData.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-primary/20 rounded-sm transition-all" style={{ height: `${Math.round((m.count / maxCount) * 48)}px`, minHeight: m.count > 0 ? "4px" : "0" }} />
                <span className="text-[9px] text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity list */}
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">All Community Activities ({activities.length})</p>
        <Button size="sm" onClick={() => setShowDialog(true)} className="gap-1"><Plus className="w-3.5 h-3.5" />Log Activity</Button>
      </div>

      {activities.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8 border-dashed border-2 border-border rounded-xl">No community activities logged for {client.first_name} yet.</p>
      )}

      <div className="space-y-2">
        {[...activities].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30).map((a, i) => (
          <div key={i} className="border border-border rounded-xl p-3 bg-white flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{a.activity_name}</p>
                <p className="text-xs text-muted-foreground">{a.date} {a.location && `· ${a.location}`}</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <Badge variant="outline" className={cn("text-[10px]",
                    a.integration_type === "Integrated (includes non-disabled people)" ? "border-emerald-300 text-emerald-700 bg-emerald-50" :
                    a.integration_type === "IDD-Specific (only people with IDD)" ? "border-amber-300 text-amber-700 bg-amber-50" :
                    "border-border"
                  )}>{a.integration_type === "Integrated (includes non-disabled people)" ? "Integrated" : a.integration_type === "IDD-Specific (only people with IDD)" ? "IDD-Specific" : "Mixed"}</Badge>
                  {!a.person_chose_activity && <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500">Scheduled for them</Badge>}
                  {a.new_connections_made && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-300">New connection</Badge>}
                  {a.linked_to_life_vision && <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-300">Life vision</Badge>}
                </div>
              </div>
            </div>
            {a.enjoyment_rating && <span className="text-xs text-amber-500 shrink-0">{"★".repeat(a.enjoyment_rating)}</span>}
          </div>
        ))}
      </div>

      {showDialog && (
        <ActivityDialog client={client} lifeVision={lifeVision} onSave={handleSave} onClose={() => setShowDialog(false)} />
      )}
    </div>
  );
}

function ActivityDialog({ client, lifeVision, onSave, onClose }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    activity_name: "", location: "", activity_type: "",
    integration_type: "Integrated (includes non-disabled people)",
    person_chose_activity: true, enjoyment_rating: 3,
    new_connections_made: false, new_connection_details: "",
    linked_to_life_vision: false, staff_present: "", notes: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Log Community Activity</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Activity Name *</Label><Input value={form.activity_name} onChange={e => set("activity_name", e.target.value)} placeholder="e.g. Farmers market, Yoga class" /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => set("location", e.target.value)} /></div>
          <div><Label>Integration Type</Label>
            <Select value={form.integration_type} onValueChange={v => set("integration_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{INT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>{client.first_name}'s Enjoyment (1–5)</Label>
            <div className="flex gap-1 mt-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => set("enjoyment_rating", n)}
                  className={cn("text-xl", form.enjoyment_rating >= n ? "text-amber-400" : "text-slate-200")}>★</button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.person_chose_activity} onChange={e => set("person_chose_activity", e.target.checked)} />
            {client.first_name} chose this activity
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.new_connections_made} onChange={e => set("new_connections_made", e.target.checked)} />
            New community connection made
          </label>
          {form.new_connections_made && <div><Label>Connection Details</Label><Input value={form.new_connection_details} onChange={e => set("new_connection_details", e.target.value)} /></div>}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.linked_to_life_vision} onChange={e => set("linked_to_life_vision", e.target.checked)} />
            Tied to a personal interest from {client.first_name}'s life vision
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.activity_name || !form.date}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}