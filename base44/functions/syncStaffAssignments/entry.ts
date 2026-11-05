import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { syncStaffAssignments } from '../../shared/staffAssignments.ts';

/**
 * syncStaffAssignments — recompute the User-level assignment fields RLS depends on
 * (assigned_client_ids, assigned_house_ids, team_staff_ids, staff_member_id).
 *
 * Call after any assignment change: client toggle, house toggle, client house_id change.
 * The work itself lives in shared/staffAssignments.ts, which activateStaffAccount
 * also runs on sign-in.
 *
 * Payload:
 *   { staff_id: "..." } — recompute a single staff member's linked user
 *   { house_id: "..." } — recompute all managers assigned to a house
 *   { full_sync: true } — recompute all staff (admin maintenance)
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole.entities;

    let staffIds = [];
    if (body.staff_id) {
      staffIds = [body.staff_id];
    } else if (body.house_id) {
      const managersRaw = await svc.StaffMember.filter({ assigned_house_ids: body.house_id });
      const managers = Array.isArray(managersRaw) ? managersRaw : (managersRaw?.items || []);
      staffIds = managers.map((s) => s.id);
    } else if (body.full_sync) {
      const allRaw = await svc.StaffMember.filter({});
      const all = Array.isArray(allRaw) ? allRaw : (allRaw?.items || []);
      staffIds = all.map((s) => s.id);
    } else {
      return Response.json({ error: 'Provide staff_id, house_id, or full_sync' }, { status: 400 });
    }

    const results = await syncStaffAssignments(base44, staffIds);
    return Response.json({ processed: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}