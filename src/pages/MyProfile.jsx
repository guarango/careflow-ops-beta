import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useMyStaffRecord } from "@/hooks/useMyStaffRecord";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Camera, Loader2, UserX } from "lucide-react";
import ProfileEditableCard from "@/components/profile/ProfileEditableCard";
import ProfileNotificationsCard from "@/components/profile/ProfileNotificationsCard";
import ProfileReadOnlyCard from "@/components/profile/ProfileReadOnlyCard";
import ProfileCertificationsCard from "@/components/profile/ProfileCertificationsCard";
import ProfileAssignmentsCard from "@/components/profile/ProfileAssignmentsCard";

export default function MyProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: staff, isLoading } = useMyStaffRecord();
  const [uploading, setUploading] = useState(false);

  // Every self-edit goes through the backend function — never a direct write.
  const save = async (fields) => {
    const res = await base44.functions.invoke("updateMyStaffProfile", fields);
    if (res.data?.error) {
      toast({ title: "Could not save", description: res.data.error, variant: "destructive" });
      throw new Error(res.data.error);
    }
    queryClient.invalidateQueries({ queryKey: ["my-staff", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["staff"] });
  };

  const uploadPhoto = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await save({ photo_url: file_url });
      toast({ title: "Photo updated" });
    } catch (error) {
      toast({ title: "Could not upload the photo", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div>
        <PageHeader title="My Profile" />
        <Card>
          <CardContent className="py-16 text-center">
            <UserX className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No staff record is linked to your account yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = `${staff.first_name?.[0] || ""}${staff.last_name?.[0] || ""}`.toUpperCase();
  const displayName = staff.preferred_name || staff.first_name;

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your own record — changes save straight to your staff file." />

      <Card className="mb-6">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative shrink-0">
            {staff.photo_url ? (
              <img src={staff.photo_url} alt={displayName} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                {initials || "?"}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-card border shadow flex items-center justify-center cursor-pointer hover:bg-muted">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
              />
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-muted-foreground" />}
            </label>
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold truncate">
              {displayName} {staff.last_name}
            </h2>
            <p className="text-sm text-muted-foreground">{staff.role || "Staff"} · {staff.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={staff.status || "Active"} />
              {staff.onboarding_completed_at && (
                <span className="text-[11px] text-muted-foreground">Onboarding complete</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ProfileEditableCard staff={staff} onSave={save} />
          <ProfileNotificationsCard staff={staff} onSave={save} />
          <ProfileCertificationsCard staff={staff} onAdd={(certification) => save({ certification })} />
        </div>
        <div className="space-y-6">
          <ProfileReadOnlyCard staff={staff} />
          <ProfileAssignmentsCard staff={staff} />
        </div>
      </div>
    </div>
  );
}