import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useImpersonation } from "@/lib/ImpersonationContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Shield } from "lucide-react";
import { getRoleLabel } from "@/lib/permissions";

export default function UserPickerDialog({ open, onClose }) {
  const { loginAs } = useImpersonation();
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [starting, setStarting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setSearch("");
      setReason("");
      setSelectedId(null);
    }
  }, [open]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  const handleStart = async () => {
    if (!selectedId || !reason.trim()) return;
    setStarting(true);
    try {
      await loginAs(selectedId, reason.trim());
      onClose();
    } catch (err) {
      // toast handled by caller or context
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            View as Specific User
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[200px] rounded-md border">
            <div className="divide-y">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No users found.
                </p>
              ) : (
                filtered.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === u.id
                        ? "bg-primary/10 border-l-2 border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">
                      {getRoleLabel(u.is_super_admin ? "super_admin" : u.role)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Why are you viewing as this user? (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            disabled={!selectedId || !reason.trim() || starting}
          >
            {starting ? "Starting..." : "Start Viewing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}