import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight } from "lucide-react";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function WizardStep1Profile({ data, onNext }) {
  const [form, setForm] = useState({ name: "", npi: "", medicaid_provider_id: "", state: "", subdomain: "", primary_contact_name: "", primary_contact_email: "", ...data });
  const f = (k) => ({ value: form[k] || "", onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });
  const valid = form.name && form.state;

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Agency Profile</h2>
      <p className="text-muted-foreground mb-6">Tell us about your agency. This information will be used for billing and compliance purposes.</p>
      <div className="space-y-4">
        <div><label className="text-sm font-medium text-foreground">Agency Legal Name *</label><Input {...f("name")} placeholder="Sunrise Care Services LLC" className="mt-1" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium text-foreground">NPI Number</label><Input {...f("npi")} placeholder="1234567890" className="mt-1" /></div>
          <div><label className="text-sm font-medium text-foreground">Medicaid Provider ID</label><Input {...f("medicaid_provider_id")} placeholder="MP-00001" className="mt-1" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium text-foreground">State of Operation *</label>
            <Select value={form.state} onValueChange={v => setForm(p => ({ ...p, state: v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-sm font-medium text-foreground">Subdomain</label>
            <div className="flex items-center gap-1 mt-1"><Input {...f("subdomain")} placeholder="myagency" className="rounded-r-none" /><span className="h-9 px-3 bg-muted border border-l-0 border-input rounded-r-md text-sm text-muted-foreground flex items-center">.careops.com</span></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium text-foreground">Admin Contact Name</label><Input {...f("primary_contact_name")} className="mt-1" /></div>
          <div><label className="text-sm font-medium text-foreground">Admin Email</label><Input type="email" {...f("primary_contact_email")} className="mt-1" /></div>
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={() => onNext(form)} disabled={!valid} className="gap-2">
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}