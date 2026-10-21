import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, CalendarClock } from "lucide-react";
import { differenceInDays, parseISO, isValid } from "date-fns";

export default function UnitTrackingTab() {
  const { can } = useRole();
  const canSeeRates = can("accessBilling");
  const [search, setSearch] = useState("");

  const { data: auths = [] } = useQuery({ queryKey: ["authorizations"], queryFn: () => base44.entities.Authorization.list("-created_date") });

  const filtered = auths.filter(a => `${a.client_name} ${a.service_code}`.toLowerCase().includes(search.toLowerCase()));

  const today = new Date();
  const approaching = auths.filter(a => {
    if (a.status !== "Approved") return false;
    const pct = a.authorized_units > 0 ? (a.used_units || 0) / a.authorized_units * 100 : 0;
    return pct >= 75;
  });
  const expiring = auths.filter(a => {
    if (a.status !== "Approved" || !a.end_date) return false;
    const d = parseISO(a.end_date);
    if (!isValid(d)) return false;
    const days = differenceInDays(d, today);
    return days >= 0 && days <= 30;
  });

  return (
    <div className="space-y-4">
      {(approaching.length > 0 || expiring.length > 0) && (
        <div className="space-y-2">
          {expiring.map(a => {
            const d = parseISO(a.end_date);
            const days = differenceInDays(d, today);
            return (
              <div key={`exp-${a.id}`} className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm">
                <CalendarClock className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <span className="font-semibold text-orange-700">Expiring Soon:</span>
                <span className="text-orange-600">{a.client_name} — {a.service_code} — expires in {days} day{days !== 1 ? "s" : ""}</span>
              </div>
            );
          })}
          {approaching.map(a => {
            const pct = a.authorized_units > 0 ? Math.round((a.used_units || 0) / a.authorized_units * 100) : 0;
            return (
              <div key={`app-${a.id}`} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="font-semibold text-amber-700">{pct >= 90 ? "90% Utilization:" : "75% Utilization:"}</span>
                <span className="text-amber-600">{a.client_name} — {a.service_code} — {pct}% used ({a.used_units || 0}/{a.authorized_units} {a.unit_type})</span>
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="Search by client or service code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-md border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Client</th>
                  <th className="text-left px-4 py-3 font-medium">Service Code</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Period</th>
                  <th className="text-right px-4 py-3 font-medium">Used / Authorized</th>
                  <th className="text-left px-4 py-3 font-medium w-40">Utilization</th>
                  {canSeeRates && <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Rate</th>}
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={canSeeRates ? 7 : 6} className="text-center py-10 text-muted-foreground">No authorizations found.</td></tr>}
                {filtered.map(a => {
                  const pct = a.authorized_units > 0 ? Math.round((a.used_units || 0) / a.authorized_units * 100) : 0;
                  const remaining = a.remaining_units ?? (a.authorized_units - (a.used_units || 0));
                  return (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{a.client_name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{a.service_code}</td>
                      <td className="px-4 py-3 text-xs hidden md:table-cell">{a.start_date} – {a.end_date}</td>
                      <td className="px-4 py-3 text-right">{a.used_units || 0} / {a.authorized_units} {a.unit_type}<br /><span className="text-xs text-muted-foreground">{remaining} remaining</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className={`h-2 flex-1 ${pct >= 90 ? "[&>div]:bg-destructive" : pct >= 75 ? "[&>div]:bg-amber-500" : ""}`} />
                          <span className={`text-xs font-medium ${pct >= 90 ? "text-destructive" : pct >= 75 ? "text-amber-600" : "text-muted-foreground"}`}>{pct}%</span>
                        </div>
                      </td>
                      {canSeeRates && <td className="px-4 py-3 text-right hidden lg:table-cell text-muted-foreground">—</td>}
                      <td className="px-4 py-3 text-center"><Badge variant="outline" className="text-xs">{a.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!canSeeRates && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="w-3 h-3" /> Rate details require the Billing bundle.</p>
      )}
    </div>
  );
}