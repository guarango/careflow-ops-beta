import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import StaffProfileDialog from "@/components/staff/StaffProfileDialog";
import StaffStatusFilter from "@/components/shared/StaffStatusFilter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Phone, Mail, AlertTriangle, Plus } from "lucide-react";
import InviteUserDialog from "@/components/users/InviteUserDialog";
import { useRole } from "@/hooks/useRole";
import { useViewMode } from "@/hooks/useViewMode";
import EntityCard from "@/components/shared/EntityCard";
import ViewToggle from "@/components/shared/ViewToggle";
import { DEFAULT_STATUS_TAB, peopleInTab, matchesSearch, personStatus, onboardingState } from "@/lib/staffFilters";

function onboardingClass(state) {
  if (state === "Complete") return "border-accent/30 bg-accent/10 text-accent text-[10px]";
  if (state === "In progress") return "border-chart-4/30 bg-chart-4/10 text-chart-4 text-[10px]";
  return "border-border bg-muted text-muted-foreground text-[10px]";
}

function complianceAlerts(s) {
  const alerts = [];
  if (!s.background_check_status || s.background_check_status === "Expired") alerts.push("BG Check");
  if (!s.i9_verified) alerts.push("I-9");
  if (!s.drug_screen_status || s.drug_screen_status === "Expired") alerts.push("Drug Screen");
  if (!s.tb_test_result || s.tb_test_result === "Pending") alerts.push("TB Test");
  return alerts;
}

/**
 * Staff = the HR view of the same StaffMember records the Users tab shows.
 * People are added by inviting them (Users tab), never here.
 */
export default function Staff() {
  const { can } = useRole();
  const canViewHR = can("viewStaffHRFiles");
  const canSeeOnboarding = can("viewAllStaff");
  const canEditHR = can("editStaff");
  const canEditStaff = canEditHR || can("editStaffDirectory");
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState(DEFAULT_STATUS_TAB);
  const [viewMode, setViewMode] = useViewMode("staff");

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffMember.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowDialog(false);
      setEditingStaff(null);
    },
  });

  const openProfile = (s) => { setEditingStaff(s); setShowDialog(true); };

  // HR edits never touch access — app access changes only through setStaffAccess.
  const handleSave = (formData) => {
    if (!formData.id || !canEditStaff) return;
    const { app_access, hr_bundle, billing_bundle, status, invited_by, invited_at, activated_at, deactivated_at, deactivated_by, deactivation_reason, ...profile } = formData;
    updateMutation.mutate({ id: formData.id, data: profile });
  };

  const visible = peopleInTab(staff, statusTab).filter((s) => matchesSearch(s, search));

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle={`${visible.length} of ${staff.length} people · HR view of the same records as the Users tab`}
        action={can("createUser") && (
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="w-4 h-4 mr-2" />Invite User
          </Button>
        )}
      />

      <Card className="mb-6">
        <div className="py-3 px-4 flex flex-col gap-3 md:flex-row md:items-center">
          <StaffStatusFilter people={staff} value={statusTab} onChange={setStatusTab} />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or job title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-0 bg-transparent focus-visible:ring-0"
            />
          </div>
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </Card>

      {visible.length === 0 && !isLoading ? (
        <EmptyState
          icon={Users}
          title={staff.length === 0 ? "No people yet" : "No one in this filter"}
          description={staff.length === 0
            ? "People are added by inviting them from Settings & Admin → Users."
            : "Try another status filter or clear your search."}
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((s) => {
            const alerts = canViewHR ? complianceAlerts(s) : [];
            const initials = `${s.first_name?.[0] || ""}${s.last_name?.[0] || ""}`.toUpperCase();
            const colors = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-green-100 text-green-700", "bg-pink-100 text-pink-700", "bg-amber-100 text-amber-700", "bg-cyan-100 text-cyan-700", "bg-rose-100 text-rose-700"];
            const color = colors[(s.first_name?.charCodeAt(0) || 0) % colors.length];
            return (
              <EntityCard
                key={s.id}
                onClick={() => openProfile(s)}
                initials={initials}
                photoUrl={s.photo_url}
                colorClass={color}
                title={`${s.first_name} ${s.last_name}`}
                subtitle={s.role || "—"}
                badge={s.staff_type === "Probationary" && (
                  <Badge variant="outline" className="text-[10px] border-chart-4/30 bg-chart-4/10 text-chart-4">Probationary</Badge>
                )}
                footer={
                  <>
                    <StatusBadge status={personStatus(s)} />
                    {alerts.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-chart-4">
                        <AlertTriangle className="w-3 h-3" />{alerts.length}
                      </span>
                    )}
                    {canSeeOnboarding && onboardingState(s) !== "Complete" && (
                      <span className="text-[10px] text-muted-foreground">{onboardingState(s)}</span>
                    )}
                  </>
                }
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job title</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  {canViewHR && <TableHead className="hidden md:table-cell">Compliance</TableHead>}
                  {canSeeOnboarding && <TableHead className="hidden md:table-cell">Onboarding</TableHead>}
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((s) => {
                  const alerts = canViewHR ? complianceAlerts(s) : [];
                  return (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openProfile(s)}>
                      <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                      <TableCell className="text-sm">{s.role || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          {s.email && <span className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                          {s.phone && <span className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {s.staff_type === "Probationary" ? (
                          <Badge variant="outline" className="text-[10px] border-chart-4/30 bg-chart-4/10 text-chart-4">Probationary</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{s.employment_type || "—"}</span>
                        )}
                      </TableCell>
                      {canViewHR && (
                        <TableCell className="hidden md:table-cell">
                          {alerts.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-chart-4" />
                              <span className="text-xs text-chart-4">{alerts.length} missing</span>
                            </div>
                          ) : (
                            <span className="text-xs text-accent">✓ Complete</span>
                          )}
                        </TableCell>
                      )}
                      {canSeeOnboarding && (
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className={onboardingClass(onboardingState(s))}>
                            {onboardingState(s)}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell><StatusBadge status={personStatus(s)} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <InviteUserDialog open={showInvite} onOpenChange={setShowInvite} onInvited={() => queryClient.invalidateQueries({ queryKey: ["staff"] })} />

      {showDialog && editingStaff && (
        <StaffProfileDialog
          staff={editingStaff}
          onSave={handleSave}
          onClose={() => { setShowDialog(false); setEditingStaff(null); }}
          canAssign={canEditStaff}
          canViewHR={canViewHR}
          canEditHR={canEditHR}
          readOnly={!canEditStaff}
        />
      )}
    </div>
  );
}