import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { applyStaffAccess } from '../../shared/staffAccess.ts';

/**
 * setStaffAccess — the ONLY way app access changes.
 *
 * Payload: { staffId, action?, app_access?, hr_bundle?, billing_bundle?, status?, reason? }
 *   action: 'set_access' (default) | 'deactivate' | 'reactivate' | 'cancel_invite'
 *
 * Updates the StaffMember (app_access, bundles, status + timestamps) and mirrors the
 * values onto the person's linked login (role, hr_bundle, billing_bundle, is_deactivated)
 * in the same call, then writes an AuditLog entry with the old and new values.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    if (!body.staffId) return Response.json({ error: 'staffId is required' }, { status: 400 });

    const result = await applyStaffAccess(base44, {
      staffId: body.staffId,
      app_access: body.app_access,
      hr_bundle: body.hr_bundle,
      billing_bundle: body.billing_bundle,
      status: body.status,
      reason: body.reason,
      action: body.action || 'set_access',
      actor: user,
    });

    return Response.json({ success: true, ...result });
  } catch (error) {
    const message = error.message || 'Access change failed';
    const clientError = /required|Invalid|only|not found|can be cancelled/i.test(message);
    return Response.json({ error: message }, { status: clientError ? 400 : 500 });
  }
}