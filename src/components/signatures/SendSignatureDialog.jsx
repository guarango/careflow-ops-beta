import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export default function SendSignatureDialog({ open, onClose, templates, packets, staff, onSend }) {
  const { toast } = useToast();
  const [sendType, setSendType] = useState("template"); // template | packet
  const [templateId, setTemplateId] = useState("");
  const [packetId, setPacketId] = useState("");
  const [recipientType, setRecipientType] = useState("individual"); // individual | group | role
  const [staffId, setStaffId] = useState("");
  const [role, setRole] = useState("");
  const [dueDays, setDueDays] = useState(7);
  const [notes, setNotes] = useState("");

  const reset = () => {
    setSendType("template"); setTemplateId(""); setPacketId("");
    setRecipientType("individual"); setStaffId(""); setRole("");
    setDueDays(7); setNotes("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSend = () => {
    if (sendType === "template" && !templateId) { toast({ title: "Select a template", variant: "destructive" }); return; }
    if (sendType === "packet" && !packetId) { toast({ title: "Select a packet", variant: "destructive" }); return; }
    if (recipientType === "individual" && !staffId) { toast({ title: "Select a staff member", variant: "destructive" }); return; }
    if (recipientType === "role" && !role) { toast({ title: "Select a role", variant: "destructive" }); return; }

    const dueDate = format(new Date(Date.now() + dueDays * 86400000), "yyyy-MM-dd");

    let recipients = [];
    if (recipientType === "individual") {
      const s = staff.find(st => st.id === staffId);
      recipients = [{ staff_id: s.id, staff_name: `${s.first_name} ${s.last_name}`, staff_email: s.email || "", staff_role: s.role || "" }];
    } else if (recipientType === "role") {
      recipients = staff.filter(s => s.role === role && s.status === "Active").map(s => ({
        staff_id: s.id, staff_name: `${s.first_name} ${s.last_name}`, staff_email: s.email || "", staff_role: s.role || ""
      }));
    } else {
      // group = all active staff
      recipients = staff.filter(s => s.status === "Active").map(s => ({
        staff_id: s.id, staff_name: `${s.first_name} ${s.last_name}`, staff_email: s.email || "", staff_role: s.role || ""
      }));
    }

    if (recipients.length === 0) { toast({ title: "No recipients found", variant: "destructive" }); return; }

    const selected = sendType === "template"
      ? templates.find(t => t.id === templateId)
      : null;
    const selectedPacket = sendType === "packet"
      ? packets.find(p => p.id === packetId)
      : null;

    const payload = {
      sendType,
      template: selected,
      packet: selectedPacket,
      recipients,
      dueDate,
      notes,
    };

    onSend(payload);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send for Signature</DialogTitle>
          <DialogDescription>Send a template or packet to staff with a due date.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Send Type</Label>
            <Select value={sendType} onValueChange={setSendType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="template">Single Template</SelectItem>
                <SelectItem value="packet">Packet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sendType === "template" ? (
            <div>
              <Label>Template *</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Packet *</Label>
              <Select value={packetId} onValueChange={setPacketId}>
                <SelectTrigger><SelectValue placeholder="Select packet" /></SelectTrigger>
                <SelectContent>
                  {packets.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Recipients</Label>
            <Select value={recipientType} onValueChange={setRecipientType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual Employee</SelectItem>
                <SelectItem value="role">All Staff with Role</SelectItem>
                <SelectItem value="group">All Active Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recipientType === "individual" && (
            <div>
              <Label>Employee *</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {recipientType === "role" && (
            <div>
              <Label>Role *</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {["DSP", "Nurse", "QIDP", "Supervisor", "Admin", "Behavioral Specialist", "Other"].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Due In (days)</Label>
            <Input type="number" value={dueDays} onChange={(e) => setDueDays(parseInt(e.target.value) || 7)} min={1} />
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Message to recipients" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSend}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}