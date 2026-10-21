import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Search, Home } from "lucide-react";

export default function AssignedClientsTab({ staff }) {
  const [search, setSearch] = useState("");
  const [houseSearch, setHouseSearch] = useState("");
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

  const [localClientIds, setLocalClientIds] = useState([]);
  const [localHouseIds, setLocalHouseIds] = useState([]);

  // Sync local state whenever freshStaff loads
  useEffect(() => {
    if (freshStaff) {
      setLocalClientIds(freshStaff.assigned_client_ids || []);
      setLocalHouseIds(freshStaff.assigned_house_ids || []);
    }
  }, [freshStaff?.id, JSON.stringify(freshStaff?.assigned_client_ids), JSON.stringify(freshStaff?.assigned_house_ids)]);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: houses = [] } = useQuery({
    queryKey: ["houses"],
    queryFn: () => base44.entities.House.list(),
  });

  // After saving, sync the User record so RLS picks up the change immediately
  const syncMutation = useMutation({
    mutationFn: () => base44.functions.invoke("syncStaffAssignments", { staff_id: staff.id }),
  });

  const clientMutation = useMutation({
    mutationFn: (ids) =>
      base44.entities.StaffMember.update(staff.id, { assigned_client_ids: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["staff-member", staff.id] });
      syncMutation.mutate();
    },
  });

  const houseMutation = useMutation({
    mutationFn: (ids) =>
      base44.entities.StaffMember.update(staff.id, { assigned_house_ids: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["staff-member", staff.id] });
      syncMutation.mutate();
    },
  });

  const toggleClient = (clientId) => {
    const isAssigned = localClientIds.includes(clientId);
    const newIds = isAssigned
      ? localClientIds.filter(id => id !== clientId)
      : [...localClientIds, clientId];
    setLocalClientIds(newIds);
    clientMutation.mutate(newIds);
  };

  const toggleHouse = (houseId) => {
    const isAssigned = localHouseIds.includes(houseId);
    const newIds = isAssigned
      ? localHouseIds.filter(id => id !== houseId)
      : [...localHouseIds, houseId];
    setLocalHouseIds(newIds);
    houseMutation.mutate(newIds);
  };

  // Compute caseload stats
  const directCount = localClientIds.length;
  const houseCount = localHouseIds.length;
  const houseClientIds = clients
    .filter(c => localHouseIds.includes(c.house_id))
    .map(c => c.id);
  const viaHouses = houseClientIds.filter(id => !localClientIds.includes(id)).length;
  const totalCaseload = directCount + viaHouses;

  const activeClients = clients.filter(c => c.status !== "Discharged");
  const filteredClients = activeClients.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
  );
  const sortedClients = [...filteredClients].sort((a, b) => {
    const aA = localClientIds.includes(a.id);
    const bA = localClientIds.includes(b.id);
    if (aA && !bA) return -1;
    if (!aA && bA) return 1;
    return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
  });

  const filteredHouses = houses.filter(h =>
    h.name?.toLowerCase().includes(houseSearch.toLowerCase())
  );
  const sortedHouses = [...filteredHouses].sort((a, b) => {
    const aA = localHouseIds.includes(a.id);
    const bA = localHouseIds.includes(b.id);
    if (aA && !bA) return -1;
    if (!aA && bA) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  if (loadingStaff) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Caseload summary */}
      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
        <div>
          <p className="text-sm font-semibold">
            {totalCaseload} client{totalCaseload !== 1 ? "s" : ""} in caseload
          </p>
          <p className="text-xs text-muted-foreground">
            {directCount} direct · {viaHouses} via {houseCount} house{houseCount !== 1 ? "s" : ""}
          </p>
        </div>
        {syncMutation.isPending && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Syncing…
          </span>
        )}
        {syncMutation.isSuccess && !syncMutation.isPending && (
          <span className="text-xs text-green-600">Synced</span>
        )}
      </div>

      {/* House assignments */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">House Assignments</h3>
          <Badge variant="outline" className="text-[10px]">{houseCount} assigned</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Clients in assigned houses are automatically included in this staff member's caseload.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search houses..."
            value={houseSearch}
            onChange={e => setHouseSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {sortedHouses.map(house => {
            const isAssigned = localHouseIds.includes(house.id);
            const clientCount = clients.filter(c => c.house_id === house.id).length;
            return (
              <div
                key={house.id}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  isAssigned ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Home className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{house.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {clientCount} client{clientCount !== 1 ? "s" : ""}
                      {house.address ? ` · ${house.address}` : ""}
                    </p>
                  </div>
                </div>
                <Switch checked={isAssigned} onCheckedChange={() => toggleHouse(house.id)} />
              </div>
            );
          })}
          {sortedHouses.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {houses.length === 0 ? "No houses created yet." : "No houses match your search."}
            </p>
          )}
        </div>
      </div>

      {/* Client assignments */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Direct Client Assignments</h3>
          <Badge variant="outline" className="text-[10px]">{directCount} assigned</Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
          {sortedClients.map(client => {
            const isAssigned = localClientIds.includes(client.id);
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
                    {client.first_name?.[0]}{client.last_name?.[0]}
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
                  <Switch checked={isAssigned} onCheckedChange={() => toggleClient(client.id)} />
                </div>
              </div>
            );
          })}
          {sortedClients.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No clients match your search.</p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center border-t pt-3">
        Changes save immediately and sync to the user's access permissions.
      </p>
    </div>
  );
}