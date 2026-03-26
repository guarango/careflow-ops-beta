import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import StaffProfileDialog from "@/components/staff/StaffProfileDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Search, Phone, Mail, AlertTriangle, LayoutGrid, List } from "lucide-react";
import { useRole } from "@/hooks/useRole";

const emptyStaff = {
  first_name: "", last_name: "", email: "", phone: "", role: "DSP", status: "Active",
  staff_type: "Regular", hire_date: "", notes: "", certifications: [], references: [],
  contract_areas: []
};

function complianceAlerts(s) {
  const alerts = [];
  if (!s.background_check_status || s.background_check_status === "Expired") alerts.push("BG Check");
  if (!s.i9_verified) alerts.push("I-9");
  if (!s.drug_screen_status || s.drug_screen_status === "Expired") alerts.push("Drug Screen");
  if (!s.tb_test_result || s.tb_test_result === "Pending") alerts.push("TB Test");
  return alerts;
}

export default function Staff() {
  const { isAdmin } = useRole();
  const [showDialog, setShowDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  const queryClient = useQueryClient();
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffMember.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["staff"] }); setShowDialog(false); setEditingStaff(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffMember.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["staff"] }); setShowDialog(false); setEditingStaff(null); },
  });

  const openNew = () => { setEditingStaff({ ...emptyStaff }); setShowDialog(true); };
  const openEdit = (s) => { setEditingStaff(s); setShowDialog(true); };

  const handleSave = (formData) => {
    if (formData.id) updateMutation.mutate({ id: formData.id, data: formData });
    else createMutation.mutate(formData);
  };

  const filtered = staff.filter(s =>
    `${s.first_name} ${s.last_name} ${s.email} ${s.role}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Staff Management"
        subtitle={`${staff.length} team members`}
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add Staff</Button>}
      />

      <Card className="mb-6">
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search staff by name, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-0 bg-transparent focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center gap-1 border border-border rounded-lg p-1">
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Users} title="No staff members" description="Add your first staff member to get started." action={<Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Staff</Button>} />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((s) => {
            const alerts = complianceAlerts(s);
            const initials = `${s.first_name?.[0] || ""}${s.last_name?.[0] || ""}`.toUpperCase();
            const colors = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-green-100 text-green-700", "bg-pink-100 text-pink-700", "bg-amber-100 text-amber-700", "bg-cyan-100 text-cyan-700", "bg-rose-100 text-rose-700"];
            const color = colors[(s.first_name?.charCodeAt(0) || 0) % colors.length];
            return (
              <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(s)}>
                <CardContent className="p-0">
                  <div className="bg-muted/40 flex items-center justify-center h-32 rounded-t-xl">
                    {s.photo_url
                      ? <img src={s.photo_url} alt={`${s.first_name} ${s.last_name}`} className="w-20 h-20 rounded-full object-cover" />
                      : <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${color}`}>{initials}</div>
                    }
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-foreground text-sm truncate">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.role}</p>
                    <div className="flex items-center justify-between mt-2">
                      <StatusBadge status={s.status || "Active"} />
                      {alerts.length > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-chart-4">
                          <AlertTriangle className="w-3 h-3" />{alerts.length}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Compliance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const alerts = complianceAlerts(s);
                  return (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(s)}>
                      <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                      <TableCell className="text-sm">{s.role}</TableCell>
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
                      <TableCell><StatusBadge status={s.status || "Active"} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {showDialog && editingStaff && (
        <StaffProfileDialog
          staff={editingStaff}
          onSave={handleSave}
          onClose={() => { setShowDialog(false); setEditingStaff(null); }}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}