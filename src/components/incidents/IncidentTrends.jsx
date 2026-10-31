import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays } from "date-fns";

export default function IncidentTrends({ incidents }) {
  const [from, setFrom] = useState(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const filtered = useMemo(() => {
    return (incidents || []).filter(i => {
      if (!i.date) return false;
      return i.date >= from && i.date <= to;
    });
  }, [incidents, from, to]);

  const byClient = useMemo(() => {
    const map = {};
    filtered.forEach(i => { const n = i.client_name || "Unknown"; map[n] = (map[n] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filtered]);

  const byHouse = useMemo(() => {
    const map = {};
    filtered.forEach(i => { const n = i.house_name || "Unassigned"; map[n] = (map[n] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map = {};
    filtered.forEach(i => { const n = i.type || "Other"; map[n] = (map[n] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  const byTimeOfDay = useMemo(() => {
    const buckets = [
      { name: "12am-6am", count: 0 },
      { name: "6am-12pm", count: 0 },
      { name: "12pm-6pm", count: 0 },
      { name: "6pm-12am", count: 0 },
    ];
    filtered.forEach(i => {
      const time = i.time || "00:00";
      const h = parseInt(time.split(":")[0]) || 0;
      if (h < 6) buckets[0].count++;
      else if (h < 12) buckets[1].count++;
      else if (h < 18) buckets[2].count++;
      else buckets[3].count++;
    });
    return buckets;
  }, [filtered]);

  const charts = [
    { title: "By Client", data: byClient },
    { title: "By House", data: byHouse },
    { title: "By Category", data: byCategory },
    { title: "By Time of Day", data: byTimeOfDay },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-sm" /></div>
          <span className="text-sm text-muted-foreground">{filtered.length} incident{filtered.length !== 1 ? "s" : ""} · {from} to {to}</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {charts.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-semibold mb-2">{c.title}</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={c.data} margin={{ top: 5, right: 10, left: -15, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" fill="#0b81b7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}