import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Flame, Trophy, Star, Award, TrendingUp, Gift } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const ACTION_LABELS = {
  clock_in_on_time: "On-Time Clock In",
  clock_out_on_time: "On-Time Clock Out",
  note_on_time: "Note On Time",
  note_same_shift_bonus: "Same-Shift Bonus",
  med_pass_on_time_clean: "Clean Med Pass",
  goal_data_collected: "Goal Data Collected",
  shift_streak: "Shift Streak",
  training_before_due: "Training Before Due",
  kudos_manager: "Manager Kudos",
};

export default function DSPRecognition() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const staffId = user?.data?.staff_member_id;

  const { data: settings } = useQuery({
    queryKey: ["recognition-settings"],
    queryFn: () => base44.entities.RecognitionSettings.list().then(r => r.items[0] || { enabled: false }),
  });

  const { data: points = [], refetch } = useQuery({
    queryKey: ["recognition-points", staffId],
    queryFn: () => base44.entities.RecognitionPoint.filter({ staff_id: staffId }, { sort: "-date", limit: 100 }).then(r => r.items),
    enabled: !!staffId,
  });

  const { data: streak } = useQuery({
    queryKey: ["staff-streak", staffId],
    queryFn: () => base44.entities.StaffStreak.filter({ staff_id: staffId }).then(r => r.items[0]),
    enabled: !!staffId,
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards-active"],
    queryFn: () => base44.entities.Reward.filter({ active: true }).then(r => r.items),
  });

  const { data: redemptions = [] } = useQuery({
    queryKey: ["my-redemptions", staffId],
    queryFn: () => base44.entities.RewardRedemption.filter({ staff_id: staffId }, { sort: "-date" }).then(r => r.items),
    enabled: !!staffId,
  });

  // Leaderboards (only opted-in staff)
  const { data: leaderboardPoints = [] } = useQuery({
    queryKey: ["leaderboard-points"],
    queryFn: async () => {
      const { items: streaks } = await base44.entities.StaffStreak.filter({ opted_into_leaderboard: true });
      const optedIds = streaks.map(s => s.staff_id);
      if (optedIds.length === 0) return [];
      const { items: allPoints } = await base44.entities.RecognitionPoint.list({ limit: 500 });
      return optedIds.map(id => {
        const staffPoints = allPoints.filter(p => p.staff_id === id);
        return {
          staff_id: id,
          staff_name: streaks.find(s => s.staff_id === id)?.staff_name || "Staff",
          total: staffPoints.reduce((sum, p) => sum + (p.points || 0), 0),
        };
      }).sort((a, b) => b.total - a.total).slice(0, 10);
    },
  });

  const { data: leaderboardStreaks = [] } = useQuery({
    queryKey: ["leaderboard-streaks"],
    queryFn: () => base44.entities.StaffStreak.filter({ opted_into_leaderboard: true }).then(r =>
      r.items.sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0)).slice(0, 10)
    ),
  });

  const totalPoints = useMemo(() => points.reduce((sum, p) => sum + (p.points || 0), 0), [points]);
  const milestones = settings?.streak_milestones || [7, 14, 30, 60, 90];
  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const earnedBadges = milestones.filter(m => longestStreak >= m);

  const redeemMutation = useMutation({
    mutationFn: async (reward) => {
      if (totalPoints < reward.point_cost) throw new Error("Not enough points");
      await base44.entities.RewardRedemption.create({
        staff_id: staffId,
        staff_name: user?.full_name || user?.email,
        reward_id: reward.id,
        reward_name: reward.name,
        point_cost: reward.point_cost,
        status: "Pending",
        date: format(new Date(), "yyyy-MM-dd"),
      });
    },
    onSuccess: () => {
      toast.success("Reward requested! An admin will review it.");
      queryClient.invalidateQueries({ queryKey: ["my-redemptions"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleOptIn = useMutation({
    mutationFn: async (newValue) => {
      if (streak) {
        await base44.entities.StaffStreak.update(streak.id, { opted_into_leaderboard: newValue });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-streak", staffId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard-points"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard-streaks"] });
    },
  });

  if (!settings?.enabled) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Recognition is not currently enabled for your agency.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPoints}</p>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{currentStreak}</p>
              <p className="text-xs text-muted-foreground">Current Streak (days)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
              <Award className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{longestStreak}</p>
              <p className="text-xs text-muted-foreground">Longest Streak</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Award className="w-4 h-4" />Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {milestones.map(m => {
              const earned = longestStreak >= m;
              return (
                <div key={m} className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 ${earned ? "border-violet-300 bg-violet-50" : "border-muted bg-muted/20 opacity-50"}`}>
                  <Flame className={`w-8 h-8 ${earned ? "text-violet-600" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">{m}-Day Streak</span>
                  {earned && <Badge variant="outline" className="bg-violet-100 text-violet-700 text-[10px]">Earned</Badge>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Opt-in */}
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="font-medium text-sm">Show me on leaderboards</p>
            <p className="text-xs text-muted-foreground">Only opted-in staff appear on the Top Points and Top Streaks boards.</p>
          </div>
          <Switch
            checked={streak?.opted_into_leaderboard || false}
            onCheckedChange={(v) => toggleOptIn.mutate(v)}
          />
        </CardContent>
      </Card>

      {/* Leaderboards */}
      {(streak?.opted_into_leaderboard) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="w-4 h-4" />Top Points</CardTitle></CardHeader>
            <CardContent>
              {leaderboardPoints.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> :
                <ol className="space-y-1">
                  {leaderboardPoints.map((p, i) => (
                    <li key={p.staff_id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                      <span className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                        {p.staff_name}
                      </span>
                      <span className="font-semibold">{p.total} pts</span>
                    </li>
                  ))}
                </ol>
              }
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Flame className="w-4 h-4" />Top Active Streaks</CardTitle></CardHeader>
            <CardContent>
              {leaderboardStreaks.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> :
                <ol className="space-y-1">
                  {leaderboardStreaks.map((s, i) => (
                    <li key={s.staff_id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                      <span className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 3 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                        {s.staff_name}
                      </span>
                      <span className="font-semibold">{s.current_streak || 0} days</span>
                    </li>
                  ))}
                </ol>
              }
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rewards Catalog */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gift className="w-4 h-4" />Rewards Catalog</CardTitle></CardHeader>
        <CardContent>
          {rewards.length === 0 ? <p className="text-sm text-muted-foreground">No rewards available yet.</p> :
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rewards.map(r => (
                <div key={r.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{r.name}</p>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700">{r.point_cost} pts</Badge>
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                  <Button size="sm" className="w-full" disabled={totalPoints < r.point_cost || redeemMutation.isPending} onClick={() => redeemMutation.mutate(r)}>
                    {totalPoints < r.point_cost ? "Not enough points" : "Request Reward"}
                  </Button>
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>

      {/* My Redemptions */}
      {redemptions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">My Reward Requests</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {redemptions.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <span>{r.reward_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{r.date}</span>
                    <Badge variant="outline" className={
                      r.status === "Pending" ? "bg-amber-50 text-amber-700" :
                      r.status === "Approved" ? "bg-blue-50 text-blue-700" :
                      r.status === "Fulfilled" ? "bg-emerald-50 text-emerald-700" :
                      "bg-red-50 text-red-700"
                    }>{r.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Points */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-4 h-4" />Recent Points Earned</CardTitle></CardHeader>
        <CardContent>
          {points.length === 0 ? <p className="text-sm text-muted-foreground">No points earned yet. Complete shifts to earn points!</p> :
            <div className="space-y-1">
              {points.slice(0, 15).map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <span>{ACTION_LABELS[p.action] || p.action}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{p.date}</span>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">+{p.points}</Badge>
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