import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, AlertTriangle, Pencil, MapPin, Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import RatioGauge from "./RatioGauge";

export default function DayProgramSessionCard({ session, check, onEdit }) {
  const clients = session.client_names?.length ? session.client_names : session.client_ids || [];
  const staff = session.staff_names?.length ? session.staff_names : session.staff_ids || [];

  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 border-l-4",
      check.over ? "border-l-red-400" : "border-l-emerald-400"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug flex items-center gap-1.5 flex-wrap">
              {session.service_code || "DSG"}
              <Badge variant="outline" className={cn("text-[9px] border", session.setting === "Community" ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-slate-50 text-slate-600 border-slate-200")}>
                {session.setting || "Site-based"}
              </Badge>
              {session.status && <Badge variant="outline" className="text-[9px]">{session.status}</Badge>}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {session.start_time || "?"}–{session.end_time || "?"}
              {session.site_name && (
                <span className="flex items-center gap-0.5 ml-1">
                  <MapPin className="w-3 h-3" />{session.site_name}
                </span>
              )}
            </p>
          </div>
        </div>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 shrink-0" onClick={() => onEdit(session)}>
          <Pencil className="w-3 h-3" />Edit
        </Button>
      </div>

      <div className="mt-3">
        <RatioGauge check={check} />
      </div>

      {check.over && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 space-y-0.5">
          {check.warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-red-700 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{w}
            </p>
          ))}
        </div>
      )}

      {session.ratio_override_reason && (
        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <p className="text-[11px] text-amber-800 flex items-start gap-1">
            <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0" />
            Manager override — {session.ratio_override_reason}
            {session.ratio_override_by ? ` (${session.ratio_override_by})` : ""}
          </p>
        </div>
      )}

      <div className="mt-3 grid gap-2 text-[11px]">
        <div>
          <p className="text-muted-foreground font-semibold uppercase tracking-wide text-[10px] mb-1">Staff on duty ({staff.length})</p>
          <div className="flex flex-wrap gap-1">
            {staff.length === 0 && <span className="text-muted-foreground">None recorded</span>}
            {staff.map((name, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800">{name}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-muted-foreground font-semibold uppercase tracking-wide text-[10px] mb-1">Persons present ({clients.length})</p>
          <div className="flex flex-wrap gap-1">
            {clients.length === 0 && <span className="text-muted-foreground">None recorded</span>}
            {clients.map((name, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-muted border border-border text-foreground">{name}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}