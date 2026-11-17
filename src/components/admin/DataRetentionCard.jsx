import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Archive, Pencil, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRole } from "@/hooks/useRole";
import { DEFAULT_SETTINGS, MINOR_RULES, describeRetention } from "@/lib/retentionDisplay";

export default function DataRetentionCard() {
  const { toast } = useToast();
  const { isSuperAdmin, isAdmin } = useRole();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(DEFAULT_SETTINGS);

  const { data: settings, refetch } = useQuery({
    queryKey: ["retention-settings"],
    queryFn: async () => (await base44.entities.RetentionSettings.list("-created_date", 1))[0] || null,
    enabled: isAdmin,
  });
  const rule = { ...DEFAULT_SETTINGS, ...(settings || {}) };

  const openDialog = () => {
    setForm({
      state: rule.state,
      retention_years_adult: rule.retention_years_adult,
      retention_minor_rule: rule.retention_minor_rule,
      retention_basis: rule.retention_basis,
      rule_confirmed: !!rule.rule_confirmed,
    });
    setError("");
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("saveRetentionSettings", form);
      if (res.data?.error) throw new Error(res.data.error);
      await refetch();
      toast({ title: "Retention rule saved" });
      setOpen(false);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "The rule could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Archive className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 flex-wrap">
              Data retention
              {rule.rule_confirmed ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">Confirmed</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">Unconfirmed</Badge>
              )}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">{rule.state} · runs from the {String(rule.retention_basis).toLowerCase()}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={openDialog}>
          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground">{describeRetention(rule)}</p>
        <p className="text-[11px] text-muted-foreground">{rule.source}</p>
        {!rule.rule_confirmed && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2">
            The current DHHS91172 retention period is not confirmed. Until it is, the prior DHS90548 template applies. Only a Super Admin can confirm the rule.
          </p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/archive" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            Open archive <ArrowRight className="w-3 h-3" />
          </Link>
          <span className="text-[11px] text-muted-foreground">Clinical records cannot be deleted, only archived.</span>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Retention rule</DialogTitle>
            <DialogDescription>
              {isSuperAdmin
                ? "You are a Super Admin: you set the state default and confirm the rule."
                : "You can lengthen the state period here, never shorten it."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label>State</Label>
                <Input value={form.state} disabled={!isSuperAdmin} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label>Adult retention (years)</Label>
                <Input type="number" min={1} value={form.retention_years_adult} onChange={(e) => setForm({ ...form, retention_years_adult: Number(e.target.value) })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Minor rule</Label>
                <Select value={form.retention_minor_rule} onValueChange={(v) => setForm({ ...form, retention_minor_rule: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MINOR_RULES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Retention runs from</Label>
                <Input value={form.retention_basis} onChange={(e) => setForm({ ...form, retention_basis: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Rule confirmed</p>
                <p className="text-[11px] text-muted-foreground">Super Admin only — confirms the DHHS91172 period</p>
              </div>
              <Switch
                checked={form.rule_confirmed}
                disabled={!isSuperAdmin}
                onCheckedChange={(v) => setForm({ ...form, rule_confirmed: v })}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Save rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}