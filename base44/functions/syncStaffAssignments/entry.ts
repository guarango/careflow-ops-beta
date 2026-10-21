import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * syncStaffAssignments
 *
 * Recomputes the User-level assignment fields that RLS rules depend on:
 *   - assigned_client_ids: full caseload (direct + via houses)
 *   - assigned_house_ids: houses directly assigned
 *   - team_staff_ids: StaffMember IDs of DSPs assigned to any client in the caseload
 *   - staff_member_id: the StaffMember record linked to this user
 *
 * Call after any assignment change: client toggle, house toggle, client house_id change.
 *
 * Payload:
 *   { staff_id: "..." } — recompute a single staff member's linked user
 *   { house_id: "..." } — recompute all managers assigned to a house
 *   { full_sync: true } — recompute all staff (admin maintenance)
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    // Determine which staff members to process
    let staffIds = [];

    if (body.staff_id) {
      staffIds = [body.staff_id];
    } else if (body.house_id) {
      const managers = await base44.asServiceRole.entities.StaffMember.filter({
        assigned_house_ids: body.house_id
      });
      const mgrList = Array.isArray(managers) ? managers : (managers?.items || []);
      staffIds = mgrList.map(s => s.id);
    } else if (body.full_sync) {
      const allStaff = await base44.asServiceRole.entities.StaffMember.filter({});
      staffIds = (Array.isArray(allStaff) ? allStaff : (allStaff?.items || [])).map(s => s.id);
    } else {
      return Response.json({ error: 'Provide staff_id, house_id, or full_sync' }, { status: 400 });
    }

    // Fetch all users once — User entity doesn't support .filter() with options
    const allUsersRaw = await base44.asServiceRole.entities.User.list();
    const allUsers = Array.isArray(allUsersRaw) ? allUsersRaw : (allUsersRaw?.items || []);
    const userById = new Map();
    const userEmailMap = new Map();
    for (const u of allUsers) {
      userById.set(u.id, u);
      if (u.email) userEmailMap.set(u.email.toLowerCase(), u);
    }

    const results = [];

    for (const staffId of staffIds) {
      try {
        // Fetch the staff record (service role to bypass RLS)
        const staffArr = await base44.asServiceRole.entities.StaffMember.filter({ id: staffId });
        const staffList = Array.isArray(staffArr) ? staffArr : (staffArr?.items || []);
        const staff = staffList[0];
        if (!staff) { results.push({ staffId, error: 'Staff not found' }); continue; }

        // Find linked User by user_id or email
        let linkedUser = null;
        if (staff.user_id) {
          linkedUser = userById.get(staff.user_id);
        }
        if (!linkedUser && staff.email) {
          linkedUser = userEmailMap.get(staff.email.toLowerCase());
        }

        // Compute full caseload: direct client IDs + clients in assigned houses
        const directClientIds = staff.assigned_client_ids || [];
        const houseIds = staff.assigned_house_ids || [];
        let houseClientIds = [];

        if (houseIds.length > 0) {
          const houseClients = await base44.asServiceRole.entities.Client.filter(
            { house_id: { $in: houseIds } }
          );
          const clientList = Array.isArray(houseClients) ? houseClients : (houseClients?.items || []);
          houseClientIds = clientList.map(c => c.id);
        }

        // Merge and deduplicate
        const fullCaseload = [...new Set([...directClientIds, ...houseClientIds])];

        // Compute team: all staff assigned to any client in the caseload
        let teamStaffIds = [];
        if (fullCaseload.length > 0) {
          const teamStaff = await base44.asServiceRole.entities.StaffMember.filter(
            { assigned_client_ids: { $in: fullCaseload } }
          );
          const teamList = Array.isArray(teamStaff) ? teamStaff : (teamStaff?.items || []);
          teamStaffIds = teamList.map(s => s.id).filter(id => id !== staffId);
        }

        // Update the linked User if found
        if (linkedUser) {
          await base44.asServiceRole.entities.User.update(linkedUser.id, {
            staff_member_id: staffId,
            assigned_client_ids: fullCaseload,
            assigned_house_ids: houseIds,
            team_staff_ids: teamStaffIds
          });
          results.push({
            staffId,
            userId: linkedUser.id,
            caseload: fullCaseload.length,
            team: teamStaffIds.length,
            houses: houseIds.length
          });
        } else {
          results.push({
            staffId,
            userId: null,
            caseload: fullCaseload.length,
            team: teamStaffIds.length,
            houses: houseIds.length,
            note: 'No linked User account found'
          });
        }
      } catch (err) {
        results.push({ staffId, error: err.message });
      }
    }

    return Response.json({ processed: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}