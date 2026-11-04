import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { getRoleLabel, ROLE_DESCRIPTIONS } from "@/lib/permissions";

export default function EditUserDialog({ user, open, onOpenChange, onSave, loading }) {
  const [role, setRole] = useState(user?.role || "dsp");
  const [hrBundle, setHrBundle] = useState(false);
  const [billingBundle, setBillingBundle] = useState(false);

  useEffect(() => {
    if (user) {
      setRole(user.role || "dsp");
      setHrBundle(!!user.hr_bundle);
      setBillingBundle(!!user.billing_bundle);
    }
  }, [user]);

  const handleSave = () => {
    onSave({ userId: user.id, role, hrBundle, billingBundle });
  };

  if (!user) return null;
  const effectiveRole = user.is_super_admin ? "super_admin" : user.role;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User — {user.full_name || user.email}</DialogTitle>
          <DialogDescription>Update role and permission bundles.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground">Current role</p>
            <p className="text-sm font-medium">{getRoleLabel(effectiveRole)}</p>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => { setRole(v); setHrBundle(false); setBillingBundle(false); }} disabled={!!user.is_super_admin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dsp">DSP — Assigned clients only</SelectItem>
                <SelectItem value="manager">Manager — Oversees clients & staff</SelectItem>
                <SelectItem value="admin">Admin — Full agency access</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
          {role === "admin" && !user.is_super_admin && (
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permission Bundles</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={hrBundle} onCheckedChange={(v) => setHrBundle(!!v)} />
                <span className="text-sm">HR bundle</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={billingBundle} onCheckedChange={(v) => setBillingBundle(!!v)} />
                <span className="text-sm">Billing bundle</span>
              </label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}