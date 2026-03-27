import React, { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PortalContext } from "@/pages/Portal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Award, Users, Globe, Briefcase, Heart } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ICONS = {
  "Domain Best Score": Star,
  "New Relationship": Users,
  "Community Connection": Globe,
  "Employment": Briefcase,
  "Goal Mastered": Award,
  "Life Vision Progress": Heart,
  "Self-Advocacy Moment": Star,
  "Other": Heart,
};

const TYPE_COLORS = {
  "Domain Best Score": "bg-amber-50 border-amber-200 text-amber-700",
  "New Relationship": "bg-blue-50 border-blue-200 text-blue-700",
  "Community Connection": "bg-emerald-50 border-emerald-200 text-emerald-700",
  "Employment": "bg-violet-50 border-violet-200 text-violet-700",
  "Goal Mastered": "bg-sky-50 border-sky-200 text-sky-700",
  "Life Vision Progress": "bg-rose-50 border-rose-200 text-rose-700",
  "Self-Advocacy Moment": "bg-orange-50 border-orange-200 text-orange-700",
  "Other": "bg-slate-50 border-slate-200 text-slate-700",
};

export default function PortalMilestones() {
  const { portalUser } = useContext(PortalContext);
  const firstName = portalUser?.client_name?.split(" ")[0] || "them";

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ["qol-milestones-portal", portalUser?.client_id],
    queryFn: () => base44.entities.QoLMilestone.filter({ client_id: portalUser?.client_id }),
  });

  const { data: masteredGoals = [] } = useQuery({
    queryKey: ["mastered-goals-portal", portalUser?.client_id],
    queryFn: () => base44.entities.ClientGoal.filter({ client_id: portalUser?.client_id, status: "Mastered" }),
  });

  const sorted = [...milestones].sort((a, b) => new Date(b.milestone_date) - new Date(a.milestone_date));
  const featured = sorted.filter(m => m.is_featured);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Milestones & Achievements</h2>
        <p className="text-sm text-slate-500 mt-0.5">Real moments from {firstName}'s life — things worth celebrating</p>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
        These are not progress reports. They are real achievements — things {firstName} did, said, tried, or accomplished. You won't hear about these at the annual ISP meeting months from now. You'll hear about them here, when they happen.
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Featured Highlights</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {featured.map((m, i) => {
              const Icon = ICONS[m.milestone_type] || Heart;
              return (
                <div key={i} className={cn("border-2 rounded-xl p-4", TYPE_COLORS[m.milestone_type] || TYPE_COLORS["Other"])}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{m.title}</p>
                      <p className="text-xs opacity-70 mt-0.5">{m.milestone_date ? format(new Date(m.milestone_date), "MMMM d, yyyy") : ""}</p>
                      {m.description && <p className="text-xs mt-1.5 opacity-80">{m.description}</p>}
                      {m.in_persons_words && (
                        <p className="text-xs italic mt-2 font-medium">"{m.in_persons_words}"</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mastered goals */}
      {masteredGoals.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Goals {firstName} Has Mastered</p>
          <div className="space-y-2">
            {masteredGoals.map((g, i) => (
              <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">{g.goal_title}</p>
                  {g.persons_own_words && <p className="text-xs text-emerald-600 italic mt-0.5">"{g.persons_own_words}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full timeline */}
      {sorted.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Full Timeline</p>
          <div className="space-y-2">
            {sorted.map((m, i) => {
              const Icon = ICONS[m.milestone_type] || Heart;
              return (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">{m.title}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">{m.milestone_date ? format(new Date(m.milestone_date), "MMM d, yyyy") : ""}</span>
                    </div>
                    {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                    {m.in_persons_words && <p className="text-xs italic text-violet-700 mt-1">"{m.in_persons_words}"</p>}
                    <Badge variant="outline" className="text-[10px] mt-1.5">{m.milestone_type}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sorted.length === 0 && masteredGoals.length === 0 && !isLoading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Star className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 text-sm">No milestones recorded yet.</p>
            <p className="text-xs text-slate-400 mt-1">The care team will record milestones as they happen. Check back soon.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}