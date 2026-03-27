import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Users, UserX } from "lucide-react";
import { calcNetworkRatio } from "@/lib/qolEngine";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

const REL_TYPES = ["Family", "Friend", "Neighbor", "Coworker", "Community Member", "Paid Support", "Professional"];
const FREQ_OPTS = ["Daily", "Weekly", "Monthly", "A few times a year", "Rarely"];
const REL_COLORS = {
  "Family": "bg-rose-100 text-rose-800 border-rose-300",
  "Friend": "bg-blue-100 text-blue-800 border-blue-300",
  "Neighbor": "bg-teal-100 text-teal-800 border-teal-300",
  "Coworker": "bg-amber-100 text-amber-800 border-amber-300",
  "Community Member": "bg-green-100 text-green-800 border-green-300",
  "Paid Support": "bg-slate-100 text-slate-700 border-slate-300",
  "Professional": "bg-purple-100 text-purple-800 border-purple-300",
};

export default function NetworkMap({ client, contacts, onCreate, onUpdate }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editContact, setEditContact] = useState(null);

  const ratio = calcNetworkRatio(contacts);
  const atRisk = contacts.filter(c => {
    if (!c.last_contact_date) return false;
    const days = differenceInDays(new Date(), new Date(c.last_contact_date));
    return days >= 90;
  });

  const groupedByType = REL_TYPES.reduce((acc, type) => {
    const group = contacts.filter(c => c.relationship_type === type);
    if (group.length > 0) acc[type] = group;
    return acc;
  }, {});

  const paid = contacts.filter(c => !c.is_natural_support).length;
  const natural = contacts.filter(c => c.is_natural_support).length;

  const handleSave = (data) => {
    if (editContact?.id) onUpdate(editContact.id, data);
    else onCreate({ ...data, client_id: client.id, client_name: `${client.first_name} ${client.last_name}` });
    setShowDialog(false);
    setEditContact(null);
  };

  return (
    <div className="space-y-5">
      {/* Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={cn("border-2 rounded-xl p-4 text-center", ratio.ratio >= 50 ? "border-emerald-300 bg-emerald-50" : ratio.ratio >= 25 ? "border-amber-300 bg-amber-50" : "border-red-300 bg-red-50")}>
          <p className="text-2xl font-bold">{ratio.ratio}%</p>
          <p className="text-xs text-muted-foreground">Natural Support Ratio</p>
          {ratio.ratio < 30 && <p className="text-[10px] text-red-700 mt-1 font-medium">Below 30% — community inclusion is not being achieved</p>}
        </div>
        <div className="border-2 border-border rounded-xl p-4 text-center bg-white">
          <p className="text-2xl font-bold">{contacts.length}</p>
          <p className="text-xs text-muted-foreground">Total Network Size</p>
          <p className="text-[10px] text-muted-foreground mt-1">{natural} natural · {paid} paid</p>
        </div>
        <div className={cn("border-2 rounded-xl p-4 text-center", atRisk.length > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50")}>
          <p className="text-2xl font-bold">{atRisk.length}</p>
          <p className="text-xs text-muted-foreground">Relationships at Risk</p>
          <p className="text-[10px] text-muted-foreground mt-1">No contact in 90+ days</p>
        </div>
      </div>

      {/* Civil rights flag */}
      {ratio.total >= 3 && ratio.ratio < 30 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3">
          <p className="text-sm font-bold text-red-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Network Composition Alert</p>
          <p className="text-xs text-red-700 mt-1">
            {client.first_name}'s network is {100 - ratio.ratio}% paid support. Research consistently shows adults with IDD have dramatically smaller natural networks than non-disabled peers — and the majority of relationships are with paid staff. This is not a clinical finding. It is a civil rights finding. The plan must identify specific actions to grow natural community relationships.
          </p>
        </div>
      )}

      {/* At-risk relationships */}
      {atRisk.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 mb-1.5">Relationships at Risk — No Contact in 90+ Days</p>
          {atRisk.map((c, i) => (
            <p key={i} className="text-xs text-amber-700">• {c.contact_name} ({c.relationship_type}) — last contact: {c.last_contact_date}</p>
          ))}
          <p className="text-xs text-amber-700 mt-1 font-medium">Identify one action to reconnect at the next planning meeting.</p>
        </div>
      )}

      {/* Contact groups */}
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">{client.first_name}'s Network ({contacts.length} people)</p>
        <Button size="sm" onClick={() => { setEditContact(null); setShowDialog(true); }} className="gap-1"><Plus className="w-3.5 h-3.5" />Add Person</Button>
      </div>

      {contacts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8 border-dashed border-2 border-border rounded-xl">No network contacts on file. Start mapping {client.first_name}'s relationships.</p>
      )}

      {Object.entries(groupedByType).map(([type, group]) => (
        <div key={type}>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">{type} ({group.length})</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.map((c, i) => {
              const daysLapsed = c.last_contact_date ? differenceInDays(new Date(), new Date(c.last_contact_date)) : null;
              const atRiskContact = daysLapsed !== null && daysLapsed >= 90;
              return (
                <button key={i} type="button" onClick={() => { setEditContact(c); setShowDialog(true); }}
                  className={cn("text-left border-2 rounded-xl p-3 hover:shadow-sm transition-all", atRiskContact ? "border-amber-300 bg-amber-50" : "border-border bg-white")}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{c.contact_name}</p>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className={cn("text-[10px] border", REL_COLORS[type] || "")}>{type}</Badge>
                        {!c.is_natural_support && <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500">Paid Support</Badge>}
                        {c.is_reciprocal && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">Reciprocal</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{c.contact_frequency} contact</p>
                    </div>
                    {c.person_importance_rating && (
                      <span className="text-xs font-bold text-amber-600">{"★".repeat(c.person_importance_rating)}</span>
                    )}
                  </div>
                  {atRiskContact && <p className="text-[10px] text-amber-700 mt-1 font-medium">⚠ No contact in {daysLapsed} days</p>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {showDialog && (
        <ContactDialog contact={editContact} onSave={handleSave} onClose={() => { setShowDialog(false); setEditContact(null); }} />
      )}
    </div>
  );
}

function ContactDialog({ contact, onSave, onClose }) {
  const [form, setForm] = useState({
    contact_name: "", relationship_type: "Friend", contact_frequency: "Weekly",
    is_reciprocal: false, is_natural_support: true, person_importance_rating: 3,
    last_contact_date: "", status: "Active", notes: "",
    ...contact,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{contact ? "Edit" : "Add"} Network Contact</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={form.contact_name} onChange={e => set("contact_name", e.target.value)} /></div>
          <div><Label>Relationship</Label>
            <Select value={form.relationship_type} onValueChange={v => set("relationship_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REL_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Contact Frequency</Label>
            <Select value={form.contact_frequency} onValueChange={v => set("contact_frequency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FREQ_OPTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Last Contact Date</Label><Input type="date" value={form.last_contact_date} onChange={e => set("last_contact_date", e.target.value)} /></div>
          <div><Label>Person's Importance Rating (1–5)</Label>
            <div className="flex gap-1 mt-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => set("person_importance_rating", n)}
                  className={cn("text-xl", form.person_importance_rating >= n ? "text-amber-500" : "text-slate-200")}>★</button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_natural_support} onChange={e => set("is_natural_support", e.target.checked)} />
            Natural support (relationship would exist without IDD services)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_reciprocal} onChange={e => set("is_reciprocal", e.target.checked)} />
            Reciprocal relationship (person gives as well as receives support)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.contact_name}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}