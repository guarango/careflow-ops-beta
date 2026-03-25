import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Plus, Trash2, Upload, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function WizardStep7Staff({ data, onNext, onBack }) {
  const { toast } = useToast();
  const [invites, setInvites] = useState([{ email: "", role: "dsp", first_name: "", last_name: "" }]);
  const [sending, setSending] = useState(false);

  const addRow = () => setInvites(p => [...p, { email: "", role: "dsp", first_name: "", last_name: "" }]);
  const removeRow = (i) => setInvites(p => p.filter((_, idx) => idx !== i));
  const updateRow = (i, key, val) => setInvites(p => p.map((r, idx) => idx === i ? { ...r, [key]: val } : r));

  const handleCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          staff: {
            type: "array",
            items: { type: "object", properties: { email: { type: "string" }, first_name: { type: "string" }, last_name: { type: "string" }, role: { type: "string" } } }
          }
        }
      }
    });
    if (result.status === "success" && result.output?.staff?.length) {
      setInvites(result.output.staff);
      toast({ title: `${result.output.staff.length} staff loaded from CSV` });
    }
  };

  const sendInvites = async () => {
    const valid = invites.filter(i => i.email);
    if (!valid.length) return;
    setSending(true);
    for (const inv of valid) {
      await base44.entities.StaffMember.create({ first_name: inv.first_name || "", last_name: inv.last_name || "", email: inv.email, role: inv.role === "admin" ? "Admin" : inv.role === "hr" ? "Supervisor" : "DSP", status: "Active" });
    }
    setSending(false);
    toast({ title: `${valid.length} staff invitation(s) sent` });
    onNext({ staff_invited: valid.length });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Invite Staff</h2>
      <p className="text-muted-foreground mb-6">Add your team. You can also import from a CSV or skip and add staff later.</p>

      <div className="flex items-center gap-2 mb-4">
        <label className="flex items-center gap-2 px-3 py-2 border border-input rounded-md text-sm cursor-pointer hover:bg-muted/50 transition-colors">
          <Upload className="w-4 h-4" /> Import from CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleCSV} />
        </label>
        <span className="text-xs text-muted-foreground">or enter manually below</span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="grid grid-cols-12 gap-2 px-2 text-xs font-semibold text-muted-foreground">
          <div className="col-span-3">First Name</div>
          <div className="col-span-3">Last Name</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-1">Role</div>
          <div className="col-span-1"></div>
        </div>
        {invites.map((inv, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-3"><Input placeholder="Jane" value={inv.first_name} onChange={e => updateRow(i, "first_name", e.target.value)} /></div>
            <div className="col-span-3"><Input placeholder="Doe" value={inv.last_name} onChange={e => updateRow(i, "last_name", e.target.value)} /></div>
            <div className="col-span-4"><Input type="email" placeholder="jane@agency.com" value={inv.email} onChange={e => updateRow(i, "email", e.target.value)} /></div>
            <div className="col-span-1">
              <Select value={inv.role} onValueChange={v => updateRow(i, "role", v)}>
                <SelectTrigger className="text-xs px-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dsp">DSP</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 flex justify-center">
              {invites.length > 1 && <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addRow} className="gap-2 mt-2"><Plus className="w-4 h-4" /> Add Row</Button>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onNext({ staff_invited: 0 })}>Skip for now</Button>
          <Button onClick={sendInvites} disabled={sending || !invites.some(i => i.email)} className="gap-2">
            <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send Invites & Finish"}
          </Button>
        </div>
      </div>
    </div>
  );
}