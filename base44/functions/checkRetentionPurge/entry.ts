import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireAdmin } from '../../shared/functionAuth.ts';
import { isPastRetention, localTodayISO } from '../../shared/retention.ts';

// Nightly: list archived records whose retention has passed for Admin review.
// Nothing is purged here. A person on legal hold is never made eligible.

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) return auth.error;
    const db = base44.asServiceRole.entities;

    const today = localTodayISO();
    const archived = await db.ClinicalArchive.list('-archived_at', 500);
    const holds = await db.LegalHold.filter({ active: true });
    const heldClients = new Set(holds.map((h: any) => h.client_id));
    const open = archived.filter((a: any) => !a.purged);

    let eligible = 0;
    let heldBack = 0;
    for (const row of open) {
      const onHold = heldClients.has(row.client_id);
      const past = isPastRetention(row.retention_until, today);
      const shouldBeEligible = past && !onHold;
      if (past && onHold) heldBack += 1;
      if (shouldBeEligible) eligible += 1;
      if (!!row.purge_eligible !== shouldBeEligible) {
        await db.ClinicalArchive.update(row.id, { purge_eligible: shouldBeEligible });
      }
    }

    await db.AuditLog.create({
      action: 'retention_purge_scan',
      event_type: 'generic',
      actor_name: 'System',
      actor_role: 'system',
      target_type: 'ClinicalArchive',
      target_name: 'Retention purge review',
      details: `${eligible} record(s) past retention awaiting the Admin · ${heldBack} held back by legal hold`,
      timestamp: new Date().toISOString(),
    });

    return Response.json({ success: true, today, scanned: open.length, eligible, heldBack });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}