import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

/**
 * The signed-in person's OWN StaffMember record.
 * Always resolved from the login (user_id, then email) — never from an id in the URL,
 * so a staff member can only ever reach their own profile.
 */
export async function fetchMyStaffRecord(user) {
  if (!user) return null;
  const byUser = await base44.entities.StaffMember.filter({ user_id: user.id }).catch(() => []);
  if (byUser?.[0]) return byUser[0];
  if (user.staff_member_id) {
    const linked = await base44.entities.StaffMember.get(user.staff_member_id).catch(() => null);
    if (linked) return linked;
  }
  const email = (user.email || "").toLowerCase();
  if (!email) return null;
  const byEmail = await base44.entities.StaffMember.filter({ email: user.email }).catch(() => []);
  return byEmail?.[0] || null;
}

export function useMyStaffRecord() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-staff", user?.id],
    queryFn: () => fetchMyStaffRecord(user),
    enabled: !!user,
  });
}