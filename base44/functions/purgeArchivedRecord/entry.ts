import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getCaller, unauthorized, forbidden } from '../../shared/functionAuth.ts';
import { isPastRetention, localTodayISO } from '../../shared/retention.ts';

// Purge only happens here, only for an Admin, only for a record the nightly job
// marked eligible, and never for a person on legal hold. The archive row stays as
// the logged proof that the record existed and was destroyed.

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getCaller(base44);
    if (!user) return unauthorized();
    if (user.role !== 'admin') return forbidden();

    const { id, note = '' } = await req.json().catch(() => ({}));
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const row = await db.ClinicalArchive.get(id);
    if (!row) return Response.json({ error: 'Archived record not found' }, { status: 404 });
    if (row.purged) return Response.json({ error: 'This record was already purged.' }, { status: 400 });

    const holds = await db.LegalHold.filter({ client_id: row.client_id, active: true });
    if (holds.length) {
      return Response.json({ error: 'This person is on legal hold — nothing can be purged.' }, { status: 403 });
    }
    if (!isPastRetention(row.retention_until, localTodayISO())) {
      return Response.json({ error: `Still inside the retention window until ${row.retention_until}.` }, { status: 403 });
    }

    const now = new Date().toISOString();
    const actor = user.full_name || user.email;
    const updated = await db.ClinicalArchive.update(id, {
      purged: true,
      purged_at: now,
      purged_by: actor,
      purge_note: note,
      purge_eligible: false,
      snapshot: {},
    });

    await db.AuditLog.create({
      action: 'archive_purged',
      event_type: 'generic',
      actor_id: user.id,
      actor_name: actor,
      actor_email: user.email,
      actor_role: user.role,
      target_type: row.entity_name,
      target_id: row.record_id,
      target_name: `${row.client_name || 'Person'} · ${row.record_label || row.entity_name}`,
      field: 'record',
      old_value: 'Archived',
      new_value: 'Purged',
      details: `Retention ended ${row.retention_until}${note ? ` · ${note}` : ''}`,
      timestamp: now,
    });

    return Response.json({ archive: updated });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}