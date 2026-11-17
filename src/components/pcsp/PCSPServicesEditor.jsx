import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Plus, Trash2 } from "lucide-react";

const emptyRow = () => ({
  service_code_id: "",
  service_code: "",
  units_authorized: "",
  authorization_start: "",
  authorization_end: "",
  authorization_id: "",
});

export default function PCSPServicesEditor({ rows = [], setRows, codes = [], authorizations = [] }) {
  const update = (index, patch) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const pickCode = (index, codeId) => {
    const code = codes.find((c) => c.id === codeId);
    const auth = authorizations.find(
      (a) => a.service_code_id === codeId || (code && a.service_code === code.code)
    );
    update(index, {
      service_code_id: codeId,
      service_code: code?.code || "",
      authorization_id: auth?.id || "",
      units_authorized: auth?.authorized_units ?? rows[index].units_authorized,
      authorization_start: auth?.start_date || rows[index].authorization_start,
      authorization_end: auth?.end_date || rows[index].authorization_end,
    });
  };

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Service code</Label>
              <Select value={row.service_code_id || ""} onValueChange={(v) => pickCode(i, v)}>
                <SelectTrigger><SelectValue placeholder="Select a service code" /></SelectTrigger>
                <SelectContent>
                  {codes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Units authorized</Label>
              <Input
                type="number"
                value={row.units_authorized ?? ""}
                onChange={(e) => update(i, { units_authorized: e.target.value })}
              />
            </div>
            <div>
              <Label>Authorization start</Label>
              <Input
                type="date"
                value={row.authorization_start || ""}
                onChange={(e) => update(i, { authorization_start: e.target.value })}
              />
            </div>
            <div>
              <Label>Authorization end</Label>
              <Input
                type="date"
                value={row.authorization_end || ""}
                onChange={(e) => update(i, { authorization_end: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            {row.authorization_id ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-700">
                <Link2 className="h-3 w-3" /> Linked to an authorization record
              </span>
            ) : (
              <span />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, emptyRow()])}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add service
      </Button>
    </div>
  );
}