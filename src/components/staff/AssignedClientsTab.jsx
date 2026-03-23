import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Search } from "lucide-react";

export default function AssignedClientsTab({ staff }) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  // Always fetch fresh data for this specific staff member
  const { data: freshStaff, isLoading: loadingStaff } = useQuery({
    queryKey: ["staff-member", staff.id],
    queryFn: async () => {
      const all = await base44.entities.StaffMember.filter({ id: staff.id });
      return all[0] || staff;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const [localIds, setLocalIds] = useState([]);

  // Sync localIds whenever freshStaff loads
  useEffect(() => {
    if (freshStaff) {
      setLocalIds(freshStaff.assigned_client_ids || []);
    }
  }, [freshStaff?.id, JSON.stringify(freshStaff?.assigned_client_ids)]);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const mutation = useMutation({
    mutationFn: (ids) =>
      base44.entities.StaffMember.update(staff.id, { assigned_client_ids: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["staff-member", staff.id] });
    },
  });

  const toggle = (clientId) => {
    const isAssigned = localIds.includes(clientId);
    const newIds = isAssigned
      ? localIds.filter(id => id !== clientId)
      : [...localIds, clientId];
    setLocalIds(newIds);
    mutation.mutate(newIds);
  };

  const activeClients = clients.filter(c => c.status !== "Discharged");

  const filtered = activeClients.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  // Assigned clients first
  const sorted = [...filtered].sort((a, b) => {
    const aA = localIds.includes(a.id);
    const bA = localIds.includes(b.id);
    if (aA && !bA) return -1;
    if (!aA && bA) return 1;
    return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
  });

  if (loadingStaff) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
        {sorted.map(client => {
          const isAssigned = localIds.includes(client.id);
          const services = (client.service_enrollments || []).map(e => e.service_type).filter(Boolean).join(", ");
          return (
            <div
              key={client.id}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                isAssigned ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0">
                  {client.first_name[0]}{client.last_name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{client.first_name} {client.last_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{services || "No services"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    client.status === "Active"
                      ? "border-green-200 text-green-700 bg-green-50"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {client.status}
                </Badge>
                <Switch checked={isAssigned} onCheckedChange={() => toggle(client.id)} />
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No clients match your search.</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center border-t pt-3">
        {localIds.length} client{localIds.length !== 1 ? "s" : ""} assigned · Changes save immediately
      </p>
    </div>
  );
}