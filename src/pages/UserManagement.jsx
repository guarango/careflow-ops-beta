import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, ShieldCheck, Users, Briefcase, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRole } from "@/hooks/useRole";
import { ROLE_DESCRIPTIONS } from "@/lib/permissions";
import StatusBadge from "@/components/shared/StatusBadge";
import StaffStatusFilter from "@/components/shared/StaffStatusFilter";
import StaffProfileDialog from "@/components/staff/StaffProfileDialog";
import EditUserDialog from "@/components/users/EditUserDialog";
import UserActionsMenu from "@/components/users/UserActionsMenu";
import InviteUserDialog from "@/components/users/InviteUserDialog";
import { DEFAULT_STATUS_TAB, peopleInTab, matchesSearch, ACCESS_LABELS, personStatus } from "@/lib/staffFilters";

const ROLE_CARDS = [
  { key: "dsp", icon: Users, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { key: "manager", icon: Briefcase, color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  { key: "admin", icon: ShieldCheck, color: "bg-primary/10 text-primary border-primary/20" },
];

/**
 * Users = the access view of every person (the same StaffMember records the Staff page shows).
 * Every access change goes through setStaffAccess; nobody is ever deleted.
 */
export default function UserManagement() {
  const { can } = useRole();
  const canEditUser = can("editUser");
  const canViewHR = can("viewStaffHRFiles");
  const canEditHR = can("editStaff");
  const canEditStaffProfile = canEditHR || can("editStaffDirectory");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showInvite, setShowInvite] = useState(false);
  const [editPerson, setEditPerson] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [statusTab, setStatusTab] = useState(DEFAULT_STATUS_TAB);
  const [search, setSearch] = useState("");
  const [profileStaff, setProfileStaff] = useState(null);

  const { data: rows = [], refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await base44.functions.invoke("manageUsers", { action: "list" });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data.rows || [];
    },
  });

  const { data: staffRecords = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const refreshAll = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["staff"] });
  };

  const callAccess = async (payload) => {
    const res = await base44.functions.invoke("setStaffAccess", payload);
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  };

  const visible = peopleInTab(rows, statusTab).filter((r) => matchesSearch(r, search));

  const openProfile = (row) => {
    const record = staffRecords.find((s) => s.id === row.staffId);
    if (record) setProfileStaff(record);
  };

  const saveProfile = async (formData) => {
    const { app_access, hr_bundle, billing_bundle, status, invited_by, invited_at, activated_at, deactivated_at, deactivated_by, deactivation_reason, ...profile } = formData;
    await base44.entities.StaffMember.update(formData.id, profile);
    setProfileStaff(null);
    refreshAll();
  };

  const handleSaveAccess = async ({ staffId, app_access, hr_bundle, billing_bundle }) => {
    setSavingUser(true);
    try {
      await callAccess({ staffId, app_access, hr_bundle, billing_bundle });
      toast({ title: "Access updated", description: "Saved and applied to their login." });
      setShowEdit(false);
      setEditPerson(null);
      refreshAll();
    } catch (err) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingUser(false);
    }
  };

  const handleResetPassword = async (person) => {
    try {
      const res = await base44.functions.invoke("manageUsers", { action: "reset_password", email: person.email });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Reset email sent", description: `A password reset link was sent to ${person.email}.` });
    } catch (err) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDeactivate = async (person, reason) => {
    try {
      await callAccess({ staffId: person.staffId, action: "deactivate", reason });
      toast({ title: "Deactivated", description: `${person.name} can no longer sign in. Their history is kept.` });
      refreshAll();
    } catch (err) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  const handleReactivate = async (person) => {
    try {
      await callAccess({ staffId: person.staffId, action: "reactivate" });
      toast({ title: "Reactivated", description: `${person.name} can sign in again.` });
      refreshAll();
    } catch (err) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  const handleResendInvite = async (person) => {
    try {
      const res = await base44.functions.invoke("manageUsers", { action: "resend_invite", staffId: person.staffId });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Invite resent", description: `A new invite was emailed to ${person.email}.` });
      refreshAll();
    } catch (err) {
      toast({ title: "Resend failed", description: err.message, variant: "destructive" });
    }
  };

  const handleCancelInvite = async (person) => {
    try {
      await callAccess({ staffId: person.staffId, action: "cancel_invite" });
      toast({ title: "Invite cancelled", description: `${person.name}'s pending invite was removed.` });
      refreshAll();
    } catch (err) {
      toast({ title: "Cancel failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Users</h2>
          <p className="text-sm text-muted-foreground">Everyone in the agency — one staff record and one login each. This is the access view.</p>
        </div>
        {can("createUser") && (
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="w-4 h-4 mr-2" />Invite User
          </Button>
        )}
      </div>

      {/* Role cards — DSP, Manager, Admin only */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {ROLE_CARDS.map(({ key, icon: Icon, color }) => {
          const count = visible.filter((p) => p.app_access === key).length;
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{ACCESS_LABELS[key]}</p>
                  <Badge variant="outline" className={`text-[10px] border ${color}`}>{count} {count === 1 ? "person" : "people"}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{ROLE_DESCRIPTIONS[key]}</p>
            </Card>
          );
        })}
      </div>

      <div className="mb-4 p-4 bg-muted rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Job title is HR information only</strong> — it never grants access. <strong>App access</strong> and the optional
          <strong> HR</strong> / <strong>Billing</strong> bundles (Admins only) decide what the person can open. App access changes every time through one audited path.
        </p>
      </div>

      <Card className="mb-4">
        <div className="py-3 px-4 flex flex-col gap-3 md:flex-row md:items-center">
          <StaffStatusFilter people={rows} value={statusTab} onChange={setStatusTab} />
          <div className="relative flex-1">
            <Input
              placeholder="Search by name, email, or job title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table className="min-w-[950px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Job title</TableHead>
                <TableHead>App access</TableHead>
                <TableHead>Bundles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                {canEditUser && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((p) => (
                <TableRow key={p.staffId}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => openProfile(p)}
                      className="font-medium text-left hover:text-primary hover:underline"
                    >
                      {p.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{p.email || "—"}</span>
                  </TableCell>
                  <TableCell className="text-sm">{p.job_title || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px]">{ACCESS_LABELS[p.app_access] || p.app_access}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {p.app_access === "admin" ? (
                        <>
                          {p.hr_bundle && <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20">HR</Badge>}
                          {p.billing_bundle && <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">Billing</Badge>}
                          {!p.hr_bundle && !p.billing_bundle && <span className="text-xs text-muted-foreground">—</span>}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={personStatus(p)} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.status === "Pending"
                      ? (p.invited_at ? `Invited ${new Date(p.invited_at).toLocaleDateString()}` : "Invited")
                      : (p.last_login ? new Date(p.last_login).toLocaleDateString() : "—")}
                  </TableCell>
                  {canEditUser && (
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        <UserActionsMenu
                          person={p}
                          canEdit={canEditUser}
                          onEdit={(person) => { setEditPerson(person); setShowEdit(true); }}
                          onResetPassword={handleResetPassword}
                          onDeactivate={handleDeactivate}
                          onReactivate={handleReactivate}
                          onResendInvite={handleResendInvite}
                          onCancelInvite={handleCancelInvite}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canEditUser ? 8 : 7} className="text-center text-muted-foreground py-8 text-sm">
                    {rows.length === 0 ? "No people yet — invite someone to get started." : "No one in this filter."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* One invite form for the whole app (also used on the Staff page) */}
      <InviteUserDialog open={showInvite} onOpenChange={setShowInvite} onInvited={refreshAll} />

      <EditUserDialog
        person={editPerson}
        open={showEdit}
        onOpenChange={(v) => { setShowEdit(v); if (!v) setEditPerson(null); }}
        onSave={handleSaveAccess}
        loading={savingUser}
      />

      {profileStaff && (
        <StaffProfileDialog
          staff={profileStaff}
          onSave={saveProfile}
          onClose={() => setProfileStaff(null)}
          canAssign={canEditStaffProfile}
          canViewHR={canViewHR}
          canEditHR={canEditHR}
          readOnly={!canEditStaffProfile}
        />
      )}
    </div>
  );
}