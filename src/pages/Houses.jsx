import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useRole } from "@/hooks/useRole";
import { Home, Plus, Pencil, MapPin, Users } from "lucide-react";

const PROGRAM_TYPES = ["Residential", "Day Program", "Community Living", "Supported Living", "Other"];

const EMPTY_FORM = {
  name: "",
  address: "",
  program_type: "Residential",
  geofence_radius: 100,
  status: "Active",
  notes: "",
};

export default function Houses() {
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: houses = [], isLoading } = useQuery({
    queryKey: ["houses"],
    queryFn: async () => {
      const res = await base44.entities.House.filter({}, { sort: "name", limit: 200 });
      return res.items || [];
    },
  });

  const { data: clientCounts = {} } = useQuery({
    queryKey: ["house-client-counts"],
    queryFn: async () => {
      const res = await base44.entities.Client.filter({}, { limit: 500 });
      const counts = {};
      for (const c of res.items || []) {
        if (c.house_id) counts[c.house_id] = (counts[c.house_id] || 0) + 1;
      }
      return counts;
    },
    enabled: isAdmin,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (house) => {
    setEditing(house);
    setForm({
      name: house.name || "",
      address: house.address || "",
      program_type: house.program_type || "Residential",
      geofence_radius: house.geofence_radius ?? 100,
      status: house.status || "Active",
      notes: house.notes || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.House.update(editing.id, form);
        toast({ title: "House updated" });
      } else {
        await base44.entities.House.create(form);
        toast({ title: "House created" });
      }
      queryClient.invalidateQueries({ queryKey: ["houses"] });
      queryClient.invalidateQueries({ queryKey: ["house-client-counts"] });
      setShowForm(false);
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (house) => {
    if (!confirm(`Delete "${house.name}"? This will not delete the clients in it.`)) return;
    try {
      await base44.entities.House.delete(house.id);
      toast({ title: "House deleted" });
      queryClient.invalidateQueries({ queryKey: ["houses"] });
    } catch (err) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Houses & Locations"
        subtitle="Manage residential homes, day programs, and service locations"
        action={isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />Add House
          </Button>
        )}
      />

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Program Type</TableHead>
                <TableHead>Clients</TableHead>
                <TableHead>Geofence</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8 text-sm">Loading...</TableCell>
                </TableRow>
              ) : houses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8 text-sm">
                    No houses yet. {isAdmin && "Click \"Add House\" to create one."}
                  </TableCell>
                </TableRow>
              ) : (
                houses.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <Home className="w-3.5 h-3.5 text-muted-foreground" />
                        {h.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {h.address ? (
                        <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{h.address}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">{h.program_type || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {isAdmin ? (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3 text-muted-foreground" />{clientCounts[h.id] || 0}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.geofence_radius ? `${h.geofence_radius}m` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={h.status === "Active" ? "text-green-600 border-green-500/20 bg-green-500/10" : "text-muted-foreground"}>
                        {h.status || "Active"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openEdit(h)}>
                            <Pencil className="w-3 h-3 mr-1" />Edit
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(h)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Home className="w-5 h-5" />{editing ? "Edit House" : "Add House"}</DialogTitle>
            <DialogDescription>{editing ? "Update house details." : "Create a new house or service location."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>House Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Maple Street Home" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City, ST" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Program Type</Label>
                <Select value={form.program_type} onValueChange={(v) => setForm({ ...form, program_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROGRAM_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Geofence Radius (m)</Label>
                <Input type="number" value={form.geofence_radius} onChange={(e) => setForm({ ...form, geofence_radius: parseInt(e.target.value) || 100 })} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}