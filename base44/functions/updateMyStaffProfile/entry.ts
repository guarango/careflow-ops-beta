import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getCaller, unauthorized } from '../../shared/functionAuth.ts';

/**
 * updateMyStaffProfile — the ONLY way a staff member edits their own record.
 *
 * The record is resolved from the signed-in login (user_id, then email) and never
 * from an id sent by the client, so nobody can point this at another person.
 *
 * Only the self-service fields are accepted; anything else in the body is rejected
 * outright. Job title, app access, bundles, status, pay and HR files are never
 * writable here — they only change through the admin paths.
 */
const TEXT_FIELDS = [
  'preferred_name',
  'phone',
  'address_street',
  'address_city',
  'address_state',
  'address_zip',
  'emergency_contact_name',
  'emergency_contact_relation',
  'emergency_contact_phone',
  'photo_url',
  'sms_phone',
  'availability',
];

const BOOL_FIELDS = ['email_notifications', 'push_notifications', 'sms_opted_in'];

const ALLOWED_KEYS = new Set([
  ...TEXT_FIELDS,
  ...BOOL_FIELDS,
  'certification',
  'onboarding_step',
  'onboarding_completed',
]);

const MAX_TEXT = 500;

function cleanText(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, MAX_TEXT);
}

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
    const rejected = Object.keys(body).filter((k) => !ALLOWED_KEYS.has(k));
    if (rejected.length > 0) {
      return Response.json(
        { error: `These fields can't be changed from your profile: ${rejected.join(', ')}` },
        { status: 400 },
      );
    }

    const svc = base44.asServiceRole.entities;
    const staff = await findOwnRecord(svc, caller);
    if (!staff) {
      return Response.json({ error: 'No staff record is linked to this account.' }, { status: 404 });
    }

    const updates = {};
    const changed = [];

    for (const key of TEXT_FIELDS) {
      if (!(key in body)) continue;
      updates[key] = cleanText(body[key]);
      changed.push(key);
    }

    for (const key of BOOL_FIELDS) {
      if (!(key in body)) continue;
      updates[key] = body[key] === true;
      changed.push(key);
    }

    // Text-message consent always carries the number it applies to.
    if (updates.sms_opted_in === true) {
      const phone = (updates.sms_phone || staff.sms_phone || '').trim();
      if (!phone) {
        return Response.json({ error: 'Add a mobile number before opting in to text messages.' }, { status: 400 });
      }
      updates.sms_phone = phone;
    }
    if ('sms_opted_in' in updates) {
      if (updates.sms_opted_in && staff.sms_opted_in !== true) updates.sms_opted_in_at = new Date().toISOString();
      if (!updates.sms_opted_in && staff.sms_opted_in === true) updates.sms_opted_out_at = new Date().toISOString();
    }

    // Certification evidence: always lands as Pending verification.
    if (body.certification) {
      const c = body.certification;
      const name = cleanText(c?.name).slice(0, 120);
      if (!name) return Response.json({ error: 'Certification name is required.' }, { status: 400 });
      const dateOnly = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
      const evidence = typeof c?.doc_url === 'string' ? c.doc_url : '';
      updates.certifications = [
        ...(staff.certifications || []),
        {
          name,
          issue_date: dateOnly(c?.issue_date),
          expiry_date: dateOnly(c?.expiry_date),
          status: 'Current',
          doc_url: evidence,
          doc_name: cleanText(c?.doc_name).slice(0, 120),
          verification_status: 'Pending verification',
          submitted_by_staff: true,
          submitted_at: new Date().toISOString(),
        },
      ];
      changed.push('certifications');
    }

    // Onboarding progress — resumes the wizard after a close/reopen.
    if ('onboarding_step' in body) {
      const step = Number(body.onboarding_step);
      if (!Number.isInteger(step) || step < 0 || step > 20) {
        return Response.json({ error: 'Invalid onboarding step.' }, { status: 400 });
      }
      updates.onboarding_step = step;
      changed.push('onboarding_step');
    }

    if (body.onboarding_completed === true) {
      updates.onboarding_completed_at = new Date().toISOString();
      changed.push('onboarding_completed_at');
    }

    if (changed.length === 0) return Response.json({ ok: true, changed: [] });

    await svc.StaffMember.update(staff.id, updates);

    await svc.AuditLog.create({
      action: 'Staff profile self-updated',
      actor_id: caller.id,
      actor_name: caller.full_name || caller.email || '',
      actor_email: caller.email || '',
      target_type: 'StaffMember',
      target_id: staff.id,
      target_name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim(),
      details: JSON.stringify({ fields: changed }),
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({ ok: true, changed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}