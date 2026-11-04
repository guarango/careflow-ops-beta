import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays } from "lucide-react";

function statusFor(shift) {
  if (!shift.staff_id) return { label: "No staff", color: "amber" };
  if (shift.evv_clock_in && !shift.evv_clock_out) return { label: "Active", color: "green" };
  if (shift.evv_clock_out || shift.status === "Completed") return { label: "Completed", color: "gray" };
  return { label: "Scheduled", color: "blue" };
}

const PILL = {
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  gray: "bg-gray-100 text-gray-600",
};

export default function TodayVisitsCard({ shifts }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Today's visits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {shifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
            <CalendarDays className="w-5 h-5" />
            <p className="text-sm">No visits scheduled today.</p>
            <Link to="/schedule">
              <Button variant="ghost" size="sm" className="text-xs text-primary h-7">
                Open schedule <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        ) : (
          shifts.map((v) => {
            const st = statusFor(v);
            return (
              <div key={v.id} className="flex items-center gap-2 py-2 min-h-[44px] border-b border-border last:border-0">
                <span className="text-xs font-mono text-muted-foreground w-14 flex-shrink-0 truncate">{v.start_time || "—"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.client_name || "Client"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {v.staff_name || "Unassigned"}{v.service_type ? ` · ${v.service_type}` : ""}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${PILL[st.color]}`}>
                  {st.label}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}