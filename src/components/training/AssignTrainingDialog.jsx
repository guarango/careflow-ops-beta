import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";

export default function AssignTrainingDialog({ training, open, onClose }) {
  const queryClient = useQueryClient();
  const [assignTo, setAssignTo] = useState("person");
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedHouse, setSelectedHouse] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data: staffList = [] } = useQuery({
    queryKey: ["all-staff"],
    queryFn: () => base44.entities.StaffMember.filter({ status: "Active" }),
    enabled: open,
  });
  const staffRecords = staffList.items || staffList;

  const { data: houses = [] } = useQuery({
    queryKey: ["houses-list"],
    queryFn: () => base44.entities.House.filter({ status: "Active" }),
    enabled: open,
  });
  const houseRecords = houses.items || houses;

  const assign = useMutation({
    mutationFn: async (assignments) => {
      return base44.entities.TrainingAssignment.bulkCreate(assignments);
    },
    onSuccess: (_, assignments) => {
      queryClient.invalidateQueries({ queryKey: ["training-assignments"] });
      toast.success(`Training assigned to ${assignments.length} staff`);
      onClose();
      setSelectedStaff([]);
      setSelectedRole("");
      setSelectedHouse("");
      setDueDate("");
    },
  });

  if (!training) return null;

  const handleAssign = () => {
    let targets = [];
    if (assignTo === "person") {
      targets = staffRecords.filter(s => selectedStaff.includes(s.id));
    } else if (assignTo === "role") {
      targets = staffRecords.filter(s => s.role === selectedRole);
    } else if (assignTo === "house") {
      targets = staffRecords.filter(s => s.assigned_house_ids?.includes(selectedHouse));
    } else if (assignTo === "all") {
      targets = staffRecords;
    }

    const assignments = targets.map(s => ({
      training_id: training.id,
      training_title: training.title,
      training_version: training.version || 1,
      staff_id: s.id,
      staff_name: `${s.first_name} ${s.last_name}`,
      assigned_by_name: "",
      assigned_at: new Date().toISOString(),
      due_date: dueDate || undefined,
      assignment_type: "manual",
      role: s.role,
      house_id: selectedHouse || undefined,
      status: "Assigned",
      hours_awarded: training.training_hours || 0,
    }));

    if (assignments.length === 0) {
      toast.error("No staff selected");
      return;
    }
    assign.mutate(assignments);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign: {training.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Assign to</Label>
            <Select value={assignTo} onValueChange={v => { setAssignTo(v); setSelectedStaff([]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="person">Specific people</SelectItem>
                <SelectItem value="role">By role</SelectItem>
                <SelectItem value="house">By house</SelectItem>
                <SelectItem value="all">All active staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assignTo === "person" && (
            <div className="space-y-1 max-h-48 overflow-y-auto border rounded p-2">
              {staffRecords.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer hover:bg-accent/50 rounded px-1">
                  <input type="checkbox" checked={selectedStaff.includes(s.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedStaff([...selectedStaff, s.id]);
                      else setSelectedStaff(selectedStaff.filter(id => id !== s.id));
                    }}
                    className="rounded" />
                  {s.first_name} {s.last_name} <span className="text-xs text-muted-foreground">({s.role})</span>
                </label>
              ))}
            </div>
          )}

          {assignTo === "role" && (
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {["DSP", "Nurse", "QIDP", "Supervisor", "Admin", "Behavioral Specialist"].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {assignTo === "house" && (
            <div className="space-y-1">
              <Label>House</Label>
              <Select value={selectedHouse} onValueChange={setSelectedHouse}>
                <SelectTrigger><SelectValue placeholder="Select house" /></SelectTrigger>
                <SelectContent>
                  {houseRecords.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Due date (optional)</Label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={assign.isPending}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}