import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const WAIVER_PROGRAMS = ["DSPD Waiver", "HCBS Waiver", "Medicaid DD Waiver", "CCSP Waiver", "SOURCE Waiver", "CIH Waiver", "Other"];

export default function AgencyProfile({ agency, onSave, saving }) {
  const [form, setForm] = useState({
    name: "", npi: "", medicaid_provider_id: "", state: "", address_street: "", address_city: "", address_state: "", address_zip: "",
    primary_contact_name: "", primary_contact_email: "", primary_contact_phone: "",
    billing_contact_name: "", billing_contact_email: "", subdomain: "", ...agency
  });

  useEffect(() => { if (agency) setForm(f => ({ ...f, ...agency })); }, [agency]);

  const f = (key) => ({ value: form[key] || "", onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Agency Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><label className="text-xs text-muted-foreground">Legal Agency Name *</label><Input {...f("name")} placeholder="Sunrise Care Services LLC" /></div>
          <div><label className="text-xs text-muted-foreground">NPI Number</label><Input {...f("npi")} placeholder="1234567890" /></div>
          <div><label className="text-xs text-muted-foreground">Medicaid Provider ID</label><Input {...f("medicaid_provider_id")} placeholder="MP-00001" /></div>
          <div><label className="text-xs text-muted-foreground">State of Operation</label>
            <Select value={form.state} onValueChange={v => setForm(p => ({ ...p, state: v }))}>
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-xs text-muted-foreground">Subdomain</label>
            <div className="flex items-center gap-1"><Input {...f("subdomain")} placeholder="sunrisecares" className="rounded-r-none" /><span className="h-9 px-3 bg-muted border border-l-0 border-input rounded-r-md text-sm text-muted-foreground flex items-center">.careops.com</span></div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><label className="text-xs text-muted-foreground">Street Address</label><Input {...f("address_street")} /></div>
          <div><label className="text-xs text-muted-foreground">City</label><Input {...f("address_city")} /></div>
          <div><label className="text-xs text-muted-foreground">State</label><Input {...f("address_state")} /></div>
          <div><label className="text-xs text-muted-foreground">ZIP Code</label><Input {...f("address_zip")} /></div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Contacts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Primary Contact</p>
            <div><label className="text-xs text-muted-foreground">Name</label><Input {...f("primary_contact_name")} /></div>
            <div><label className="text-xs text-muted-foreground">Email</label><Input type="email" {...f("primary_contact_email")} /></div>
            <div><label className="text-xs text-muted-foreground">Phone</label><Input {...f("primary_contact_phone")} /></div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Billing Contact</p>
            <div><label className="text-xs text-muted-foreground">Name</label><Input {...f("billing_contact_name")} /></div>
            <div><label className="text-xs text-muted-foreground">Email</label><Input type="email" {...f("billing_contact_email")} /></div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Agency Profile"}
        </Button>
      </div>
    </div>
  );
}