import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Lock, MailQuestion } from "lucide-react";
import RequestChangeDialog from "./RequestChangeDialog";
import StatusBadge from "@/components/shared/StatusBadge";
import { ACCESS_LABELS } from "@/lib/staffFilters";

function Row({ label, children, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-right">{children || "—"}</span>
        {action}
      </div>
    </div>
  );
}

function dateLabel(value) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

/** The background check shown to the person as a plain status only. */
export function backgroundCheckLabel(staff) {
  const raw = staff?.background_check_status;
  if (raw === "Cleared") return "Cleared";
  if (raw === "Expired") return "Expired";
  return "Pending";
}

export default function ProfileReadOnlyCard({ staff }) {
  const [requestField, setRequestField] = useState(null);
  const access = ACCESS_LABELS[staff?.app_access || "dsp"] || "DSP";
  const bundles = [
    staff?.hr_bundle && "HR",
    staff?.billing_bundle && "Billing",
  ].filter(Boolean);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            Managed by your agency
          </CardTitle>
          <CardDescription>These come from your agency. Ask HR to change the name or date of birth.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Row
            label="Legal name"
            action={
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRequestField("legal_name")}>
                <MailQuestion className="w-3.5 h-3.5 mr-1" />Request a change
              </Button>
            }
          >
            {`${staff?.first_name || ""} ${staff?.last_name || ""}`.trim()}
          </Row>
          <Row
            label="Date of birth"
            action={
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRequestField("date_of_birth")}>
                <MailQuestion className="w-3.5 h-3.5 mr-1" />Request a change
              </Button>
            }
          >
            {dateLabel(staff?.date_of_birth)}
          </Row>
          <Row label="Email (your login)">{staff?.email}</Row>
          <Row label="Job title">{staff?.role}</Row>
          <Row label="App access">
            <span className="inline-flex items-center gap-1.5">
              <Badge variant="outline" className="text-[11px]">{access}</Badge>
              {bundles.map((b) => (
                <Badge key={b} variant="outline" className="text-[11px]">+{b}</Badge>
              ))}
            </span>
          </Row>
          <Row label="Status">
            <StatusBadge status={staff?.status || "Pending"} />
          </Row>
          <Row label="Hire date">{dateLabel(staff?.hire_date)}</Row>
          <Row label="Background check">
            <Badge
              variant="outline"
              className={
                backgroundCheckLabel(staff) === "Cleared"
                  ? "border-accent/30 bg-accent/10 text-accent"
                  : backgroundCheckLabel(staff) === "Expired"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-chart-4/30 bg-chart-4/10 text-chart-4"
              }
            >
              {backgroundCheckLabel(staff)}
            </Badge>
          </Row>
        </CardContent>
      </Card>

      {requestField && (
        <RequestChangeDialog
          field={requestField}
          open
          onClose={() => setRequestField(null)}
        />
      )}
    </>
  );
}