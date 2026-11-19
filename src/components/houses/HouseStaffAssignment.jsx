import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Search, UserRound } from "lucide-react";

export default function HouseStaffAssignment({ house }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState(null);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["house-staff", house.id],
    queryFn: async () => {
      const res = await base44.entities.StaffMember.filter({}, { sort: "last_name", limit: 300 });
      return (res.items || []).filter((s) => s.status !== "Inactive");
    },
  });

  const assignedCount = staff.filter((s) => (s.assigned_house_ids || []).includes(house.id)).length;
  const filtered = staff.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.preferred_name || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = async (member) => {
    const current = member.assigned_house_ids || [];
    const isAssigned = current.includes(house.id);
    const next = isAssigned ? current.filter((id) => id !== house.id) : [...current, house.id];
    setSavingId(member.id);
    try {
      await base44.entities.StaffMember.update(member.id, { assigned_house_ids: next });
      await base44.functions.invoke("syncStaffAssignments", { staff_id: member.id }).catch(() => null);
      queryClient.invalidateQueries({ queryKey: ["house-staff", house.id] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff-member", member.id] });
      queryClient.invalidateQueries({ queryKey: ["staff-assignments"] });
    } catch (err) {
      toast({
        title: "Assignment failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <UserRound className="w-3.5 h-3.5 text-muted-foreground" />
          Assigned Staff
        </p>
        <Badge variant="outline" className="text-[11px]">{assignedCount} assigned</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Staff assigned here automatically include this house's clients in their caseload.
      </p>
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff..."
          className="h-8 pl-8 text-sm"
        />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No staff found.</p>
      ) : (
        <div className="max-h-56 overflow-y-auto divide-y divide-border rounded-md bg-card">
          {filtered.map((s) => {
            const assigned = (s.assigned_house_ids || []).includes(house.id);
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="text-sm truncate">{s.preferred_name || `${s.first_name} ${s.last_name}`}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {s.role || "Staff"}{s.status && s.status !== "Active" ? ` · ${s.status}` : ""}
                  </p>
                </div>
                <Switch
                  checked={assigned}
                  disabled={savingId === s.id}
                  onCheckedChange={() => toggle(s)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}