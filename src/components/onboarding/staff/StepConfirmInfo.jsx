import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";

/** Step 1 — confirm preferred name, phone and mailing address. */
export default function StepConfirmInfo({ staff, saving, onNext }) {
  const [form, setForm] = useState({
    preferred_name: staff?.preferred_name || "",
    phone: staff?.phone || "",
    address_street: staff?.address_street || "",
    address_city: staff?.address_city || "",
    address_state: staff?.address_state || "",
    address_zip: staff?.address_zip || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Preferred name</Label>
          <Input value={form.preferred_name} onChange={(e) => set("preferred_name", e.target.value)} placeholder="What should we call you?" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 555-5555" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="sm:col-span-4">
          <Label>Street address</Label>
          <Input value={form.address_street} onChange={(e) => set("address_street", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>City</Label>
          <Input value={form.address_city} onChange={(e) => set("address_city", e.target.value)} />
        </div>
        <div>
          <Label>State</Label>
          <Input value={form.address_state} maxLength={2} onChange={(e) => set("address_state", e.target.value.toUpperCase())} />
        </div>
        <div>
          <Label>Zip</Label>
          <Input value={form.address_zip} onChange={(e) => set("address_zip", e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button onClick={() => onNext(form)} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Continue <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}