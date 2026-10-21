import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Trophy, Gift, Settings, CheckCircle, XCircle, PackageCheck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const POINT_FIELDS = [
  { key: "clock_in_on_time", label: "On-Time Clock In" },
  { key: "clock_out_on_time", label: "On-Time Clock Out" },
  { key: "note_on_time", label: "Note On Time" },
  { key: "note_same_shift_bonus", label: "Same-Shift Bonus" },
  { key: "med_pass_on_time_clean", label: "Clean Med Pass" },
  { key: "goal_data_collected", label: "Goal Data Collected" },
  { key: "shift_streak_base", label: "Shift Streak" },
  { key: "training_before_due", label: "Training Before Due" },
  { key: "kudos_manager", label: "Manager Kudos" },
];

export default function AdminRecognition() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, refetch } = useQuery({
    queryKey: ["recognition-settings"],
    queryFn: () => base44.entities.RecognitionSettings.list().then(r => r.items[0] || { enabled: false }),
  });

  const [pointValues, setPointValues] = useState({});
  const [kudosLimit, setKudosLimit] = useState(5);
  const [optInDefault, setOptInDefault] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Sync local state when settings load
  useMemo(() => {
    if (settings && !loaded) {
      setPointValues(settings.point_values || {});
      setKudosLimit(settings.kudos_monthly_limit || 5);
      setOptInDefault(settings.leaderboard_opt_in_default || false);
      setLoaded(true);
    }
  }, [settings, loaded]);

  // Rewards catalog
  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards-all"],
    queryFn: () => base44.entities.Reward.list().then(r => r.items),
  });

  // Redemptions
  const { data: redemptions = [] } = useQuery({
    queryKey: ["all-redemptions"],
    queryFn: () => base44.entities.RewardRedemption.filter({ status: { $in: ["Pending", "Approved"] } }, { sort: "-date" }).then(r => r.items),
  });

  // Agency stats
  const { data: allPoints = [] } = useQuery({
    queryKey: ["all-recognition-points"],
    queryFn: () => base44.entities.RecognitionPoint.list({ limit: 500 }).then(r => r.items),
  });

  const { data: allStreaks = [] } = useQuery({
    queryKey: ["all-streaks"],
    queryFn: () => base44.entities.StaffStreak.list({ limit: 200 }).then(r => r.items),
  });

  const agencyStats = useMemo(() => {
    const totalPoints = allPoints.reduce((sum, p) => sum + (p.points || 0), 0);
    const activeStreaks = allStreaks.filter(s => (s.current_streak || 0) > 0).length;
    const longestStreak = allStreaks.reduce((max, s) => Math.max(max, s.longest_streak || 0), 0);
    return { totalPoints, activeStreaks, longestStreak, totalStaff: allStreaks.length };
  }, [allPoints, allStreaks]);

  // Save settings
  const saveSettings = useMutation({
    mutationFn: async () => {
      const payload = {
        enabled: settings?.enabled ?? true,
        point_values: pointValues,
        kudos_monthly_limit: kudosLimit,
        leaderboard_opt_in_default: optInDefault,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };
      if (settings?.id) {
        await base44.entities.RecognitionSettings.update(settings.id, payload);
      } else {
        await base44.entities.RecognitionSettings.create(payload);
      }
    },
    onSuccess: () => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["recognition-settings"] });
      setLoaded(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleEnabled = useMutation({
    mutationFn: async (newValue) => {
      if (settings?.id) {
        await base44.entities.RecognitionSettings.update(settings.id, { enabled: newValue, updated_by: user?.id, updated_at: new Date().toISOString() });
      } else {
        await base44.entities.RecognitionSettings.create({ enabled: newValue, point_values: pointValues, kudos_monthly_limit: kudosLimit, leaderboard_opt_in_default: optInDefault, updated_by: user?.id, updated_at: new Date().toISOString() });
      }
    },
    onSuccess: () => {
      toast.success(`Recognition ${!settings?.enabled ? "enabled" : "disabled"}`);
      queryClient.invalidateQueries({ queryKey: ["recognition-settings"] });
    },
  });

  // Reward CRUD
  const [newReward, setNewReward] = useState({ name: "", description: "", reward_type: "Gift Card", point_cost: 100 });

  const createReward = useMutation({
    mutationFn: () => base44.entities.Reward.create({ ...newReward, active: true }),
    onSuccess: () => {
      toast.success("Reward added");
      setNewReward({ name: "", description: "", reward_type: "Gift Card", point_cost: 100 });
      queryClient.invalidateQueries({ queryKey: ["rewards-all"] });
    },
  });

  const deleteReward = useMutation({
    mutationFn: (id) => base44.entities.Reward.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rewards-all"] }),
  });

  // Redemption actions
  const updateRedemption = useMutation({
    mutationFn: async ({ id, status }) => {
      const update = { status, reviewed_by: user?.id, reviewed_by_name: user?.full_name, reviewed_at: new Date().toISOString() };
      if (status === "Fulfilled") update.fulfilled_at = new Date().toISOString();
      await base44.entities.RewardRedemption.update(id, update);
    },
    onSuccess: () => {
      toast.success("Redemption updated");
      queryClient.invalidateQueries({ queryKey: ["all-redemptions"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Agency Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-blue-500" /><span className="text-xs text-muted-foreground">Staff Tracked</span></div><p className="text-xl font-bold">{agencyStats.totalStaff}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Trophy className="w-4 h-4 text-amber-500" /><span className="text-xs text-muted-foreground">Total Points</span></div><p className="text-xl font-bold">{agencyStats.totalPoints}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Trophy className="w-4 h-4 text-orange-500" /><span className="text-xs text-muted-foreground">Active Streaks</span></div><p className="text-xl font-bold">{agencyStats.activeStreaks}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Trophy className="w-4 h-4 text-violet-500" /><span className="text-xs text-muted-foreground">Longest Streak</span></div><p className="text-xl font-bold">{agencyStats.longestStreak}d</p></CardContent></Card>
      </div>

      {/* Enable/Disable Toggle */}
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="font-medium text-sm">Recognition Program</p>
            <p className="text-xs text-muted-foreground">Turn the entire recognition system on or off for your agency.</p>
          </div>
          <Switch checked={settings?.enabled || false} onCheckedChange={(v) => toggleEnabled.mutate(v)} />
        </CardContent>
      </Card>

      {/* Point Values */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Settings className="w-4 h-4" />Point Values</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {POINT_FIELDS.map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <Input type="number" value={pointValues[f.key] ?? 5} onChange={e => setPointValues(prev => ({ ...prev, [f.key]: parseInt(e.target.value) || 0 }))} className="h-8" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Kudos Monthly Limit (per manager)</Label>
              <Input type="number" value={kudosLimit} onChange={e => setKudosLimit(parseInt(e.target.value) || 0)} className="h-8" />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg border">
              <div>
                <Label className="text-xs">Leaderboard Opt-In Default</Label>
                <p className="text-xs text-muted-foreground">New DSPs start opted in to leaderboards</p>
              </div>
              <Switch checked={optInDefault} onCheckedChange={setOptInDefault} />
            </div>
          </div>
          <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>Save Settings</Button>
        </CardContent>
      </Card>

      {/* Rewards Catalog */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gift className="w-4 h-4" />Rewards Catalog</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Input placeholder="Reward name" value={newReward.name} onChange={e => setNewReward(p => ({ ...p, name: e.target.value }))} className="h-8" />
            <Input placeholder="Description" value={newReward.description} onChange={e => setNewReward(p => ({ ...p, description: e.target.value }))} className="h-8" />
            <Select value={newReward.reward_type} onValueChange={v => setNewReward(p => ({ ...p, reward_type: v }))}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Gift Card">Gift Card</SelectItem>
                <SelectItem value="PTO Hours">PTO Hours</SelectItem>
                <SelectItem value="Merchandise">Merchandise</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input type="number" placeholder="Point cost" value={newReward.point_cost} onChange={e => setNewReward(p => ({ ...p, point_cost: parseInt(e.target.value) || 0 }))} className="h-8" />
              <Button size="sm" onClick={() => createReward.mutate()} disabled={!newReward.name || createReward.isPending}>Add</Button>
            </div>
          </div>
          {rewards.length > 0 && (
            <div className="space-y-2">
              {rewards.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700">{r.point_cost} pts</Badge>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{r.reward_type}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteReward.mutate(r.id)} className="text-red-600 hover:text-red-700 h-7">Remove</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Redemptions Queue */}
      <Card>
        <CardHeader><CardTitle className="text-base">Reward Redemption Requests</CardTitle></CardHeader>
        <CardContent>
          {redemptions.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests.</p> :
            <div className="space-y-2">
              {redemptions.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={
                      r.status === "Pending" ? "bg-amber-50 text-amber-700" :
                      r.status === "Approved" ? "bg-blue-50 text-blue-700" : ""
                    }>{r.status}</Badge>
                    <span className="font-medium">{r.staff_name}</span>
                    <span className="text-muted-foreground">{r.reward_name}</span>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700">{r.point_cost} pts</Badge>
                  </div>
                  <div className="flex gap-1">
                    {r.status === "Pending" && <>
                      <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 h-7 gap-1" onClick={() => updateRedemption.mutate({ id: r.id, status: "Approved" })}><CheckCircle className="w-3.5 h-3.5" />Approve</Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 h-7 gap-1" onClick={() => updateRedemption.mutate({ id: r.id, status: "Denied" })}><XCircle className="w-3.5 h-3.5" />Deny</Button>
                    </>}
                    {r.status === "Approved" && <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 h-7 gap-1" onClick={() => updateRedemption.mutate({ id: r.id, status: "Fulfilled" })}><PackageCheck className="w-3.5 h-3.5" />Mark Fulfilled</Button>}
                  </div>
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}