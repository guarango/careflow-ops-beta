import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getCaller, unauthorized, forbidden } from '../../shared/functionAuth.ts';

// Legal hold beats every date rule: while active, the person's archived records
// are never purge-eligible and can never be confirmed for purge.

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getCaller(base44);
    if (!user) return unauthorized();
    if (user.role !== 'admin') return forbidden();

    const { client_id, active, reason = '' } = await req.json().catch(() => ({}));
    if (!client_id) return Response.json({ error: 'client_id is required' }, { status: 400 });
    if (active && !String(reason).trim()) {
      return Response.json({ error: 'A reason is required to place a legal hold.' }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;
    const client = await db.Client.get(client_id);
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });
    const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
    const existing = (await db.LegalHold.filter({ client_id }))[0];
    const now = new Date().toISOString();
    const actor = user.full_name || user.email;

    const payload = active
      ? { active: true, reason, set_by: user.id, set_by_name: actor, set_at: now, released_by: '', released_by_name: '', released_at: '' }
      : { active: false, released_by: user.id, released_by_name: actor, released_at: now };

    const record = existing
      ? await db.LegalHold.update(existing.id, payload)
      : await db.LegalHold.create({ client_id, client_name: clientName, ...payload });

    // A released hold does not make anything purgeable by itself — the nightly
    // job re-evaluates dates before anything becomes eligible.
    if (!active && existing) {
      const archived = await db.ClinicalArchive.filter({ client_id, purged: false });
      for (const row of archived) {
        if (row.purge_eligible) await db.ClinicalArchive.update(row.id, { purge_eligible: false });
      }
    }

    await db.AuditLog.create({
      action: active ? 'legal_hold_set' : 'legal_hold_released',
      event_type: 'generic',
      actor_id: user.id,
      actor_name: actor,
      actor_email: user.email,
      actor_role: user.role,
      target_type: 'Client',
      target_id: client_id,
      target_name: clientName,
      field: 'legal_hold',
      old_value: existing?.active ? 'On' : 'Off',
      new_value: active ? 'On' : 'Off',
      details: reason || 'Legal hold released',
      timestamp: now,
    });

    return Response.json({ record });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}