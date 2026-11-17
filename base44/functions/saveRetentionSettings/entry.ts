import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getCaller, unauthorized, forbidden } from '../../shared/functionAuth.ts';

// Super Admin sets the state default; an Admin may only lengthen the agency's
// period, and only a Super Admin can confirm the rule.

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getCaller(base44);
    if (!user) return unauthorized();
    const isSuper = user.is_super_admin === true;
    if (user.role !== 'admin' && !isSuper) return forbidden();

    const body = await req.json().catch(() => ({}));
    const db = base44.asServiceRole.entities;
    const existing = (await db.RetentionSettings.list('-created_date', 1))[0];

    const years = Number(body.retention_years_adult);
    if (!Number.isFinite(years) || years < 1) {
      return Response.json({ error: 'Retention must be at least one year.' }, { status: 400 });
    }

    if (!isSuper) {
      const currentYears = Number(existing?.retention_years_adult || 6);
      if (years < currentYears) {
        return Response.json({ error: 'An agency can only lengthen the state retention period, never shorten it.' }, { status: 400 });
      }
      if (body.rule_confirmed === true && existing?.rule_confirmed !== true) {
        return Response.json({ error: 'Only a Super Admin can confirm the retention rule.' }, { status: 403 });
      }
      if (body.state && existing?.state && body.state !== existing.state) {
        return Response.json({ error: 'Only a Super Admin can change the state rule set.' }, { status: 403 });
      }
    }

    const now = new Date().toISOString();
    const payload = {
      state: body.state || existing?.state || 'UT',
      retention_years_adult: years,
      retention_minor_rule: body.retention_minor_rule || existing?.retention_minor_rule || 'Later of 6 years or age 22',
      retention_basis: body.retention_basis || existing?.retention_basis || 'Last date of service',
      rule_confirmed: isSuper ? body.rule_confirmed === true : !!existing?.rule_confirmed,
      source: body.source || existing?.source || 'Prior DHS contract template (DHS90548, 2011) — DHHS91172 period not yet confirmed',
      notes: body.notes ?? existing?.notes ?? '',
      updated_by: user.id,
      updated_by_name: user.full_name || user.email,
      updated_at: now,
    };

    const record = existing
      ? await db.RetentionSettings.update(existing.id, payload)
      : await db.RetentionSettings.create(payload);

    await db.AuditLog.create({
      action: 'retention_settings_changed',
      event_type: 'generic',
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      actor_role: isSuper ? 'super_admin' : user.role,
      target_type: 'RetentionSettings',
      target_id: record.id,
      target_name: 'Data retention rule',
      field: 'retention_years_adult',
      old_value: existing ? String(existing.retention_years_adult) : '',
      new_value: String(payload.retention_years_adult),
      details: `${payload.state} · ${payload.retention_minor_rule}${payload.rule_confirmed ? ' · confirmed' : ' · unconfirmed'}`,
      timestamp: now,
    });

    return Response.json({ record });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}