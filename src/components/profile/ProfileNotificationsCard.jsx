import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";

/** Notification channel choices — push, email, and text-message consent. */
export default function ProfileNotificationsCard({ staff, onSave }) {
  const [email, setEmail] = useState(staff?.email_notifications !== false);
  const [push, setPush] = useState(staff?.push_notifications !== false);
  const [sms, setSms] = useState(staff?.sms_opted_in === true);
  const [smsPhone, setSmsPhone] = useState(staff?.sms_phone || staff?.phone || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setEmail(staff?.email_notifications !== false);
    setPush(staff?.push_notifications !== false);
    setSms(staff?.sms_opted_in === true);
    setSmsPhone(staff?.sms_phone || staff?.phone || "");
  }, [staff?.id, staff?.sms_opted_in, staff?.sms_phone, staff?.email_notifications, staff?.push_notifications]);

  const handleSave = async () => {
    setError("");
    if (sms && !smsPhone.trim()) {
      setError("Add a mobile number before opting in to text messages.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        email_notifications: email,
        push_notifications: push,
        sms_opted_in: sms,
        sms_phone: smsPhone,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notifications</CardTitle>
        <CardDescription>Choose how CareFlow reaches you. In-app notifications are always on.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-xs text-muted-foreground">Reminders and alerts to your login email.</p>
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

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save preferences
          </Button>
          {saved && (
            <span className="text-xs text-accent flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />Saved
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}