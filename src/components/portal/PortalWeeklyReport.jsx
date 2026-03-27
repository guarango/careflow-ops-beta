import React, { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PortalContext } from "@/pages/Portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, MapPin, Target, Camera, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

function ReportCard({ report, clientFirstName }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <button
        className="w-full text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <CardHeader className="pb-3 hover:bg-slate-50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-sky-600" />
                </div>
                <CardTitle className="text-sm font-semibold">
                  Week of {format(parseISO(report.report_week_start), "MMMM d")} – {format(parseISO(report.report_week_end), "MMMM d, yyyy")}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 ml-9">
                <Badge className={cn("text-xs", report.status === "Sent" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                  {report.status}
                </Badge>
                {report.sent_at && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Sent {format(new Date(report.sent_at), "MMM d")}
                  </span>
                )}
              </div>
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="pt-0 space-y-5">
          {/* Report body — plain language letter */}
          {report.report_body && (
            <div className="bg-slate-50 rounded-xl p-4 border-l-4 border-sky-300">
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{report.report_body}</p>
            </div>
          )}

          {/* Highlights */}
          {report.highlights?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500" />Week's Highlights
              </p>
              <div className="space-y-2">
                {report.highlights.map((h, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-xs text-amber-700 font-medium mb-1">{h.date} · {h.staff_name}</p>
                    <p className="text-sm text-slate-700">{h.highlight}</p>
                    {h.choices_made && (
                      <p className="text-xs text-emerald-700 mt-1.5 italic">Choice made: {h.choices_made}</p>
                    )}
                    {h.memorable_quote && (
                      <p className="text-xs text-violet-700 mt-1.5 italic">"{h.memorable_quote}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goal progress — plain language only */}
          {report.goal_progress_narrative && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-500" />Progress This Week
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{report.goal_progress_narrative}</p>
            </div>
          )}

          {/* Community */}
          {report.community_activities_narrative && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />Out in the Community
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{report.community_activities_narrative}</p>
            </div>
          )}

          {/* Photos */}
          {report.photo_urls?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-violet-500" />Photos
              </p>
              <div className="flex flex-wrap gap-2">
                {report.photo_urls.map((url, i) => (
                  <img key={i} src={url} alt="Memory" className="w-24 h-24 object-cover rounded-xl border border-slate-200" />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {report.upcoming_preview && (
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-sky-700 mb-1">Looking ahead…</p>
              <p className="text-sm text-slate-700">{report.upcoming_preview}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function PortalWeeklyReport() {
  const { portalUser } = useContext(PortalContext);
  const clientId = portalUser?.client_id;
  const firstName = portalUser?.client_name?.split(" ")[0] || "them";

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["family-reports", clientId, portalUser?.id],
    queryFn: () => base44.entities.FamilyHighlightReport.filter({ client_id: clientId, status: "Sent" }),
  });

  const sorted = [...reports].sort((a, b) =>
    new Date(b.report_week_start) - new Date(a.report_week_start)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Weekly Updates</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          A weekly summary of {firstName}'s highlights, progress, and moments — written in plain language, not clinical terms.
        </p>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-sky-800">
        <strong>About these reports:</strong> These are written to feel like a letter from someone who knows and cares about {firstName}. You won't find clinical scores or percentages here — just what {firstName} did, said, tried, and experienced this week.
      </div>

      {isLoading && (
        <div className="text-center py-12 text-slate-400">Loading reports…</div>
      )}

      {!isLoading && sorted.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Heart className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 text-sm">No weekly reports yet.</p>
            <p className="text-slate-400 text-xs mt-1">Reports are generated automatically every week and will appear here once they're sent.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {sorted.map(r => (
          <ReportCard key={r.id} report={r} clientFirstName={firstName} />
        ))}
      </div>
    </div>
  );
}