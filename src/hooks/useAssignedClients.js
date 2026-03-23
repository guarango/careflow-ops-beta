import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useRole } from "./useRole";
import { useAuth } from "@/lib/AuthContext";
import { useRolePreview } from "@/lib/RolePreviewContext";

/**
 * Returns assignment info for the current user.
 * If user is DSP (real or preview), returns isDSPMode=true and their assigned client IDs.
 * Otherwise returns isDSPMode=false and assignedClientIds=null (no filtering needed).
 */
export function useAssignedClients() {
  const { isDSP } = useRole();
  const { user } = useAuth();
  const { previewRole } = useRolePreview();

  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ["staff-assignments"],
    queryFn: () => base44.entities.StaffMember.list(),
    enabled: isDSP,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  if (!isDSP) {
    return { isDSPMode: false, assignedClientIds: null, staffMember: null, isLoading: false };
  }

  // Preview DSP mode → look for "James Williams" staff record
  // Real DSP mode → match by authenticated user email
  const staffMember = previewRole === "dsp"
    ? staffMembers.find(s => `${s.first_name} ${s.last_name}` === "James Williams")
    : staffMembers.find(s => s.email?.toLowerCase() === user?.email?.toLowerCase());

  return {
    isDSPMode: true,
    assignedClientIds: staffMember?.assigned_client_ids || [],
    staffMember,
    isLoading,
  };
}