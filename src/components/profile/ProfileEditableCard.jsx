import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";

const FIELDS = [
  "preferred_name",
  "phone",
  "address_street",
  "address_city",
  "address_state",
  "address_zip",
  "emergency_contact_name",
  "emergency_contact_relation",
  "emergency_contact_phone",
  "availability",
];

function pick(staff) {
  return FIELDS.reduce((acc, key) => ({ ...acc, [key]: staff?.[key] || "" }), {});
}

/** The fields a staff member may edit about themselves. */
export default function ProfileEditableCard({ staff, onSave }) {
  const [form, setForm] = useState(pick(staff));
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    setForm(pick(staff));
  }, [staff?.id]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setBusy(true);
    try {
      await onSave(form);
      setSavedAt(Date.now());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">My details</CardTitle>
        <CardDescription>Keep your phone, address and emergency contact current.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Preferred name</Label>
            <Input value={form.preferred_name} onChange={(e) => set("preferred_name", e.target.value)} placeholder="What you go by" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 555-5555" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Mailing address</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-4">
              <Label>Street</Label>
              <Input value={form.address_street} onChange={(e) => set("address_street", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>City</Label>
              <Input value={form.address_city} onChange={(e) => set("address_city", e.target.value)} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.address_state} maxLength={2} placeholder="UT" onChange={(e) => set("address_state", e.target.value.toUpperCase())} />
            </div>
            <div>
              <Label>Zip</Label>
              <Input value={form.address_zip} onChange={(e) => set("address_zip", e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Emergency contact</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label>Name</Label>
              <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
            </div>
            <div>
              <Label>Relationship</Label>
              <Input value={form.emergency_contact_relation} onChange={(e) => set("emergency_contact_relation", e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <Label>Availability</Label>
          <Textarea
            rows={3}
            value={form.availability}
            onChange={(e) => set("availability", e.target.value)}
            placeholder="e.g. Weekdays after 3pm, weekends open"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save changes
          </Button>
          {savedAt && !busy && (
            <span className="text-xs text-accent flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />Saved
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}