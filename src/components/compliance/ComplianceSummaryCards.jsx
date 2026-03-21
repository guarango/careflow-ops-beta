import React from "react";
import { Card } from "@/components/ui/card";
import { Users, CheckCircle2, AlertTriangle, Clock, ShieldAlert } from "lucide-react";

export default function ComplianceSummaryCards({ staff, allDocs, calcCompliance }) {
  const stats = staff.map(s => calcCompliance(s, allDocs));
  const total = staff.length;
  const fullCompliant = stats.filter(s => s.overallStatus === "Compliant").length;
  const missing = stats.filter(s => s.missingCount > 0).length;
  const pending = stats.filter(s => s.pendingCount > 0).length;
  const expiring = stats.filter(s => s.expiringCount > 0).length;

  const cards = [
    { label: "Total Staff", value: total, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Fully Compliant", value: fullCompliant, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { label: "Missing Documents", value: missing, icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Pending Reviews", value: pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Expiring Soon", value: expiring, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg}`}>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}