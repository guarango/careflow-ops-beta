import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Users, Flame, Star } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ManagerRecognition() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const managerStaffId = user?.data?.staff_member_id;
  const monthKey = format(new Date(), "yyyy-MM");

  const { data: settings } = useQuery({
    queryKey: ["recognition-settings"],
    queryFn: () => base44.entities.RecognitionSettings.list().then(r => r.items[0] || { enabled: false }),
  });

  // Team staff list (from user's team_staff_ids or all staff for manager)
  const { data: teamStaff = [] } = useQuery({
    queryKey: ["team-staff-recognition"],
    queryFn: async () => {
      const { items } = await base44.entities.StaffMember.filter({ status: "Active" }, { limit: 200 });
      return items;
    },
  });

  // All recognition points for team
  const { data: allPoints = [] } = useQuery({
    queryKey: ["all-recognition-points"],
    queryFn: () => base44.entities.RecognitionPoint.list({ limit: 500 }).then(r => r.items),
  });

  // All streaks
  const { data: allStreaks = [] } = useQuery({
    queryKey: ["all-streaks"],
    queryFn: () => base44.entities.StaffStreak.list({ limit: 200 }).then(r => r.items),
  });

  // Manager's kudos this month
  const { data: myKudos = [] } = useQuery({
    queryKey: ["my-kudos", monthKey],
    queryFn: () => base44.entities.Kudos.filter({ from_user_id: user?.id, month_key: monthKey }).then(r => r.items),
    enabled: !!user?.id,
  });

  const kudosLimit = settings?.kudos_monthly_limit || 5;
  const kudosRemaining = Math.max(0, kudosLimit - myKudos.length);

  // Team stats: aggregate points by staff
  const teamStats = useMemo(() => {
    return teamStaff.map(staff => {
      const staffPoints = allPoints.filter(p => p.staff_id === staff.id);
      const streak = allStreaks.find(s => s.staff_id === staff.id);
      return {
        staff,
        totalPoints: staffPoints.reduce((sum, p) => sum + (p.points || 0), 0),
        currentStreak: streak?.current_streak || 0,
        longestStreak: streak?.longest_streak || 0,
        pointCount: staffPoints.length,
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [teamStaff, allPoints, allStreaks]);

  // Kudos form
  const [kudosStaff, setKudosStaff] = useState("");
  const [kudosMessage, setKudosMessage] = useState("");

  const giveKudos = useMutation({
    mutationFn: async () => {
      if (!kudosStaff) throw new Error("Select a staff member");
      if (kudosRemaining <= 0) throw new Error("You've reached your monthly kudos limit");
      const staff = teamStaff.find(s => s.id === kudosStaff);
      const pointsValue = settings?.point_values?.kudos_manager || 20;

      // Create kudos record
      const kudos = await base44.entities.Kudos.create({
        from_staff_id: managerStaffId || user?.id,
        from_staff_name: user?.full_name || user?.email,
        from_user_id: user?.id,
        to_staff_id: kudosStaff,
        to_staff_name: `${staff?.first_name} ${staff?.last_name}`,
        date: format(new Date(), "yyyy-MM-dd"),
        month_key: monthKey,
        message: kudosMessage,
        points_awarded: pointsValue,
      });

      // Create recognition point
      await base44.entities.RecognitionPoint.create({
        staff_id: kudosStaff,
        staff_name: `${staff?.first_name} ${staff?.last_name}`,
        action: "kudos_manager",
        points: pointsValue,
        date: format(new Date(), "yyyy-MM-dd"),
        kudos_id: kudos.id,
        reason: kudosMessage || "Manager kudos",
      });
    },
    onSuccess: () => {
      toast.success("Kudos sent!");
      setKudosStaff("");
      setKudosMessage("");
      queryClient.invalidateQueries({ queryKey: ["my-kudos"] });
      queryClient.invalidateQueries({ queryKey: ["all-recognition-points"] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (!settings?.enabled) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Recognition is not currently enabled for your agency.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Users className="w-4 h-4" />Team Stats</CardTitle>
        </CardHeader>
        <CardContent>
          {teamStats.length === 0 ? <p className="text-sm text-muted-foreground">No team members found.</p> :
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-medium">Staff</th>
                    <th className="py-2 px-4 font-medium text-right">Points</th>
                    <th className="py-2 px-4 font-medium text-right">Current Streak</th>
                    <th className="py-2 px-4 font-medium text-right">Longest Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats.map(({ staff, totalPoints, currentStreak, longestStreak }) => (
                    <tr key={staff.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{staff.first_name} {staff.last_name}</td>
                      <td className="py-2 px-4 text-right">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700">{totalPoints}</Badge>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 gap-1"><Flame className="w-3 h-3" />{currentStreak}</Badge>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <Badge variant="outline" className="bg-violet-50 text-violet-700">{longestStreak}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </CardContent>
      </Card>

      {/* Give Kudos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="w-4 h-4" />Give Kudos
            <Badge variant="outline" className="ml-auto bg-blue-50 text-blue-700">{kudosRemaining} left this month</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Staff Member</Label>
            <Select value={kudosStaff} onValueChange={setKudosStaff}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select team member" /></SelectTrigger>
              <SelectContent>
                {teamStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Message (no client PII)</Label>
            <Textarea value={kudosMessage} onChange={e => setKudosMessage(e.target.value)} placeholder="Great teamwork this week..." rows={2} />
          </div>
          <Button onClick={() => giveKudos.mutate()} disabled={giveKudos.isPending || kudosRemaining <= 0} className="gap-1.5">
            <Star className="w-4 h-4" />Send Kudos ({settings?.point_values?.kudos_manager || 20} pts)
          </Button>
        </CardContent>
      </Card>

      {/* Kudos Given This Month */}
      {myKudos.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Kudos Given This Month</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myKudos.map(k => (
                <div key={k.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{k.to_staff_name}</span>
                    {k.message && <p className="text-xs text-muted-foreground">{k.message}</p>}
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700">+{k.points_awarded}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}