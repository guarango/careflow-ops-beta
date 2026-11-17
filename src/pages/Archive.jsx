import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Archive, Search, Loader2, Lock, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useRole } from "@/hooks/useRole";

const TABS = [
  { value: "due", label: "Past retention" },
  { value: "archived", label: "Archived" },
  { value: "purged", label: "Purged" },
];

function daysPast(iso) {
  if (!iso) return null;
  return Math.round((Date.parse(new Date().toLocaleDateString("en-CA")) - Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`)) / 86400000);
}

export default function ArchivePage() {
  const { isAdmin } = useRole();
  const [rows, setRows] = useState([]);
  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("due");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [archive, legal] = await Promise.all([
        base44.entities.ClinicalArchive.list("-archived_at", 300),
        base44.entities.LegalHold.filter({ active: true }),
      ]);
      setRows(archive);
      setHolds(legal);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const heldClients = useMemo(() => new Set(holds.map((h) => h.client_id)), [holds]);

  const filtered = rows.filter((r) => {
    if (tab === "due" && !(r.purge_eligible && !r.purged)) return false;
    if (tab === "archived" && r.purged) return false;
    if (tab === "purged" && !r.purged) return false;
    const hay = `${r.client_name || ""} ${r.record_label || ""} ${r.entity_name || ""}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  const confirmPurge = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("purgeArchivedRecord", { id: target.id, note });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Record purged — the confirmation is in the audit log.");
      setTarget(null);
      setNote("");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "The purge could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <ShieldCheck className="w-10 h-10 mx-auto mb-3" />
        Archived records are available to Admin only.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Clinical archive"
        subtitle="Archived records stay searchable for their full retention period. Purge happens only here, only with confirmation."
        action={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Archive className="w-4 h-4 mr-1" />}
            Refresh
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="py-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search person or record" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          {loading ? "Loading archive…" : tab === "due" ? "Nothing is past retention right now." : "No records here."}
        </p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead className="hidden md:table-cell">Archived</TableHead>
                  <TableHead>Retained until</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const onHold = heldClients.has(r.client_id);
                  const days = daysPast(r.retention_until);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.client_name || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {r.record_label || r.entity_name}
                        <span className="block text-[11px] text-muted-foreground">{r.entity_name}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{String(r.archived_at || "").slice(0, 10)}</TableCell>
                      <TableCell className="text-sm">
                        {String(r.retention_until || "").slice(0, 10)}
                        {days !== null && days > 0 && !r.purged && (
                          <span className="block text-[11px] text-muted-foreground">{days}d past</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.purged ? (
                          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Purged</Badge>
                        ) : onHold ? (
                          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-300 gap-1">
                            <Lock className="w-3 h-3" /> Legal hold
                          </Badge>
                        ) : r.purge_eligible ? (
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { setTarget(r); setNote(""); }}>
                            Purge
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Inside retention</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Purge archived record</DialogTitle>
            <DialogDescription>
              {target?.client_name} · {target?.record_label}. This destroys the stored copy and cannot be undone. Your confirmation is logged.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Confirmation note</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why the purge is approved" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={confirmPurge} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Purge record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}