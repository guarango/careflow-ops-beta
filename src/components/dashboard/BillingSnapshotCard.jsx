import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const money = (n) => `$${Math.round(n || 0).toLocaleString("en-US")}`;

const PENDING_STATUSES = ["Draft", "Validation Failed", "Ready", "Submitted", "Pending"];
const PAID_STATUSES = ["Paid", "Adjusted"];

/**
 * Live billing roll-up for the current month.
 * Claims are primary; billing records are used only when no claims exist yet,
 * so the snapshot always matches what the Finance page holds.
 */
export default function BillingSnapshotCard({ monthLabel, monthStart, claims = [], billingRecords = [], pendingTimecards }) {
  const monthClaims = claims.filter((c) => (c.service_date || "").slice(0, 7) === monthStart.slice(0, 7));
  const monthRecords = billingRecords.filter((r) => (r.date || "").slice(0, 7) === monthStart.slice(0, 7));
  const usingClaims = monthClaims.length > 0;

  const source = usingClaims ? monthClaims : monthRecords;
  const billed = usingClaims
    ? monthClaims.reduce((s, c) => s + (c.amount_billed || 0), 0)
    : monthRecords.reduce((s, r) => s + (r.total_amount || 0), 0);
  const pending = usingClaims
    ? monthClaims.filter((c) => PENDING_STATUSES.includes(c.status)).reduce((s, c) => s + (c.amount_billed || 0), 0)
    : monthRecords.filter((r) => PENDING_STATUSES.includes(r.status)).reduce((s, r) => s + (r.total_amount || 0), 0);
  const paid = usingClaims
    ? monthClaims.reduce((s, c) => s + (c.amount_paid || 0), 0)
    : monthRecords.filter((r) => PAID_STATUSES.includes(r.status)).reduce((s, r) => s + (r.total_amount || 0), 0);

  const rows = [
    { label: "Billed this month", value: source.length ? money(billed) : "—", color: "text-foreground" },
    { label: "Pending claims", value: source.length ? money(pending) : "—", color: "text-amber-600" },
    { label: "Paid / remitted", value: source.length ? money(paid) : "—", color: "text-green-600" },
    { label: "Timecards pending approval", value: String(pendingTimecards), color: pendingTimecards > 0 ? "text-destructive" : "text-foreground", path: "/timecards" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Billing snapshot — {monthLabel}</CardTitle>
        <Link to="/finance">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 shrink-0">
            View <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between py-2 min-h-[44px] border-b border-border last:border-0">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            {row.path ? (
              <Link to={row.path}>
                <span className={`text-sm font-bold ${row.color} hover:underline cursor-pointer`}>{row.value}</span>
              </Link>
            ) : (
              <span className={`text-sm font-bold ${row.color}`}>{row.value}</span>
            )}
          </div>
        ))}
        {source.length === 0 && (
          <p className="text-xs text-muted-foreground pt-2">No claims or billing records for this month yet.</p>
        )}
      </CardContent>
    </Card>
  );
}