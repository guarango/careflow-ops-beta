import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useRole } from "./useRole";
import { useAuth } from "@/lib/AuthContext";
import { useRolePreview } from "@/lib/RolePreviewContext";

/**
 * Returns assignment info for the current user.
 * Reads from the User record's assigned_client_ids (maintained by syncStaffAssignments),
 * which is the same field RLS rules use — so the UI and data layer are always in sync.
 *
 * isDSPMode: true for DSPs (backward compat — existing pages filter client-side).
 * isCaseloadMode: true for DSP + Manager (broader caseload concept).
 * For Admin/Super Admin: both false (RLS returns all records).
 */
export function useAssignedClients() {
  const { isDSP, isManager, isAdmin } = useRole();
  const { user } = useAuth();
  const { previewRole } = useRolePreview();

  const isCaseloadMode = isDSP || isManager;
  // Backward compat: existing pages use isDSPMode for client-side filtering.
  // With RLS in place, server already filters — this is a secondary safety net.
  const isDSPMode = isDSP;

  const { data: me, isLoading } = useQuery({
    queryKey: ["my-assignments"],
    queryFn: () => base44.auth.me(),
    enabled: isCaseloadMode,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  if (!isCaseloadMode) {
    return { isDSPMode: false, isCaseloadMode: false, assignedClientIds: null, isLoading: false };
  }

  const assignedClientIds = me?.assigned_client_ids || [];

  return {
    isDSPMode,
    isCaseloadMode,
    assignedClientIds,
    assignedHouseIds: me?.assigned_house_ids || [],
    teamStaffIds: me?.team_staff_ids || [],
    staffMemberId: me?.staff_member_id,
    isLoading,
  };
}