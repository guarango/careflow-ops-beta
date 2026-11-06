import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";

/** Step 3 — notification channels and text-message consent. */
export default function StepNotifications({ staff, saving, onNext }) {
  const [email, setEmail] = useState(staff?.email_notifications !== false);
  const [push, setPush] = useState(staff?.push_notifications !== false);
  const [sms, setSms] = useState(staff?.sms_opted_in === true);
  const [smsPhone, setSmsPhone] = useState(staff?.sms_phone || staff?.phone || "");
  const [error, setError] = useState("");

  const submit = () => {
    if (sms && !smsPhone.trim()) {
      setError("Add a mobile number before opting in to text messages.");
      return;
    }
    setError("");
    onNext({ email_notifications: email, push_notifications: push, sms_opted_in: sms, sms_phone: smsPhone });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Email</p>
          <p className="text-xs text-muted-foreground">Reminders to your login email.</p>
        </div>
        <Switch checked={email} onCheckedChange={setEmail} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Push notifications</p>
          <p className="text-xs text-muted-foreground">Alerts on your phone in the CareFlow app.</p>
        </div>
        <Switch checked={push} onCheckedChange={setPush} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Text messages</p>
          <p className="text-xs text-muted-foreground">Short reminders by SMS. Never includes client details.</p>
        </div>
        <Switch checked={sms} onCheckedChange={setSms} />
      </div>
      {sms && (
        <div className="max-w-xs">
          <Label>Mobile number for texts</Label>
          <Input value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} placeholder="(555) 555-5555" />
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end pt-2">
        <Button onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Continue <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}