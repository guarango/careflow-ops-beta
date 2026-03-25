import React, { useContext, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PortalContext } from "@/pages/Portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Target, TrendingUp, CheckCircle, AlertCircle, MessageSquare, ChevronDown, ChevronUp, User, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const statusConfig = {
  "Active": { color: "bg-sky-100 text-sky-700", label: "Active", icon: TrendingUp },
  "In Progress": { color: "bg-amber-100 text-amber-700", label: "In Progress", icon: TrendingUp },
  "Mastered": { color: "bg-emerald-100 text-emerald-700", label: "Mastered ✓", icon: CheckCircle },
  "Needs Attention": { color: "bg-red-100 text-red-700", label: "Needs Attention", icon: AlertCircle },
  "Discontinued": { color: "bg-slate-100 text-slate-500", label: "Discontinued", icon: AlertCircle },
};

const MOCK_DATAPOINTS = [
  { date: "Mar 1", score: 45 }, { date: "Mar 5", score: 52 }, { date: "Mar 10", score: 58 },
  { date: "Mar 15", score: 63 }, { date: "Mar 20", score: 71 }, { date: "Mar 25", score: 75 },
];

function GoalCard({ goal, portalUser }) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [commentSubmitted, setCommentSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ["goal-comments", goal.id],
    queryFn: () => base44.entities.GoalComment.filter({ goal_id: goal.id }),
  });

  const createComment = useMutation({
    mutationFn: (data) => base44.entities.GoalComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal-comments", goal.id] });
      setComment("");
      setCommentSubmitted(true);
      setTimeout(() => setCommentSubmitted(false), 3000);
    },
  });

  const pct = goal.progress_percentage || 0;
  const cfg = statusConfig[goal.status] || statusConfig["Active"];
  const barColor = pct >= 80 ? "#10b981" : pct >= 50 ? "#0ea5e9" : "#f59e0b";

  const handleComment = () => {
    if (!comment.trim()) return;
    createComment.mutate({
      goal_id: goal.id, client_id: goal.client_id, client_name: goal.client_name,
      author_name: portalUser?.full_name, author_type: portalUser?.portal_role,
      comment: comment.trim(), posted_at: new Date().toISOString(),
      visible_to_staff: true, visible_to_portal: true,
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800">{goal.goal_title || goal.title}</p>
              <Badge className={cfg.color}>{cfg.label}</Badge>
            </div>
            {goal.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{goal.description}</p>}
            {goal.target_behavior && <p className="text-xs text-slate-400 mt-0.5">Target: {goal.target_behavior}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold" style={{ color: barColor }}>{pct}%</p>
            <p className="text-xs text-slate-400">Progress</p>
          </div>
        </div>

        <div className="mt-3 w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>

        <button onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Hide" : "Show"} progress chart & comments
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Progress Over Time</p>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={MOCK_DATAPOINTS}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip formatter={(v) => [`${v}%`, "Progress"]} />
                  <Line type="monotone" dataKey="score" stroke={barColor} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />Comments ({comments.length})
              </p>
              {comments.map(c => (
                <div key={c.id} className="bg-slate-50 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-slate-700">{c.author_name}</span>
                    <Badge className="bg-slate-100 text-slate-500 text-xs px-1">{c.author_type}</Badge>
                    <span className="text-xs text-slate-400 ml-auto">{c.posted_at ? new Date(c.posted_at).toLocaleDateString() : ""}</span>
                  </div>
                  <p className="text-xs text-slate-600">{c.comment}</p>
                </div>
              ))}

              {portalUser?.portal_role !== "Case Manager" && (
                <div className="mt-2">
                  {commentSubmitted ? (
                    <div className="flex items-center gap-2 text-emerald-600 text-sm"><CheckCircle className="w-4 h-4" />Comment submitted!</div>
                  ) : (
                    <div className="flex gap-2">
                      <Textarea value={comment} onChange={e => setComment(e.target.value)}
                        placeholder="Leave a comment for the care team..." rows={2} className="text-sm" />
                      <Button onClick={handleComment} size="sm" disabled={!comment.trim() || createComment.isPending} className="self-end">Post</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PortalGoals() {
  const { portalUser } = useContext(PortalContext);
  const [filter, setFilter] = useState("active");

  const { data: goals = [] } = useQuery({
    queryKey: ["portal-goals", portalUser?.client_id],
    queryFn: () => base44.entities.ClientGoal.filter({ client_id: portalUser?.client_id }),
  });

  const filtered = filter === "all" ? goals :
    filter === "active" ? goals.filter(g => g.status === "Active" || g.status === "In Progress") :
    goals.filter(g => g.status === "Mastered");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Goal Progress</h2>
          <p className="text-sm text-slate-500">ISP goals and progress tracking for {portalUser?.client_name}</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          {["active", "mastered", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${filter === f ? "bg-white shadow text-slate-800 font-medium" : "text-slate-500"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Target className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 text-sm">No {filter} goals on file</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(goal => <GoalCard key={goal.id} goal={goal} portalUser={portalUser} />)}
        </div>
      )}
    </div>
  );
}