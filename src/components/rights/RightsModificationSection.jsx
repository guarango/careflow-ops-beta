import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Plus } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useRightsModifications } from "@/hooks/useRightsModifications";
import RightsModificationCard from "./RightsModificationCard";
import RightsModificationDialog from "./RightsModificationDialog";
import RightsActionDialog from "./RightsActionDialog";
import RightsInstructionCard from "./RightsInstructionCard";

export default function RightsModificationSection({ client }) {
  const { isAdmin, isManager, isReadOnly, effectiveUser } = useRole();
  const { items, loading, active, reload } = useRightsModifications(client?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [action, setAction] = useState(null);

  const canEdit = (isAdmin || isManager) && !isReadOnly;

  const { data: plans = [] } = useQuery({
    queryKey: ["client-pcsp-rights", client?.id],
    queryFn: () => base44.entities.ISPlan.filter({ client_id: client.id, status: "Active" }),
    enabled: !!client?.id && canEdit,
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["client-goals-rights", client?.id],
    queryFn: () => base44.entities.ClientGoal.filter({ client_id: client.id }),
    enabled: !!client?.id && canEdit,
  });

  if (loading || !client) return null;

  // DSPs see only what the restriction is and how to carry it out.
  if (!canEdit) return active ? <RightsInstructionCard modification={active} /> : null;

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openExisting = (mod) => { setEditing(mod); setDialogOpen(true); };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <h2 className="text-sm font-semibold truncate">Rights modifications</h2>
          {active && (
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">
              Rights modification active
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={openNew} disabled={plans.length === 0}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New
        </Button>
      </div>

      {plans.length === 0 && (
        <p className="text-xs text-muted-foreground mb-2">An active PCSP is required before a rights modification can be documented.</p>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3">No rights modifications on file.</p>
      ) : (
        <div className="space-y-2">
          {items.map((mod) => (
            <RightsModificationCard
              key={mod.id}
              modification={mod}
              onOpen={openExisting}
              onReview={(m) => setAction({ mode: "review", mod: m })}
              onEnd={(m) => setAction({ mode: "end", mod: m })}
            />
          ))}
        </div>
      )}

      <RightsModificationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={client}
        plans={plans}
        goals={goals}
        modification={editing}
        canApprove={isAdmin}
        actorName={effectiveUser?.full_name || effectiveUser?.email || ""}
        onSaved={reload}
      />

      <RightsActionDialog
        mode={action?.mode}
        modification={action?.mod}
        open={!!action}
        onOpenChange={(v) => !v && setAction(null)}
        onDone={reload}
      />
    </div>
  );
}