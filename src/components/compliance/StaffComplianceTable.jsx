import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2, AlertTriangle, XCircle, LayoutGrid, List } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { Shield } from "lucide-react";
import ComplianceGridView from "./ComplianceGridView";

const STATUS_CONFIG = {
  Compliant: { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2, iconColor: "text-green-500" },
  "At Risk": { color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle, iconColor: "text-amber-500" },
  "Non-Compliant": { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, iconColor: "text-red-500" },
};

const FILTERS = ["All", "Compliant", "At Risk", "Non-Compliant", "Expiring Soon"];

export default function StaffComplianceTable({ staff, allDocs, calcCompliance, onSelectStaff }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [viewMode, setViewMode] = useState("list");

  const rows = staff.map(s => ({ staff: s, compliance: calcCompliance(s, allDocs) }));

  const filtered = rows.filter(({ staff: s, compliance: c }) => {
    const matchSearch = `${s.first_name} ${s.last_name} ${s.role}`.toLowerCase().includes(search.toLowerCase());
    let matchFilter = true;
    if (filter === "Compliant") matchFilter = c.overallStatus === "Compliant";
    else if (filter === "At Risk") matchFilter = c.overallStatus === "At Risk";
    else if (filter === "Non-Compliant") matchFilter = c.overallStatus === "Non-Compliant";
    else if (filter === "Expiring Soon") matchFilter = c.expiringCount > 0;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search staff…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                {f}
              </button>
            ))}
            <div className="flex border rounded-md overflow-hidden ml-2">
              <button onClick={() => setViewMode("list")} className={`p-1.5 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><List className="w-4 h-4" /></button>
              <button onClick={() => setViewMode("grid")} className={`p-1.5 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><LayoutGrid className="w-4 h-4" /></button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === "grid" ? (
        <ComplianceGridView rows={filtered} onSelectStaff={onSelectStaff} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Shield} title="No staff found" description="Adjust your search or filters." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Compliance %</TableHead>
                  <TableHead>Missing</TableHead>
                  <TableHead>Expiring</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(({ staff: s, compliance: c }) => {
                  const cfg = STATUS_CONFIG[c.overallStatus];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectStaff(s)}>
                      <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.role}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${c.pct === 100 ? "bg-green-500" : c.pct >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${c.pct}%` }} />
                          </div>
                          <span className="text-sm font-semibold">{c.pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.missingCount > 0 ? <span className="text-destructive font-semibold text-sm">{c.missingCount}</span> : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        {c.expiringCount > 0 ? <span className="text-orange-500 font-semibold text-sm">{c.expiringCount}</span> : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs border ${cfg.color} flex items-center gap-1 w-fit`}>
                          <Icon className={`w-3 h-3 ${cfg.iconColor}`} />
                          {c.overallStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}