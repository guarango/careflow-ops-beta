import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Home, GraduationCap, Clock } from "lucide-react";

function Chip({ children }) {
  return <span className="text-xs rounded-md bg-muted px-2 py-1 text-foreground">{children}</span>;
}

/** Read-only: who and where the person is assigned to, plus their trainings. */
export default function ProfileAssignmentsCard({ staff }) {
  const clientIds = staff?.assigned_client_ids || [];
  const houseIds = staff?.assigned_house_ids || [];

  const { data: clients = [] } = useQuery({
    queryKey: ["my-profile-clients", clientIds.join(",")],
    queryFn: () => base44.entities.Client.filter({ id: { $in: clientIds } }).catch(() => []),
    enabled: clientIds.length > 0,
  });

  const { data: houses = [] } = useQuery({
    queryKey: ["my-profile-houses", houseIds.join(",")],
    queryFn: () => base44.entities.House.filter({ id: { $in: houseIds } }).catch(() => []),
    enabled: houseIds.length > 0,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["my-profile-trainings", staff?.id],
    queryFn: () => base44.entities.TrainingAssignment.filter({ staff_id: staff.id }).catch(() => []),
    enabled: !!staff?.id,
  });

  const clientName = (id) => {
    const c = clients.find((x) => x.id === id);
    return c ? `${c.first_name || ""} ${c.last_name || ""}`.trim() : "Assigned client";
  };
  const houseName = (id) => houses.find((h) => h.id === id)?.name || "Assigned house";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">My caseload &amp; training</CardTitle>
        <CardDescription>Set by your agency. Contact your Manager to change an assignment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2"><Users className="w-3.5 h-3.5" />Assigned clients</p>
          {clientIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">None assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">{clientIds.map((id) => <Chip key={id}>{clientName(id)}</Chip>)}</div>
          )}
        </div>

        {houseIds.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2"><Home className="w-3.5 h-3.5" />Houses</p>
            <div className="flex flex-wrap gap-1.5">{houseIds.map((id) => <Chip key={id}>{houseName(id)}</Chip>)}</div>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
            <GraduationCap className="w-3.5 h-3.5" />Trainings
          </p>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trainings assigned.</p>
          ) : (
            <div className="space-y-2">
              {assignments.slice(0, 12).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{a.training_title || a.external_title || "Training"}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{a.status || "Assigned"}</Badge>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />Verified training hours:{" "}
            <span className="text-sm font-medium text-foreground">{Number(staff?.training_hours || 0)}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}