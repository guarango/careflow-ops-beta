import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Users, X } from "lucide-react";

export default function AssignedStaffSection({ clientId, isAdmin }) {
  const queryClient = useQueryClient();

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const assignedStaff = staffList.filter(s =>
    (s.assigned_client_ids || []).includes(clientId)
  );

  const removeMutation = useMutation({
    mutationFn: ({ staffId, newIds }) =>
      base44.entities.StaffMember.update(staffId, { assigned_client_ids: newIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });

  const removeClient = (staffMember) => {
    const newIds = (staffMember.assigned_client_ids || []).filter(id => id !== clientId);
    removeMutation.mutate({ staffId: staffMember.id, newIds });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Assigned Staff</h3>
        <span className="text-xs text-muted-foreground">({assignedStaff.length})</span>
      </div>
      {assignedStaff.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No staff assigned to this client.
          {isAdmin && " Open a staff profile to manage assignments."}
        </p>
      ) : (
        <div className="space-y-2">
          {assignedStaff.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                  {s.first_name[0]}{s.last_name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{s.first_name} {s.last_name}</p>
                  <p className="text-xs text-muted-foreground">{s.role || "Staff"}</p>
                </div>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeClient(s)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}