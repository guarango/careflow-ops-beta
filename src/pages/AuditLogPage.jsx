import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Shield, LifeBuoy, ArrowRight } from "lucide-react";

const CATEGORIES = {
  all: { label: "All events" },
  login_as: {
    label: "CareFlow support (Login As)",
    event_types: ["session_start", "page_view", "session_end"],
  },
  sensitive_view: { label: "Sensitive field revealed", actions: ["sensitive_field_view"] },
  invites: {
    label: "Invites, resends & cancels",
    actions: ["User invited", "staff_invite_resent", "staff_invite_cancelled", "cancel_invite"],
  },
  access: {
    label: "Role, bundle & access changes",
    actions: [
      "staff_access_changed",
      "staff_deactivate",
      "staff_reactivate",
      "staff_activate",
      "set_access",
      "deactivate",
      "reactivate",
    ],
  },
  password: { label: "Password reset sent", actions: ["password_reset_sent"] },
  permissions: { label: "Permissions matrix changed", actions: ["permission_change"] },
  approvals: {
    label: "Approvals, returns & addenda",
    actions: [
      "session_note_approved",
      "session_note_returned",
      "session_note_addended",
      "incident_approved",
      "incident_status_changed",
      "timecard_approved",
      "timecard_returned",
      "emar_approved",
      "emar_returned",
    ],
  },
};

const SUPPORT_EVENTS = ["session_start", "page_view", "session_end"];

const BADGE = {
  support: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  sensitive: "bg-red-500/10 text-red-600 border-red-500/20",
  permissions: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  approvals: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  invites: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  access: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  default: "bg-muted text-muted-foreground border-border",
};

function eventLabel(log) {
  if (log.event_type === "session_start") return "Login As started";
  if (log.event_type === "session_end") return "Login As ended";
  if (log.event_type === "page_view") return "Login As — record opened";
  return (log.action || "Activity").replace(/_/g, " ");
}

function badgeFor(log) {
  if (SUPPORT_EVENTS.includes(log.event_type)) return BADGE.support;
  if (log.action === "sensitive_field_view") return BADGE.sensitive;
  if (log.action === "permission_matrix_change") return BADGE.permissions;
  if ((log.action || "").includes("invite")) return BADGE.invites;
  if (/staff_access_changed|staff_deactivate|staff_reactivate|staff_activate/.test(log.action || "")) {
    return BADGE.access;
  }
  if (/(approved|returned|addended)/.test(log.action || "")) return BADGE.approvals;
  return BADGE.default;
}

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

function recordLabel(log) {
  return log.target_name || log.viewed_record_name || log.viewed_path || "—";
}

export default function AuditLogPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actor, setActor] = useState("all");
  const [category, setCategory] = useState("all");
  const [record, setRecord] = useState("");

  const recordQuery = record.trim();

  const { data: actorValues = [] } = useQuery({
    queryKey: ["audit-actors"],
    queryFn: async () => {
      const res = await base44.entities.AuditLog.list({ distinct: "actor_name" });
      return res?.items || [];
    },
  });

  const filters = useMemo(() => {
    const query = {};
    if (from || to) {
      const range = {};
      if (from) range.$gte = new Date(`${from}T00:00:00`).toISOString();
      if (to) range.$lte = new Date(`${to}T23:59:59.999`).toISOString();
      query.timestamp = range;
    }
    if (actor !== "all") query.actor_name = actor;

    const cat = CATEGORIES[category] || {};
    if (cat.actions) query.action = { $in: cat.actions };
    if (cat.event_types) query.event_type = { $in: cat.event_types };

    if (recordQuery) {
      query.$or = [
        { target_name: recordQuery },
        { target_id: recordQuery },
        { viewed_record_name: recordQuery },
      ];
    }
    return query;
  }, [from, to, actor, category, recordQuery]);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      const page = await base44.entities.AuditLog.filter(filters, {
        sort: "-timestamp",
        limit: 200,
      });
      return page?.items || [];
    },
  });

  const hasFilters = !!(from || to || recordQuery || actor !== "all" || category !== "all");

  const clear = () => {
    setFrom("");
    setTo("");
    setActor("all");
    setCategory("all");
    setRecord("");
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Audit Log</h2>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading entries…" : `${logs.length} entries shown`} · append-only record, entries can
          never be edited or deleted.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="py-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">User</Label>
              <Select value={actor} onValueChange={setActor}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {actorValues.filter(Boolean).map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Event type</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Record</Label>
              <Input
                placeholder="Name or record ID"
                value={record}
                onChange={(e) => setRecord(e.target.value)}
              />
            </div>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clear}>
              Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      {logs.length === 0 && !isLoading ? (
        <div className="text-center py-16">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No audit entries match your filters.</p>
        </div>
      ) : (
        <Card>
          <ScrollArea className="max-h-[70vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="whitespace-nowrap">When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="hidden md:table-cell">Record</TableHead>
                  <TableHead className="hidden lg:table-cell">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const isSupport = SUPPORT_EVENTS.includes(log.event_type);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap align-top">
                        {formatDate(log.timestamp)}
                      </TableCell>
                      <TableCell className="text-sm align-top">
                        {isSupport ? (
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <LifeBuoy className="w-3.5 h-3.5 text-amber-600" />
                            CareFlow support
                          </span>
                        ) : (
                          <span className="font-medium">{log.actor_name || "—"}</span>
                        )}
                        {log.actor_email && !isSupport && (
                          <span className="block text-[11px] text-muted-foreground">{log.actor_email}</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className={badgeFor(log)}>
                          {eventLabel(log)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm align-top">
                        {recordLabel(log)}
                        {log.field && (
                          <span className="block text-[11px] text-muted-foreground">{log.field}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground align-top max-w-[340px]">
                        <span className="block">{log.details || "—"}</span>
                        {(log.old_value || log.new_value) && (
                          <span className="inline-flex items-center gap-1 text-[11px] mt-0.5">
                            <span className="line-through">{log.old_value || "—"}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="font-medium text-foreground">{log.new_value || "—"}</span>
                          </span>
                        )}
                        {log.reason && (
                          <span className="block text-[11px] italic mt-0.5">Reason: {log.reason}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}