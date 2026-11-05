import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import SensitiveValue from "@/components/shared/SensitiveValue";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/hooks/useRole";
import ClientAuthorizations from "@/components/clients/ClientAuthorizations";
import {
  ArrowLeft, Pencil, User, Users, Pill, Target, ClipboardList, Heart,
} from "lucide-react";

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground mt-0.5">{children || "—"}</div>
    </div>
  );
}

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useRole();
  const canEdit = can("editClients");

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: () => base44.entities.Client.get(id),
    enabled: !!id,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["client-goals-profile", id],
    queryFn: () => base44.entities.ClientGoal.filter({ client_id: id }),
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["client-notes-profile", id],
    queryFn: () => base44.entities.SessionNote.filter({ client_id: id }),
    enabled: !!id,
  });

  const { data: medications = [] } = useQuery({
    queryKey: ["client-meds-profile", id],
    queryFn: () => base44.entities.Medication.filter({ client_id: id }),
    enabled: !!id,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-profile-care-team"],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const { data: houses = [] } = useQuery({
    queryKey: ["houses-profile"],
    queryFn: () => base44.entities.House.list(),
  });

  const notFound = !isLoading && !client;

  useEffect(() => {
    if (!notFound) return;
    const meta = document.createElement("meta");
    meta.name = "prerender-status-code";
    meta.content = "404";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, [notFound]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        icon={User}
        title="Client not found"
        description="This client record doesn't exist, or you don't have access to it."
        action={<Button variant="outline" onClick={() => navigate("/clients")}>Back to clients</Button>}
      />
    );
  }

  const fullName = `${client.first_name || ""} ${client.middle_initial ? `${client.middle_initial}. ` : ""}${client.last_name || ""}`.trim();
  const initials = `${client.first_name?.[0] || ""}${client.last_name?.[0] || ""}`.toUpperCase();
  const house = houses.find((h) => h.id === client.house_id);
  const careTeam = staff.filter(
    (s) => (s.assigned_client_ids || []).includes(client.id) || (client.assigned_staff && client.assigned_staff === s.id)
  );
  const recentNotes = [...notes]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 5);
  const activeGoals = goals.filter((g) => g.status === "Active");

  return (
    <div>
      <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-4 h-4" /> Clients
      </Link>

      <PageHeader
        title={fullName}
        subtitle={house ? `${house.name}${client.diagnosis ? ` · ${client.diagnosis}` : ""}` : client.diagnosis || "Client profile"}
        action={canEdit && (
          <Button size="sm" onClick={() => navigate(`/clients?edit=${client.id}`)}>
            <Pencil className="w-4 h-4 mr-1" /> Edit client
          </Button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Overview */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
              {initials || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold truncate">{fullName}</CardTitle>
              <div className="mt-1"><StatusBadge status={client.status || "Active"} /></div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Date of birth">{client.date_of_birth || "—"}</Field>
            <Field label="Gender">{client.gender || "—"}</Field>
            <Field label="Medicaid ID">
              <SensitiveValue
                value={client.medicaid_id}
                field="Client Medicaid ID"
                subject={{ type: "client", id: client.id, name: fullName }}
                canReveal={can("viewSensitiveIdentifiers")}
              />
            </Field>
            <Field label="Insurance">{client.insurance_provider || "—"}</Field>
            <Field label="Guardian">{client.guardian_name || "—"}</Field>
            <Field label="Guardian phone">{client.guardian_phone || "—"}</Field>
            <div className="col-span-2">
              <Field label="Address">
                {[client.address, client.address_city, client.address_state, client.address_zip].filter(Boolean).join(", ") || "—"}
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Services">
                {(client.service_enrollments || []).length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(client.service_enrollments || []).map((e, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{e.service_type || "—"}</Badge>
                    ))}
                  </div>
                ) : "—"}
              </Field>
            </div>
            {client.notes && (
              <div className="col-span-2"><Field label="Notes">{client.notes}</Field></div>
            )}
          </CardContent>
        </Card>

        {/* Care team */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Care team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {careTeam.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No staff assigned to this client yet.</p>
            ) : (
              careTeam.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                    {`${s.first_name?.[0] || ""}${s.last_name?.[0] || ""}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.role || "Staff"}{s.email ? ` · ${s.email}` : ""}</p>
                  </div>
                  <StatusBadge status={s.status || "Active"} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Medical */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <Pill className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Medical — medications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {medications.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No medications on file.</p>
            ) : (
              medications.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.medication_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[m.dosage, m.frequency, (m.scheduled_times || []).join(", ")].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  {m.is_prn && <Badge variant="outline" className="text-[10px] shrink-0">PRN</Badge>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Goals ({activeGoals.length} active)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No goals on file.</p>
            ) : (
              goals.slice(0, 6).map((g) => (
                <Link key={g.id} to="/goals" className="flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-muted/40 rounded px-1 -mx-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.goal_title}</p>
                    <p className="text-xs text-muted-foreground truncate">{g.domain || "Goal"}</p>
                  </div>
                  <StatusBadge status={g.status || "Active"} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Authorizations & units */}
        <div className="md:col-span-2">
          <ClientAuthorizations client={client} />
        </div>

        {/* Recent notes */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Recent session notes</CardTitle>
            </div>
            <Link to="/session-notes" className="text-xs text-primary hover:underline">All notes →</Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentNotes.length === 0 ? (
              <div className="flex items-center gap-2 justify-center py-6 text-muted-foreground">
                <Heart className="w-4 h-4" />
                <p className="text-sm">No session notes recorded yet.</p>
              </div>
            ) : (
              recentNotes.map((n) => (
                <div key={n.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <span className="text-xs font-mono text-muted-foreground w-20 shrink-0 pt-0.5">{n.date || "—"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2">{n.summary || n.original_summary || "No summary"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.staff_name || "Staff"}</p>
                  </div>
                  <StatusBadge status={n.status || "Draft"} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}