import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getCaller, unauthorized } from '../../shared/functionAuth.ts';

/**
 * requestStaffChange — a staff member asks to change a field they can't edit.
 *
 * Legal name and date of birth are HR-owned. The person can only ask, so this
 * writes an in-app notification to every Admin holding the HR bundle and returns
 * how many were reached. Nothing on the staff record is changed here.
 */
const REQUESTABLE = {
  legal_name: 'legal name',
  date_of_birth: 'date of birth',
};

async function findOwnRecord(svc, caller) {
  const byUser = await svc.StaffMember.filter({ user_id: caller.id }).catch(() => []);
  if (byUser?.[0]) return byUser[0];
  const email = (caller.email || '').toLowerCase();
  if (!email) return null;
  const all = (await svc.StaffMember.list().catch(() => [])) || [];
  return all.find((s) => (s.email || '').toLowerCase() === email) || null;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await getCaller(base44);
    if (!caller) return unauthorized();

    const body = await req.json().catch(() => ({}));
    const field = String(body.field || '');
    if (!REQUESTABLE[field]) {
      return Response.json({ error: 'That field cannot be requested.' }, { status: 400 });
    }

    const note = String(body.note ?? '')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .trim()
      .slice(0, 300);

    const svc = base44.asServiceRole.entities;
    const staff = await findOwnRecord(svc, caller);
    if (!staff) {
      return Response.json({ error: 'No staff record is linked to this account.' }, { status: 404 });
    }

    const users = (await svc.User.list().catch(() => [])) || [];
    const admins = users.filter(
      (u) => u.role === 'admin' && u.hr_bundle === true && u.is_deactivated !== true && u.id !== caller.id,
    );

    const person = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.email || 'A staff member';
    const message = `${person} requested a change to their ${REQUESTABLE[field]}${note ? `: ${note}` : '.'}`;

    for (const admin of admins) {
      await svc.AppNotification.create({
        type: 'profile_change_request',
        severity: 'action',
        recipient_user_id: admin.id,
        recipient_email: admin.email || '',
        recipient_role: 'admin',
        staff_id: staff.id,
        staff_name: person,
        related_record_id: staff.id,
        message,
        deep_link: '/staff',
        status: 'unread',
        trigger_stage: 'profile_change_request',
        channels: ['in_app'],
      }).catch(() => {});
    }

    await svc.AuditLog.create({
      action: 'Staff change requested',
      actor_id: caller.id,
      actor_name: caller.full_name || caller.email || '',
      actor_email: caller.email || '',
      target_type: 'StaffMember',
      target_id: staff.id,
      target_name: person,
      details: JSON.stringify({ field, notified: admins.length }),
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({ ok: true, notified: admins.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}