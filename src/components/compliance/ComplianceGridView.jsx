import React from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";

const CELL_CONFIG = {
  Current: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
  Missing: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  "Expiring Soon": { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50" },
  "Pending Review": { icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
  Expired: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
};

export default function ComplianceGridView({ rows, onSelectStaff }) {
  if (!rows.length) return null;

  // Collect all unique required doc types across all rows
  const allRequiredDocs = [...new Set(rows.flatMap(r => r.compliance.required))];

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 font-semibold text-sm sticky left-0 bg-card z-10 min-w-[160px]">Staff Member</th>
            {allRequiredDocs.map(doc => (
              <th key={doc} className="p-2 font-medium text-center text-muted-foreground whitespace-nowrap min-w-[100px]">{doc}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ staff: s, compliance: c }) => (
            <tr key={s.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => onSelectStaff(s)}>
              <td className="p-3 font-medium sticky left-0 bg-card z-10">
                <div>{s.first_name} {s.last_name}</div>
                <div className="text-muted-foreground text-[11px]">{s.role}</div>
              </td>
              {allRequiredDocs.map(reqDoc => {
                const found = c.staffDocs.find(d => d.title?.toLowerCase().includes(reqDoc.toLowerCase()));
                const statusKey = !found ? "Missing" : found.status;
                const cfg = CELL_CONFIG[statusKey] || CELL_CONFIG["Current"];
                const Icon = cfg.icon;
                return (
                  <td key={reqDoc} className="p-2 text-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto ${cfg.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}