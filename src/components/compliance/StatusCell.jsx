import React from "react";
import { cn } from "@/lib/utils";

export const STATUS_COLORS = {
  green: { cell: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-200", label: "Compliant" },
  yellow: { cell: "bg-yellow-400", badge: "bg-yellow-50 text-yellow-700 border-yellow-200", label: "At Risk" },
  orange: { cell: "bg-orange-500", badge: "bg-orange-50 text-orange-700 border-orange-200", label: "Expiring" },
  red: { cell: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200", label: "Non-Compliant" },
  gray: { cell: "bg-gray-300", badge: "bg-gray-50 text-gray-600 border-gray-200", label: "N/A" },
};

export function pctColor(pct) {
  if (pct >= 90) return "text-green-600";
  if (pct >= 75) return "text-yellow-600";
  if (pct >= 50) return "text-orange-600";
  return "text-red-600";
}

export function pctBg(pct) {
  if (pct >= 90) return "bg-green-500";
  if (pct >= 75) return "bg-yellow-400";
  if (pct >= 50) return "bg-orange-500";
  return "bg-red-500";
}

export default function StatusCell({ status, label, detail, onClick }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.gray;
  return (
    <button
      onClick={onClick}
      title={detail ? `${label}: ${detail}` : label || cfg.label}
      className={cn("w-6 h-6 rounded-md transition-transform hover:scale-125 hover:ring-2 hover:ring-offset-1 hover:ring-primary/40", cfg.cell)}
    />
  );
}