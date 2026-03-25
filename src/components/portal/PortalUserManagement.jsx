import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Mail, Shield, Edit, ToggleLeft, ExternalLink, Key } from "lucide-react";

const roles = ["Guardian", "Client", "Case Manager"];
const accessLevels = ["Full", "Schedule Only", "Goals Only", "Read Only"];
const emptyUser = {
  full_name: "", email: "", portal_role: "Guardian", relationship: "",
  client_id: "", client_name: "", is_active: true, messaging_enabled: true,
  access_level: "Full", session_timeout_minutes: 30,
};

const roleColors = {
  Guardian: "bg-violet-100 text-violet-700",
  Client: "bg-sky-100 text-sky-700",
  "Case Manager": "bg-emerald-100 text-emerald-700",
};

export default function PortalUserManagement() {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [search, setSearch] = useState("");
  const [inviteSent, setInviteSent] = useState({});
  const queryClient = useQueryClient();

  const { data: portalUsers = [] } = useQuery({
    queryKey: ["portal-users"],
    queryFn: () => base44.entities.PortalUser.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const createUser = useMutation({
    mutationFn: (data) => base44.entities.PortalUser.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["portal-users"] }); closeDialog(); },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PortalUser.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["portal-users"] }); closeDialog(); },
  });

  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(emptyUser); };

  const openNew = () => { setForm(emptyUser); setEditing(null); setShowDialog(true); };
  const openEdit = (u) => { setForm(u); setEditing(u); setShowDialog(true); };

  const handleClientSelect = (clientId) => {
    const c = clients.find(x => x.id === clientId);
    setForm({ ...form, client_id: clientId, client_name: c ? `${c.first_name} ${c.last_name}` : "" });
  };

  const handleSave = () => {
    const data = { ...form };
    if (editing) updateUser.mutate({ id: editing.id, data });
    else createUser.mutate(data);
  };

  const handleToggle = (user) => {
    updateUser.mutate({ id: user.id, data: { is_active: !user.is_active } });
  };

  const handleSendInvite = (user) => {
    updateUser.mutate({ id: user.id, data: { invite_sent: true, invite_sent_at: new Date().toISOString() } });
    setInviteSent(prev => ({ ...prev, [user.id]: true }));
  };

  const filtered = portalUsers.filter(u =>
    `${u.full_name} ${u.email} ${u.client_name} ${u.portal_role}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Portal User Management</h3>
          <p className="text-sm text-slate-500">Manage guardian, client, and case manager access to the family portal</p>
        </div>
        <div className="flex gap-2">
          <a href="/portal" target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-sky-200 text-sky-700 text-sm hover:bg-sky-50 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />Preview Portal
          </a>
          <Button onClick={openNew} className="gap-1.5"><Plus className="w-4 h-4" />Add Portal User</Button>
        </div>
      </div>

      <div className="relative">
        <Input placeholder="Search portal users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-4" />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 text-sm mb-3">No portal users yet</p>
            <Button onClick={openNew} size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Add First Portal User</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Access</TableHead>
                  <TableHead className="hidden md:table-cell">Messaging</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm text-slate-800">{u.full_name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={roleColors[u.portal_role]}>{u.portal_role}</Badge></TableCell>
                    <TableCell className="text-sm text-slate-600">{u.client_name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-500">{u.access_level}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={`text-xs ${u.messaging_enabled ? "text-emerald-600" : "text-slate-400"}`}>
                        {u.messaging_enabled ? "Enabled" : "Disabled"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)} className="h-7 w-7 p-0">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleToggle(u)}
                          className={`h-7 w-7 p-0 ${u.is_active ? "text-amber-500" : "text-emerald-500"}`}
                          title={u.is_active ? "Deactivate" : "Activate"}>
                          <ToggleLeft className="w-3.5 h-3.5" />
                        </Button>
                        {!u.invite_sent && !inviteSent[u.id] ? (
                          <Button size="sm" variant="ghost" onClick={() => handleSendInvite(u)}
                            className="h-7 px-2 text-sky-600 text-xs">
                            <Mail className="w-3 h-3 mr-1" />Invite
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 px-1">Invited</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Portal User" : "Add Portal User"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Full Name *</Label><Input className="mt-1" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Sandra Rivera" /></div>
            <div className="col-span-2"><Label>Email Address *</Label><Input className="mt-1" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="sandra@example.com" /></div>
            <div>
              <Label>Portal Role *</Label>
              <Select value={form.portal_role} onValueChange={v => setForm({...form, portal_role: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Relationship</Label><Input className="mt-1" value={form.relationship} onChange={e => setForm({...form, relationship: e.target.value})} placeholder="Mother, Guardian, etc." /></div>
            <div className="col-span-2">
              <Label>Assigned Client *</Label>
              <Select value={form.client_id} onValueChange={handleClientSelect}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Access Level</Label>
              <Select value={form.access_level} onValueChange={v => setForm({...form, access_level: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{accessLevels.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Session Timeout (min)</Label><Input className="mt-1" type="number" value={form.session_timeout_minutes} onChange={e => setForm({...form, session_timeout_minutes: parseInt(e.target.value) || 30})} /></div>
            <div className="flex items-center justify-between col-span-2 p-3 bg-slate-50 rounded-lg">
              <div><p className="text-sm font-medium text-slate-700">Messaging Enabled</p><p className="text-xs text-slate-500">Allow secure messaging with supervisors</p></div>
              <Switch checked={form.messaging_enabled} onCheckedChange={v => setForm({...form, messaging_enabled: v})} />
            </div>
            <div className="flex items-center justify-between col-span-2 p-3 bg-slate-50 rounded-lg">
              <div><p className="text-sm font-medium text-slate-700">Portal Access Active</p><p className="text-xs text-slate-500">Disable to immediately revoke access</p></div>
              <Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.full_name || !form.email || !form.client_id}>{editing ? "Update" : "Create User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}