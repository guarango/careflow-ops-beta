import React, { useContext, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PortalContext } from "@/pages/Portal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Target, FileText, MessageSquare, Smile, Sun, Sunset, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";

const MOODS = [
  { score: 1, emoji: "😢", label: "Very Sad", color: "bg-red-100 border-red-300 text-red-700" },
  { score: 2, emoji: "😕", label: "Sad", color: "bg-orange-100 border-orange-300 text-orange-700" },
  { score: 3, emoji: "😐", label: "Okay", color: "bg-amber-100 border-amber-300 text-amber-700" },
  { score: 4, emoji: "😊", label: "Happy", color: "bg-lime-100 border-lime-300 text-lime-700" },
  { score: 5, emoji: "😄", label: "Very Happy", color: "bg-emerald-100 border-emerald-300 text-emerald-700" },
];

const todayStr = new Date().toISOString().split("T")[0];
const hour = new Date().getHours();
const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
const GreetIcon = hour < 12 ? Sun : hour < 17 ? Sun : Moon;

export default function PortalClientView() {
  const { portalUser } = useContext(PortalContext);
  const [selectedMood, setSelectedMood] = useState(null);
  const [moodSubmitted, setMoodSubmitted] = useState(false);
  const [textSize, setTextSize] = useState("normal");
  const [highContrast, setHighContrast] = useState(false);
  const queryClient = useQueryClient();

  const { data: schedules = [] } = useQuery({
    queryKey: ["portal-client-schedules", portalUser?.client_id],
    queryFn: () => base44.entities.ShiftSchedule.filter({ client_id: portalUser?.client_id }),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["portal-client-goals", portalUser?.client_id],
    queryFn: () => base44.entities.ClientGoal.filter({ client_id: portalUser?.client_id }),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["portal-client-notes", portalUser?.client_id],
    queryFn: () => base44.entities.SessionNote.filter({ client_id: portalUser?.client_id }),
  });

  const submitMood = useMutation({
    mutationFn: (data) => base44.entities.MoodCheckin.create(data),
    onSuccess: () => {
      setMoodSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["mood-checkins"] });
    },
  });

  const handleMoodSubmit = () => {
    if (!selectedMood) return;
    submitMood.mutate({
      client_id: portalUser?.client_id,
      client_name: portalUser?.client_name,
      portal_user_id: portalUser?.id,
      mood_score: selectedMood.score,
      mood_label: selectedMood.label,
      checked_in_at: new Date().toISOString(),
      viewed_by_staff: false,
    });
  };

  const upcoming = schedules.filter(s => s.date >= todayStr && s.status !== "Cancelled").slice(0, 3);
  const activeGoals = goals.filter(g => g.status === "Active" || g.status === "In Progress");

  const textClass = textSize === "large" ? "text-lg" : textSize === "xl" ? "text-xl" : "text-base";
  const containerClass = highContrast
    ? "min-h-screen bg-black text-white"
    : "min-h-screen";

  return (
    <div className={containerClass}>
      {/* Accessibility Bar */}
      <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 flex-wrap ${highContrast ? "bg-gray-900 border border-gray-600" : "bg-slate-100"}`}>
        <span className={`text-xs font-medium ${highContrast ? "text-white" : "text-slate-600"}`}>Accessibility:</span>
        <div className="flex gap-2">
          {["normal", "large", "xl"].map(size => (
            <button key={size} onClick={() => setTextSize(size)}
              className={`px-2 py-1 rounded text-xs border transition-colors ${textSize === size ? "bg-sky-600 text-white border-sky-600" : highContrast ? "border-gray-500 text-white" : "border-slate-300 text-slate-600 hover:bg-slate-200"}`}>
              {size === "normal" ? "A" : size === "large" ? "A+" : "A++"}
            </button>
          ))}
        </div>
        <button onClick={() => setHighContrast(!highContrast)}
          className={`px-2 py-1 rounded text-xs border transition-colors ${highContrast ? "bg-white text-black border-white" : "border-slate-300 text-slate-600 hover:bg-slate-200"}`}>
          {highContrast ? "☀ Normal" : "◐ High Contrast"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Welcome */}
        <div className={`rounded-2xl p-6 ${highContrast ? "bg-gray-900 border border-gray-600" : "bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-100"}`}>
          <div className="flex items-center gap-3 mb-2">
            <GreetIcon className={`w-8 h-8 ${highContrast ? "text-yellow-400" : "text-amber-500"}`} />
            <h1 className={`font-bold ${highContrast ? "text-white" : "text-slate-800"} ${textSize === "xl" ? "text-3xl" : textSize === "large" ? "text-2xl" : "text-xl"}`}>
              {greeting}, {portalUser?.full_name?.split(" ")[0]}!
            </h1>
          </div>
          <p className={`${textClass} ${highContrast ? "text-gray-300" : "text-slate-500"}`}>
            {format(new Date(), "EEEE, MMMM d")} · Here's what's happening today
          </p>
        </div>

        {/* Mood Check-in */}
        <Card className={`border-0 shadow-sm ${highContrast ? "bg-gray-900 border border-gray-600" : ""}`}>
          <CardContent className="py-5">
            <h2 className={`font-bold mb-1 ${highContrast ? "text-white" : "text-slate-800"} ${textSize === "xl" ? "text-2xl" : textSize === "large" ? "text-xl" : "text-lg"}`}>
              How are you feeling today?
            </h2>
            <p className={`mb-4 ${textClass} ${highContrast ? "text-gray-400" : "text-slate-500"}`}>
              Tap an emoji to let your support team know
            </p>
            {moodSubmitted ? (
              <div className="text-center py-4">
                <p className="text-4xl mb-2">{selectedMood?.emoji}</p>
                <p className={`font-semibold ${highContrast ? "text-white" : "text-slate-800"} ${textClass}`}>
                  Thanks for sharing! Your team has been notified.
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between gap-2 mb-4">
                  {MOODS.map(mood => (
                    <button key={mood.score} onClick={() => setSelectedMood(mood)}
                      className={`flex-1 py-3 rounded-xl border-2 text-center transition-all ${selectedMood?.score === mood.score ? mood.color + " border-current scale-105 shadow-md" : highContrast ? "border-gray-600 hover:border-gray-400 bg-gray-800" : "border-transparent hover:border-slate-200 bg-slate-50"}`}>
                      <div className="text-3xl mb-1">{mood.emoji}</div>
                      <div className={`text-xs font-medium ${highContrast ? "text-gray-300" : "text-slate-600"}`}>{mood.label}</div>
                    </button>
                  ))}
                </div>
                <Button onClick={handleMoodSubmit} disabled={!selectedMood}
                  className="w-full bg-sky-600 hover:bg-sky-700 py-3 text-base">
                  Share How I'm Feeling
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* My Schedule */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`font-bold flex items-center gap-2 ${highContrast ? "text-white" : "text-slate-800"} ${textSize === "xl" ? "text-2xl" : textSize === "large" ? "text-xl" : "text-lg"}`}>
              <Calendar className={`w-5 h-5 ${highContrast ? "text-sky-400" : "text-sky-500"}`} />
              My Upcoming Visits
            </h2>
            <Link to="/portal/schedule" className="text-sm text-sky-600 hover:underline">See all</Link>
          </div>
          {upcoming.length === 0 ? (
            <Card className={`border-0 shadow-sm ${highContrast ? "bg-gray-900 border border-gray-600" : ""}`}>
              <CardContent className="py-8 text-center">
                <Calendar className={`w-10 h-10 mx-auto mb-3 ${highContrast ? "text-gray-600" : "text-slate-300"}`} />
                <p className={`${textClass} ${highContrast ? "text-gray-400" : "text-slate-500"}`}>No upcoming visits right now</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcoming.map(s => (
                <Card key={s.id} className={`border-0 shadow-sm ${highContrast ? "bg-gray-900 border border-gray-600" : ""}`}>
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${highContrast ? "bg-sky-900" : "bg-sky-50"}`}>
                      <span className={`text-xl font-bold ${highContrast ? "text-sky-300" : "text-sky-700"}`}>{format(parseISO(s.date), "d")}</span>
                      <span className={`text-xs ${highContrast ? "text-sky-400" : "text-sky-500"}`}>{format(parseISO(s.date), "MMM")}</span>
                    </div>
                    <div>
                      <p className={`font-semibold ${highContrast ? "text-white" : "text-slate-800"} ${textClass}`}>{s.service_type}</p>
                      <p className={`${highContrast ? "text-gray-400" : "text-slate-500"} ${textSize === "xl" ? "text-base" : "text-sm"}`}>
                        {s.start_time} with {s.staff_name || "your support staff"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* My Goals */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`font-bold flex items-center gap-2 ${highContrast ? "text-white" : "text-slate-800"} ${textSize === "xl" ? "text-2xl" : textSize === "large" ? "text-xl" : "text-lg"}`}>
              <Target className={`w-5 h-5 ${highContrast ? "text-emerald-400" : "text-emerald-500"}`} />
              My Goals
            </h2>
            <Link to="/portal/goals" className="text-sm text-sky-600 hover:underline">See all</Link>
          </div>
          <div className="space-y-3">
            {activeGoals.slice(0, 3).map(g => {
              const pct = g.progress_percentage || 0;
              return (
                <Card key={g.id} className={`border-0 shadow-sm ${highContrast ? "bg-gray-900 border border-gray-600" : ""}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className={`font-semibold ${highContrast ? "text-white" : "text-slate-800"} ${textClass}`}>
                        {g.goal_title || g.title}
                      </p>
                      <span className={`font-bold text-sky-600 ${textClass}`}>{pct}%</span>
                    </div>
                    <div className={`w-full h-4 rounded-full overflow-hidden ${highContrast ? "bg-gray-700" : "bg-slate-100"}`}>
                      <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Message Team */}
        <Card className={`border-0 shadow-sm ${highContrast ? "bg-gray-900 border border-gray-600" : "bg-gradient-to-r from-sky-50 to-indigo-50"}`}>
          <CardContent className="py-5 flex items-center justify-between gap-4">
            <div>
              <h3 className={`font-bold ${highContrast ? "text-white" : "text-slate-800"} ${textClass}`}>
                Need Something?
              </h3>
              <p className={`text-sm ${highContrast ? "text-gray-400" : "text-slate-500"}`}>Send a message to your support team</p>
            </div>
            <Link to="/portal/messages">
              <Button className="bg-sky-600 hover:bg-sky-700 gap-2 px-5 py-3">
                <MessageSquare className="w-4 h-4" />
                <span className={textClass}>Message Team</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}