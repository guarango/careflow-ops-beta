import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, KeyRound, ShieldCheck, Ban, Power, Send, XCircle } from "lucide-react";

/**
 * People are never deleted — Deactivate (with a reason) and Reactivate cover it,
 * and a pending invite can be cancelled. Every action runs through setStaffAccess.
 */
export default function UserActionsMenu({
  person,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
  onResendInvite,
  onCancelInvite,
  canEdit = true,
}) {
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");

  if (!canEdit) return null;

  const isPending = person.status === "Pending";
  const isInactive = person.status === "Inactive";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => onEdit(person)}>
            <ShieldCheck className="w-3.5 h-3.5 mr-2" />
            Change access
          </DropdownMenuItem>

          {/* Pending people have no password yet; inactive people cannot sign in. */}
          {person.status === "Active" && (
            <DropdownMenuItem onClick={() => onResetPassword(person)}>
              <KeyRound className="w-3.5 h-3.5 mr-2" />
              Reset password
            </DropdownMenuItem>
          )}

          {isPending && (
            <>
              <DropdownMenuItem onClick={() => onResendInvite(person)}>
                <Send className="w-3.5 h-3.5 mr-2" />
                Resend invite
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCancel(true)} className="text-destructive focus:text-destructive">
                <XCircle className="w-3.5 h-3.5 mr-2" />
                Cancel invite
              </DropdownMenuItem>
            </>
          )}

          {!isPending && <DropdownMenuSeparator />}

          {!isPending && (
            isInactive ? (
              <DropdownMenuItem onClick={() => onReactivate(person)}>
                <Power className="w-3.5 h-3.5 mr-2" />
                Reactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setShowDeactivate(true)}>
                <Ban className="w-3.5 h-3.5 mr-2" />
                Deactivate
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeactivate} onOpenChange={(v) => { setShowDeactivate(v); if (!v) setReason(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {person.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will no longer be able to sign in. All of their history is kept, and you can reactivate at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this person being deactivated?"
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reason.trim()}
              onClick={() => { onDeactivate(person, reason.trim()); setReason(""); }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {person.name}'s invite?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the pending invite because they never signed in. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invite</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onCancelInvite(person)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}