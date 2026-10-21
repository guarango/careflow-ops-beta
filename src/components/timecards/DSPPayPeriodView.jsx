import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronDown, ChevronUp, AlertCircle, Edit3 } from "lucide-react";
import { computeOvertimeMap, generatePayPeriods, filterByPeriod } from "@/lib/overtimeUtils";
import CorrectionRequestDialog from "./CorrectionRequestDialog";

function fmt(h) {
  if (!h && h !== 0) return "—";
  return `${Math.round(h * 100) / 100}h`;
}

export default function DSPPayPeriodView({ timecards = [], staffName }) {
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const [correctionTarget, setCorrectionTarget] = useState(null);

  const otMap = useMemo(() => computeOvertimeMap(timecards), [timecards]);

  const periods = useMemo(() => generatePayPeriods("semi-monthly"), []);

  const periodData = useMemo(() => {
    return periods.map(period => {
      const tcs = filterByPeriod(timecards, period.start, period.end);
      const totalHours = tcs.reduce((s, t) => s + (t.total_hours || 0), 0);
      const otHours = tcs.reduce((s, t) => {
        const ot = otMap[t.id];
        return s + (ot?.tcOT || 0);
      }, 0);
      const pending = tcs.filter(t => t.status === "Pending").length;
      const approved = tcs.filter(t => t.status === "Approved").length;
      const correctionsPending = tcs.filter(t => t.correction_status === "pending").length;
      return { period, tcs, totalHours, otHours, pending, approved, correctionsPending };
    }).filter(p => p.tcs.length > 0);
  }, [timecards, otMap, periods]);

  if (periodData.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No timecard entries yet</p>
          <p className="text-sm mt-1">Your clocked hours will appear here grouped by pay period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {periodData.map(({ period, tcs, totalHours, otHours, pending, approved, correctionsPending }) => {
        const isExpanded = expandedPeriod === period.start;
        return (
          <Card key={period.start} className="overflow-hidden">
            <button
              onClick={() => setExpandedPeriod(isExpanded ? null : period.start)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <div className="font-semibold text-sm">{period.label}</div>
                  <div className="text-xs text-muted-foreground">{tcs.length} entries · {approved} approved · {pending} pending</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {correctionsPending > 0 && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" /> {correctionsPending} correction{correctionsPending !== 1 ? "s" : ""}
                  </Badge>
                )}
                {otHours > 0 && (
                  <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
                    {fmt(otHours)} OT
                  </Badge>
                )}
                <div className="text-right">
                  <div className="text-lg font-bold">{fmt(totalHours)}</div>
                  <div className="text-xs text-muted-foreground">total</div>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border">
                {tcs.sort((a, b) => b.date.localeCompare(a.date)).map(tc => {
                  const otInfo = otMap[tc.id];
                  const hasCorrection = tc.correction_status === "pending";
                  const correctionReturned = tc.correction_status === "returned";
                  return (
                    <div key={tc.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium w-20">{tc.date}</div>
                        <div className="text-sm text-muted-foreground">
                          {tc.clock_in} — {tc.clock_out || "—"}
                        </div>
                        <div className="font-semibold text-sm">{tc.total_hours ? `${tc.total_hours}h` : "—"}</div>
                        {otInfo?.isOT && (
                          <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0 h-4">OT</Badge>
                        )}
                        {tc.service_code && (
                          <Badge variant="outline" className="text-xs">{tc.service_code}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {hasCorrection && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Correction Pending</Badge>
                        )}
                        {correctionReturned && (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Correction Returned</Badge>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          tc.status === "Approved" ? "bg-accent/10 text-accent"
                          : tc.status === "Rejected" ? "bg-destructive/10 text-destructive"
                          : "bg-amber-500/10 text-amber-600"
                        }`}>{tc.status}</span>
                        {tc.locked ? (
                          <span className="text-xs text-muted-foreground">Locked</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setCorrectionTarget(tc)}
                            disabled={hasCorrection}
                          >
                            <Edit3 className="w-3 h-3" /> Request Correction
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      {correctionTarget && (
        <CorrectionRequestDialog
          timecard={correctionTarget}
          onClose={() => setCorrectionTarget(null)}
        />
      )}
    </div>
  );
}