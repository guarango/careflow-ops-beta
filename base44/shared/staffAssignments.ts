/**
 * staffAssignments — the one place a person's caseload is computed onto their login.
 *
 * RLS depends on these User fields: assigned_client_ids, assigned_house_ids,
 * team_staff_ids, staff_member_id. Both syncStaffAssignments (admin assignment
 * edits) and activateStaffAccount (on sign-in) call this, so the values are
 * correct before the person's first page loads.
 */
export async function syncStaffAssignments(base44, staffIds) {
  const svc = base44.asServiceRole.entities;

  const findUser = async (staff) => {
    if (staff.user_id) {
      const byId = await svc.User.get(staff.user_id).catch(() => null);
      if (byId) return byId;
    }
    if (!staff.email) return null;
    const found = await svc.User.filter({ email: staff.email.toLowerCase() }).catch(() => null);
    return (Array.isArray(found) ? found : (found?.items || []))[0] || null;
  };

  const results = [];

  for (const staffId of staffIds) {
    try {
      const staffArr = await svc.StaffMember.filter({ id: staffId });
      const staff = (Array.isArray(staffArr) ? staffArr : (staffArr?.items || []))[0];
      if (!staff) {
        results.push({ staffId, error: 'Staff not found' });
        continue;
      }

      const linkedUser = await findUser(staff);

      // Full caseload: directly assigned clients + every client in their houses
      const directClientIds = staff.assigned_client_ids || [];
      const houseIds = staff.assigned_house_ids || [];
      let houseClientIds = [];
      if (houseIds.length > 0) {
        const houseClients = await svc.Client.filter({ house_id: { $in: houseIds } });
        const clientList = Array.isArray(houseClients) ? houseClients : (houseClients?.items || []);
        houseClientIds = clientList.map((c) => c.id);
      }
      const fullCaseload = [...new Set([...directClientIds, ...houseClientIds])];

      // Team: everyone assigned to any client in that caseload
      let teamStaffIds = [];
      if (fullCaseload.length > 0) {
        const teamStaff = await svc.StaffMember.filter({ assigned_client_ids: { $in: fullCaseload } });
        const teamList = Array.isArray(teamStaff) ? teamStaff : (teamStaff?.items || []);
        teamStaffIds = teamList.map((s) => s.id).filter((id) => id !== staffId);
      }

      if (linkedUser) {
        await svc.User.update(linkedUser.id, {
          staff_member_id: staffId,
          assigned_client_ids: fullCaseload,
          assigned_house_ids: houseIds,
          team_staff_ids: teamStaffIds,
        });
        results.push({
          staffId,
          userId: linkedUser.id,
          caseload: fullCaseload.length,
          team: teamStaffIds.length,
          houses: houseIds.length,
        });
      } else {
        results.push({
          staffId,
          userId: null,
          caseload: fullCaseload.length,
          team: teamStaffIds.length,
          houses: houseIds.length,
          note: 'No linked User account found',
        });
      }
    } catch (err) {
      results.push({ staffId, error: err.message });
    }
  }

  return results;
}