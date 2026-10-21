import React from "react";
import StatusCell, { pctColor } from "./StatusCell";

export default function ComplianceGrid({ columns, rows, onSelectCell, emptyMessage }) {
  if (!rows.length) {
    return <div className="text-center text-muted-foreground py-10 text-sm">{emptyMessage || "No data"}</div>;
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="border-collapse w-full">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="sticky left-0 bg-muted/40 z-10 text-left p-2 min-w-[180px] text-xs font-semibold text-muted-foreground">Name</th>
            {columns.map(col => (
              <th key={col.key} className="p-2 text-center min-w-[72px]">
                <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">{col.label}</div>
              </th>
            ))}
            <th className="p-2 text-center min-w-[72px] text-xs font-semibold text-muted-foreground">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className="sticky left-0 bg-background z-10 p-2">
                <div className="font-medium text-sm whitespace-nowrap">{row.name}</div>
                {row.sub && <div className="text-xs text-muted-foreground">{row.sub}</div>}
              </td>
              {columns.map(col => {
                const cell = row.cells?.[col.key] || { status: "gray" };
                return (
                  <td key={col.key} className="p-2 text-center">
                    <div className="flex justify-center">
                      <StatusCell {...cell} onClick={() => onSelectCell?.(row, col, cell)} />
                    </div>
                  </td>
                );
              })}
              <td className="p-2 text-center">
                <span className={`text-sm font-bold ${pctColor(row.pct)}`}>{row.pct}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}