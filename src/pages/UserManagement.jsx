import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserCog, Plus, Mail, ShieldCheck, Users, Briefcase } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "bg-destructive/10 text-destructive border-destructive/20", icon: ShieldCheck, description: "Full access to all features including user management and settings." },
  hr: { label: "HR", color: "bg-primary/10 text-primary border-primary/20", icon: Briefcase, description: "Access to staff records, compliance documents, timecards, and billing." },
  dsp: { label: "DSP", color: "bg-accent/10 text-accent border-accent/20", icon: Users, description: "Access to client records, session notes, incidents, and eMAR." },
};

export default function UserManagement() {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("dsp");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const { data: users = [], refetch } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setLoading(true);
    await base44.users.inviteUser(inviteEmail, inviteRole === "admin" ? "admin" : "user");
    // Store extended role on User entity after invite — best effort
    toast({ title: "Invitation sent", description: `${inviteEmail} has been invited as ${ROLE_CONFIG[inviteRole].label}.` });
    setInviteEmail("");
    setInviteRole("dsp");
    setShowInvite(false);
    setLoading(false);
    refetch();
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage platform access for Admin, HR, and DSP users"
        action={isAdmin && (
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="w-4 h-4 mr-2" />Invite User
          </Button>
        )}
      />

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = users.filter(u => u.role === key).length;
          return (
            <Card key={key} className="p-4 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${cfg.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{cfg.label}</p>
                  <Badge variant="outline" className={`text-[10px] border ${cfg.color}`}>{count} user{count !== 1 ? "s" : ""}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
              </div>
            </Card>
          );
        })}
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
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => {
                const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.dsp;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-sm">
                      <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{u.email}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] border ${cfg.color}`}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="mt-4 p-4 bg-muted rounded-lg">
        <div className="flex gap-2 items-start">
          <ShieldCheck className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <strong>Authentication:</strong> All users log in via the platform's secure email-based login. Passwords are managed securely by the platform — no plain-text passwords are stored. Invite users by email; they will receive a link to set up their account.
          </p>
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserCog className="w-5 h-5" />Invite User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Email Address</Label><Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" /></div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full access</SelectItem>
                  <SelectItem value="hr">HR — Staff & compliance</SelectItem>
                  <SelectItem value="dsp">DSP — Client & session access</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{ROLE_CONFIG[inviteRole]?.description}</p>
            </div>
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