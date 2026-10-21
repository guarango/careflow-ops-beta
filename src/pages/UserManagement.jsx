import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserCog, Plus, Mail, ShieldCheck, Users, Briefcase, Crown, Eye, LogIn, Lock, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRole } from "@/hooks/useRole";
import { useImpersonation } from "@/lib/ImpersonationContext";
import { getRoleLabel, getRoleBadgeColor, ROLE_DESCRIPTIONS } from "@/lib/permissions";

const ROLE_CARDS = [
  { key: "dsp",         icon: Users,       color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { key: "manager",     icon: Briefcase,   color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  { key: "admin",       icon: ShieldCheck, color: "bg-primary/10 text-primary border-primary/20" },
  { key: "super_admin", icon: Crown,       color: "bg-destructive/10 text-destructive border-destructive/20" },
];

export default function UserManagement() {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("dsp");
  const [hrBundle, setHrBundle] = useState(false);
  const [billingBundle, setBillingBundle] = useState(false);
  const [loading, setLoading] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useRole();
  const { loginAs } = useImpersonation();

  const { data: usersData, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await base44.functions.invoke("manageUsers", { action: "list" });
      return res.data;
    },
  });
  const users = usersData?.users || [];

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("manageUsers", {
        action: "invite",
        email: inviteEmail,
        role: inviteRole,
        hrBundle: inviteRole === "admin" ? hrBundle : false,
        billingBundle: inviteRole === "admin" ? billingBundle : false,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Invitation sent", description: `${inviteEmail} has been invited as ${getRoleLabel(inviteRole)}.` });
      setInviteEmail("");
      setInviteRole("dsp");
      setHrBundle(false);
      setBillingBundle(false);
      setShowInvite(false);
      refetch();
    } catch (err) {
      toast({ title: "Invite failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginAs = async (targetUser) => {
    setImpersonating(true);
    try {
      await loginAs(targetUser.id);
      toast({ title: "Login As active", description: `You are now viewing as ${targetUser.full_name || targetUser.email}.` });
      window.location.href = "/";
    } catch (err) {
      toast({ title: "Login As failed", description: err.message, variant: "destructive" });
    } finally {
      setImpersonating(false);
    }
  };

  const effectiveRole = (u) => u.is_super_admin ? "super_admin" : u.role;

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage platform access for DSP, Manager, Admin, and Super Admin users"
        action={isSuperAdmin && (
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="w-4 h-4 mr-2" />Invite User
          </Button>
        )}
      />

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {ROLE_CARDS.map(({ key, icon: Icon, color }) => {
          const count = users.filter(u => effectiveRole(u) === key).length;
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{getRoleLabel(key)}</p>
                  <Badge variant="outline" className={`text-[10px] border ${color}`}>{count} user{count !== 1 ? "s" : ""}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{ROLE_DESCRIPTIONS[key]}</p>
            </Card>
          );
        })}
      </div>

      {/* Bundle explanation */}
      <div className="mb-6 p-4 bg-muted rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Permission Bundles:</strong> Admins can optionally enable the <strong>HR bundle</strong> (staff HR files, onboarding, e-signature templates, trainings, staff compliance) and/or <strong>Billing bundle</strong> (service code rates, authorizations, unit tracking, payroll export, billing export, EVV export). An Admin without a bundle cannot open those areas.
        </p>
      </div>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Bundles</TableHead>
                <TableHead>Joined</TableHead>
                {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => {
                const role = effectiveRole(u);
                const cfg = getRoleBadgeColor(role);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-sm">
                      <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{u.email}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] border ${cfg}`}>{getRoleLabel(role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {role === "admin" && (
                          <>
                            {u.hr_bundle && <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20">HR</Badge>}
                            {u.billing_bundle && <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">Billing</Badge>}
                            {!u.hr_bundle && !u.billing_bundle && <span className="text-xs text-muted-foreground">—</span>}
                          </>
                        )}
                        {role !== "admin" && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}</TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        {role !== "super_admin" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={impersonating}
                            onClick={() => handleLoginAs(u)}
                          >
                            <LogIn className="w-3 h-3 mr-1" />
                            Login As
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center text-muted-foreground py-8 text-sm">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Auth notes */}
      <div className="mt-4 space-y-3">
        <div className="p-4 bg-muted rounded-lg flex items-start gap-2">
          <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <strong>Email Login:</strong> All users log in via email-based authentication. Invite users by email and they'll receive a secure link to set up their account.
          </p>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <Lock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            <strong>MFA Required in Production:</strong> Manager, Admin, and Super Admin accounts must use multi-factor authentication. This is enforced at the platform authentication layer.
          </p>
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCog className="w-5 h-5" />Invite User</DialogTitle>
            <DialogDescription>Send an email invitation with a role assignment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => { setInviteRole(v); setHrBundle(false); setBillingBundle(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dsp">DSP — Assigned clients only</SelectItem>
                  <SelectItem value="manager">Manager — Oversees clients & staff</SelectItem>
                  <SelectItem value="admin">Admin — Full agency access</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">{ROLE_DESCRIPTIONS[inviteRole]}</p>
            </div>

            {/* Bundle checkboxes — only for Admin */}
            {inviteRole === "admin" && (
              <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permission Bundles (optional)</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={hrBundle} onCheckedChange={(v) => setHrBundle(!!v)} />
                  <span className="text-sm">HR bundle — staff files, onboarding, trainings, compliance</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={billingBundle} onCheckedChange={(v) => setBillingBundle(!!v)} />
                  <span className="text-sm">Billing bundle — rates, authorizations, payroll/billing/EVV export</span>
                </label>
                <p className="text-[11px] text-muted-foreground">An Admin without bundles cannot open HR or Billing areas.</p>
              </div>
            )}

            {/* Assignment note for DSP/Manager */}
            {(inviteRole === "dsp" || inviteRole === "manager") && (
              <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Client and house assignment for {getRoleLabel(inviteRole)} users will be configured in the next step after the invitation is accepted.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail || loading}>
              {loading ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}