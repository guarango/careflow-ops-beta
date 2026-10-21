import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * linkStaffUsers
 *
 * Links StaffMember records to User accounts by matching email, sets the
 * app-level role on each user, and runs the full assignment sync.
 *
 * Call this after staff members have accepted their email invitations —
 * the User records only exist once the invite is accepted.
 *
 * Payload:
 *   { } — link all staff and run full sync
 *   { dry_run: true } — report what would be linked without making changes
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = !!body.dry_run;

    // Role mapping: staff role → app role
    const ROLE_MAP = {
      'DSP': 'dsp',
      'Nurse': 'dsp',
      'Admin': 'admin',
      'Supervisor': 'manager',
      'QIDP': 'manager',
      'Mental Health Pro': 'manager',
      'Behavioral Specialist': 'manager',
    };

    // Fetch all users (service role to see all)
    const allUsersRaw = await base44.asServiceRole.entities.User.list();
    const allUsers = Array.isArray(allUsersRaw) ? allUsersRaw : (allUsersRaw?.items || []);
    const userByEmail = new Map();
    for (const u of allUsers) {
      if (u.email) userByEmail.set(u.email.toLowerCase(), u);
    }

    // Fetch all staff
    const staffRaw = await base44.asServiceRole.entities.StaffMember.filter({});
    const staff = Array.isArray(staffRaw) ? staffRaw : (staffRaw?.items || []);

    const linked = [];
    const unlinked = [];
    const bulkUpdates = [];
    const roleUpdates = [];

    for (const s of staff) {
      const email = (s.email || '').toLowerCase();
      if (!email) {
        unlinked.push({ staffId: s.id, name: `${s.first_name} ${s.last_name}`, reason: 'no email on staff record' });
        continue;
      }
      const matchedUser = userByEmail.get(email);
      if (!matchedUser) {
        unlinked.push({ staffId: s.id, name: `${s.first_name} ${s.last_name}`, email, reason: 'invitation not yet accepted' });
        continue;
      }

      const appRole = ROLE_MAP[s.role] || 'dsp';

      // Queue role update if needed
      if (matchedUser.role !== appRole) {
        roleUpdates.push({ userId: matchedUser.id, role: appRole });
      }

      // Queue staff user_id update if needed
      if (s.user_id !== matchedUser.id) {
        bulkUpdates.push({ id: s.id, user_id: matchedUser.id });
      }

      linked.push({
        staffId: s.id,
        staffName: `${s.first_name} ${s.last_name}`,
        staffRole: s.role,
        appRole,
        userId: matchedUser.id,
        email,
      });
    }

    if (dryRun) {
      return Response.json({
        dryRun: true,
        totalStaff: staff.length,
        totalUsers: allUsers.length,
        linked: linked.length,
        unlinked: unlinked.length,
        roleUpdatesNeeded: roleUpdates.length,
        userLinksNeeded: bulkUpdates.length,
        linked,
        unlinked,
      });
    }

    // Apply role updates
    for (const ru of roleUpdates) {
      try {
        await base44.asServiceRole.entities.User.update(ru.userId, { role: ru.role });
      } catch (e) { /* role may already be set */ }
    }

    // Apply user_id links on staff records
    if (bulkUpdates.length > 0) {
      await base44.asServiceRole.entities.StaffMember.bulkUpdate(bulkUpdates);
    }

    // Run the full assignment sync to populate RLS fields
    let syncResult = null;
    try {
      const syncRes = await base44.asServiceRole.functions.invoke('syncStaffAssignments', { full_sync: true });
      syncResult = syncRes.data || syncRes;
    } catch (e) {
      syncResult = { error: e.message };
    }

    return Response.json({
      totalStaff: staff.length,
      totalUsers: allUsers.length,
      linked: linked.length,
      unlinked: unlinked.length,
      roleUpdatesApplied: roleUpdates.length,
      userLinksApplied: bulkUpdates.length,
      sync: syncResult,
      linked,
      unlinked,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}