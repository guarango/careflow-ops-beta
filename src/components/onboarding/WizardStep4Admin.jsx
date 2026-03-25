import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, UserPlus } from "lucide-react";

export default function WizardStep4Admin({ data, onNext, onBack }) {
  const [form, setForm] = useState({
    admin_first_name: "", admin_last_name: "",
    admin_email: data.primary_contact_email || "", admin_phone: "",
  });
  const f = (k) => ({ value: form[k] || "", onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });
  const valid = form.admin_first_name && form.admin_last_name && form.admin_email;

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Admin User</h2>
      <p className="text-muted-foreground mb-6">Create the first administrator account. This person will have full access to your agency's environment.</p>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium text-foreground">An invitation email will be sent to this address</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">The admin user will receive a link to set their password and access the platform.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium text-foreground">First Name *</label><Input {...f("admin_first_name")} className="mt-1" /></div>
          <div><label className="text-sm font-medium text-foreground">Last Name *</label><Input {...f("admin_last_name")} className="mt-1" /></div>
        </div>
        <div><label className="text-sm font-medium text-foreground">Email Address *</label><Input type="email" {...f("admin_email")} className="mt-1" /></div>
        <div><label className="text-sm font-medium text-foreground">Phone</label><Input {...f("admin_phone")} className="mt-1" /></div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} className="gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
          <Button onClick={() => onNext(form)} disabled={!valid} className="gap-2">Continue <ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}