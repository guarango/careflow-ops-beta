import React from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { valueFor } from "@/lib/annualReport";

export default function AnnualReportGrid({ columns, rows, editing, onManualChange }) {
  return (
    <div className="rounded-lg border border-border overflow-x-auto bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Code</TableHead>
            {columns.map((c) => (
              <TableHead key={c.key} className="text-right whitespace-nowrap">{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.service_code_id}>
              <TableCell className="whitespace-nowrap align-top">
                <span className="font-semibold text-sm">{row.code}</span>
                <span className="block text-[10px] text-muted-foreground max-w-[240px] truncate">{row.code_label}</span>
              </TableCell>
              {columns.map((c) => (
                <TableCell key={c.key} className="text-right tabular-nums text-sm align-top">
                  {c.metric === "manual" && editing ? (
                    <Input
                      className="h-8 w-28 ml-auto text-right"
                      defaultValue={valueFor(row, c)}
                      onBlur={(e) => onManualChange(row.service_code_id, c.key, e.target.value)}
                    />
                  ) : (
                    <span>{valueFor(row, c) === "" ? "—" : valueFor(row, c)}</span>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-center text-sm text-muted-foreground py-8">
                No rows yet — run the report to build one row per reported code.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}