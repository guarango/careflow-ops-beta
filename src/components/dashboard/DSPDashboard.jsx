import React from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, FileText, Smartphone } from "lucide-react";

function StatCard({ label, value, sub, subColor = "text-muted-foreground", icon: Icon, iconColor = "text-primary" }) {
  return (
    <div className="bg-muted/50 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      <div className={`text-xs mt-1 ${subColor}`}>{sub}</div>
    </div>
  );
}

function Pill({ color, label }) {
  const colors = {
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color] || colors.gray}`}>
      {label}
    </span>
  );
}

const SCHEDULE = [
  { time: "8:00 AM", client: "Michael Anderson", service: "Personal care", duration: "3 hrs", address: "123 Oak St", status: "Up next", statusColor: "green" },
  { time: "2:00 PM", client: "Lisa Torres", service: "Day program support", duration: "2 hrs", address: "88 Elm Ave", status: "Later today", statusColor: "gray" },
];

const TODOS = [
  { color: "red", badge: "Overdue", title: "Complete visit note — Lisa Torres", sub: "Friday Mar 20 visit · Not submitted" },
  { color: "blue", badge: "Today", title: "Give meds — Michael Anderson", sub: "8:30 AM · Metformin 500mg" },
  { color: "blue", badge: "Today", title: "Log behavior note — Michael Anderson", sub: "After visit" },
];

const CLIENTS = [
  { initials: "MA", bg: "bg-blue-500", name: "Michael Anderson", days: "Mon · Wed · Fri" },
  { initials: "LT", bg: "bg-teal-500", name: "Lisa Torres", days: "Mon · Thu" },
  { initials: "DP", bg: "bg-purple-500", name: "David Park", days: "Tue · Fri" },
];

export default function DSPDashboard({ user }) {
  const firstName = user?.full_name?.split(" ")[0] || "there";
  const today = format(new Date(), "EEEE, MMMM d, yyyy");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5 max-w-2xl mx-auto lg:max-w-none">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{greeting}, {firstName}</h1>
        <p className="text-muted-foreground text-sm mt-1">{today} · You have 2 visits today</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Today's visits" value={2} sub="Next: 8:00 AM" icon={CalendarDays} />
        <StatCard label="Hours this week" value="18.5" sub="of 40 scheduled" icon={Clock} />
        <StatCard label="Notes due" value={1} sub="From Friday" subColor="text-amber-600" iconColor="text-amber-500" icon={FileText} />
      </div>

      {/* Mobile app banner */}
      <Card className="border border-blue-200 bg-blue-50/60">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Use the Mobile Field App</p>
            <p className="text-xs text-muted-foreground">Clock in/out, session notes, goal data & more — optimized for your phone</p>
          </div>
          <a href="/mobile" className="flex-shrink-0 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            Open
          </a>
        </CardContent>
      </Card>

      {/* Clock in card — primary action */}
      <Card className="border-2 border-green-200 bg-green-50/50">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Next visit</p>
            <p className="text-lg font-bold text-foreground">Michael Anderson</p>
            <p className="text-sm text-muted-foreground">Personal care · Starts 8:00 AM · 123 Oak Street</p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-6 h-auto text-base flex-shrink-0 rounded-xl shadow-md">
            Clock in<br />now
          </Button>
        </CardContent>
      </Card>

      {/* Schedule + To-do */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Today's schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {SCHEDULE.map((v, i) => (
              <div key={i} className="flex gap-3 py-2 border-b border-border last:border-0">
                <span className="text-xs font-mono text-muted-foreground w-14 flex-shrink-0 pt-0.5">{v.time}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{v.client}</p>
                  <p className="text-xs text-muted-foreground">{v.service} · {v.duration}</p>
                  <p className="text-xs text-muted-foreground">{v.address}</p>
                  <div className="mt-1.5"><Pill color={v.statusColor} label={v.status} /></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">To-do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {TODOS.map((t, i) => (
              <div key={i} className="flex gap-3 py-2 border-b border-border last:border-0">
                <div className="pt-0.5 flex-shrink-0"><Pill color={t.color} label={t.badge} /></div>
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.sub}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* My clients */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">My clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {CLIENTS.map((c, i) => (
              <div key={i} className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/40">
                <div className={`w-12 h-12 rounded-full ${c.bg} flex items-center justify-center text-white font-bold text-sm mb-2`}>{c.initials}</div>
                <p className="text-sm font-semibold leading-tight">{c.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.days}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}