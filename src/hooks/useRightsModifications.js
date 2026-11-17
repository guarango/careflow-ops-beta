import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/** Rights modifications for one person, plus the one currently restricting rights. */
export function useRightsModifications(clientId) {
  const [items, setItems] = useState(null);

  const reload = useCallback(async () => {
    if (!clientId) return;
    const data = await base44.entities.RightsModification.filter({ client_id: clientId });
    setItems(data);
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  const list = items || [];
  const active =
    list.find((m) => m.status === "Active") ||
    list.find((m) => m.status === "Under review") ||
    null;

  return { items: list, loading: items === null, active, reload };
}