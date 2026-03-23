import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Award, Clock, BookOpen, ArrowRight } from "lucide-react";

function StatCard({ label, value, sub, subColor = "text-muted-foreground", icon: Icon, iconColor = "text-primary" }) {
  return (
    <div className="bg-muted/50 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
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

const CERT_EXPIRATIONS = [
  { name: "Maria Johnson", cert: "CPR Certification", date: "Apr 15", color: "amber" },
  { name: "James Williams", cert: "Medication Admin Training", date: "Dec 1", color: "green" },
  { name: "Dana Reyes", cert: "First Aid", date: "Apr 2", color: "amber" },
  { name: "Tom Briggs", cert: "Abuse prevention", date: "Overdue", color: "red" },
];

const TIMECARDS = [
  { name: "James Williams", date: "Mar 20", hours: "6.5 hrs" },
  { name: "Maria Johnson", date: "Mar 20", hours: "4 hrs" },
  { name: "Dana Reyes", date: "Mar 21", hours: "8 hrs" },
  { name: "Tom Briggs", date: "Mar 21", hours: "5 hrs" },
];

const TRAINING = [
  { initials: "JW", bg: "bg-blue-500", name: "James Williams", action: "Completed", training: "Medication Admin", date: "Mar 18", badgeColor: "green", badge: "Done" },
  { initials: "MJ", bg: "bg-purple-500", name: "Maria Johnson", action: "In progress", training: "Abuse Prevention", date: "", badgeColor: "amber", badge: "50%" },
  { initials: "TB", bg: "bg-red-400", name: "Tom Briggs", action: "Not started", training: "Annual safety review", date: "", badgeColor: "red", badge: "Overdue" },
];

export default function HRDashboard({ user }) {
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">{today} · <span className="text-amber-600 font-medium">4 staff items need attention</span></p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total staff" value={18} sub="15 active, 3 on leave" icon={Users} />
        <StatCard label="Expiring certs" value={4} sub="Next 30 days" subColor="text-amber-600" iconColor="text-amber-500" icon={Award} />
        <StatCard label="Timecards to approve" value={7} sub="Oldest: 3 days ago" subColor="text-destructive" iconColor="text-destructive" icon={Clock} />
        <StatCard label="Training due" value={3} sub="This month" subColor="text-amber-600" iconColor="text-amber-500" icon={BookOpen} />
      </div>

      {/* Cert expirations + Timecards */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Certification expirations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CERT_EXPIRATIONS.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.cert}</p>
                </div>
                <Pill color={c.color} label={c.date} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Timecards awaiting approval</CardTitle>
            <Link to="/timecards"><Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">View all <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {TIMECARDS.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.date} · {t.hours}</p>
                </div>
                <Link to="/timecards">
                  <Button variant="outline" size="sm" className="h-7 text-xs">Review</Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Training completions + Staff at a glance */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Training completions this month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {TRAINING.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${t.bg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{t.initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.action}: {t.training}{t.date ? ` · ${t.date}` : ""}</p>
                </div>
                <Pill color={t.badgeColor} label={t.badge} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Staff at a glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "On shift today", value: "11" },
              { label: "On approved leave", value: "3" },
              { label: "New hires this month", value: "1" },
              { label: "Background checks current", value: "17 / 18" },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="text-sm font-bold text-foreground">{row.value}</span>
              </div>
            ))}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Background check compliance</span>
                <span className="text-xs font-semibold text-green-600">94%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: "94%" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}