import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useRole } from "@/hooks/useRole";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, AlertTriangle } from "lucide-react";

export default function RatesTab() {
  const { can } = useRole();
  const canEdit = can("editRates");
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({});

  const { data: codes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, rate }) => base44.entities.ServiceCode.update(id, { rate }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service-codes"] }),
  });

  const rateFor = (c) => (draft[c.id] !== undefined ? draft[c.id] : c.rate || 0);
  const isDirty = (c) => draft[c.id] !== undefined && Number(draft[c.id]) !== Number(c.rate || 0);
  const zeroRateCount = codes.filter((c) => !c.rate).length;

  return (
    <div className="space-y-4">
      {zeroRateCount > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Rate not configured</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {zeroRateCount} of {codes.length} service codes have a $0.00 rate. Billing, unit tracking
              and payroll export compute to zero until rates are entered.
            </p>
          </div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Unit Type</TableHead>
                <TableHead>Rate</TableHead>
                {canEdit && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4} className="text-center py-8 text-muted-foreground text-sm">
                    No service codes configured yet.
                  </TableCell>
                </TableRow>
              )}
              {codes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><span className="font-mono font-semibold text-primary">{c.code}</span></TableCell>
                  <TableCell className="text-sm">{c.description}</TableCell>
                  <TableCell className="text-sm">{c.unit_type || c.rate_type || "—"}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={rateFor(c)}
                        onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value })}
                        className="h-8 w-28"
                      />
                    ) : (
                      <span className="font-semibold">${(c.rate || 0).toFixed(2)}</span>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      {isDirty(c) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1"
                          onClick={() => saveMutation.mutate({ id: c.id, rate: parseFloat(draft[c.id]) || 0 })}
                          disabled={saveMutation.isPending}
                        >
                          <Save className="w-3.5 h-3.5" />Save
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}