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
import { MoreHorizontal, KeyRound, Pencil, Ban, Trash2, Power } from "lucide-react";

export default function UserActionsMenu({ user, onEdit, onResetPassword, onToggleDeactivated, onDelete, isSuperAdmin }) {
  const [showDelete, setShowDelete] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const isSelf = user._is_self;
  const isSuperAdminUser = !!user.is_super_admin;
  const isDeactivated = !!user.is_deactivated;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onEdit(user)}>
            <Pencil className="w-3.5 h-3.5 mr-2" />
            Edit Role
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onResetPassword(user)} disabled={isSelf}>
            <KeyRound className="w-3.5 h-3.5 mr-2" />
            Reset Password
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeactivate(true)}
            disabled={isSelf || isSuperAdminUser}
          >
            {isDeactivated ? (
              <><Power className="w-3.5 h-3.5 mr-2" />Reactivate</>
            ) : (
              <><Ban className="w-3.5 h-3.5 mr-2" />Deactivate</>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDelete(true)}
            disabled={isSelf || isSuperAdminUser}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isDeactivated ? "Reactivate" : "Deactivate"} {user.full_name || user.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              {isDeactivated
                ? "This user will regain access to the platform."
                : "This user will no longer be able to log in or access the platform."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onToggleDeactivated(user, !isDeactivated)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {user.full_name || user.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the user account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(user)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}