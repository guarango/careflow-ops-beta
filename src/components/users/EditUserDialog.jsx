import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ROLE_DESCRIPTIONS } from "@/lib/permissions";

/**
 * Change access — app access + bundles only.
 * Saved through setStaffAccess, which mirrors onto the person's login and audits the change.
 * Job title is HR information and is never set here.
 */
export default function EditUserDialog({ person, open, onOpenChange, onSave, loading }) {
  const [appAccess, setAppAccess] = useState("dsp");
  const [hrBundle, setHrBundle] = useState(false);
  const [billingBundle, setBillingBundle] = useState(false);

  useEffect(() => {
    if (person) {
      setAppAccess(person.app_access || "dsp");
      setHrBundle(!!person.hr_bundle);
      setBillingBundle(!!person.billing_bundle);
    }
  }, [person]);

  if (!person) return null;

  const handleSave = () => {
    onSave({
      staffId: person.staffId,
      app_access: appAccess,
      hr_bundle: appAccess === "admin" ? hrBundle : false,
      billing_bundle: appAccess === "admin" ? billingBundle : false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change access — {person.name}</DialogTitle>
          <DialogDescription>
            {person.job_title ? `Job title: ${person.job_title}. ` : ""}
            Job title never grants access; app access is what this person can open.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>App access</Label>
            <Select value={appAccess} onValueChange={(v) => { setAppAccess(v); if (v !== "admin") { setHrBundle(false); setBillingBundle(false); } }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dsp">DSP — Assigned clients only</SelectItem>
                <SelectItem value="manager">Manager — Oversees clients & staff</SelectItem>
                <SelectItem value="admin">Admin — Full agency access</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">{ROLE_DESCRIPTIONS[appAccess]}</p>
          </div>

          {appAccess === "admin" && (
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permission Bundles</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={hrBundle} onCheckedChange={(v) => setHrBundle(!!v)} />
                <span className="text-sm">HR bundle — staff files, onboarding, trainings, compliance</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={billingBundle} onCheckedChange={(v) => setBillingBundle(!!v)} />
                <span className="text-sm">Billing bundle — rates, authorizations, payroll/billing/EVV export</span>
              </label>
              <p className="text-[11px] text-muted-foreground">Bundles only apply to Admins.</p>
            </div>
          )}

          {person.status === "Pending" && (
            <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
              This person has not signed in yet — the access you choose is applied when they accept the invite.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Access"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}