import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Search } from "lucide-react";

const EVENT_BADGES = {
  session_start: "bg-green-500/10 text-green-600 border-green-500/20",
  page_view: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  session_end: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  generic: "bg-muted text-muted-foreground border-muted",
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => base44.entities.AuditLog.filter({}, { sort: "-timestamp", limit: 200 }),
  });

  const items = Array.isArray(logs) ? logs : logs.items || [];

  const actorNames = [...new Set(items.map((l) => l.actor_name).filter(Boolean))];

  const filtered = items.filter((log) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (log.actor_name || "").toLowerCase().includes(q) ||
      (log.target_name || "").toLowerCase().includes(q) ||
      (log.details || "").toLowerCase().includes(q) ||
      (log.reason || "").toLowerCase().includes(q) ||
      (log.viewed_path || "").toLowerCase().includes(q);

    const matchesUser = filterUser === "all" || log.actor_name === filterUser;
    const matchesType = filterType === "all" || log.event_type === filterType;

    let matchesDate = true;
    if (filterDate) {
      const logDate = (log.timestamp || "").split("T")[0];
      matchesDate = logDate === filterDate;
    }

    return matchesSearch && matchesUser && matchesType && matchesDate;
  });

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle={`${items.length} impersonation events logged`}
      />

      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, reason, details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by admin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All admins</SelectItem>
                {actorNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="session_start">Session Start</SelectItem>
                <SelectItem value="page_view">Page Views</SelectItem>
                <SelectItem value="session_end">Session End</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 && !isLoading ? (
        <div className="text-center py-16">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No audit log entries match your filters.</p>
        </div>
      ) : (
        <Card>
          <ScrollArea className="max-h-[70vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="hidden md:table-cell">Viewed As / Detail</TableHead>
                  <TableHead className="hidden lg:table-cell">Reason</TableHead>
                  <TableHead className="hidden xl:table-cell">Path / Record</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-sm">
                      {log.actor_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={EVENT_BADGES[log.event_type] || EVENT_BADGES.generic}
                      >
                        {log.event_type?.replace(/_/g, " ") || "generic"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {log.target_name || log.viewed_record_name || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {log.reason || "—"}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                      {log.viewed_path || "—"}
                      {log.viewed_record_name ? ` (${log.viewed_record_name})` : ""}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}