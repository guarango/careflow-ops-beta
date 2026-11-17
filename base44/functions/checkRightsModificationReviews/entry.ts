import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireAdmin } from '../../shared/functionAuth.ts';

// Nightly rights-modification review check (42 CFR 441.301(c)(4)(vi)(F)(5)-(6)).
// A passed review date flips the modification to Under review, the Manager is
// alerted 14 days ahead, and each PCSP's rights_modifications_present flag is
// kept true exactly while a modification on it is active.

const DAY = 86400000;

function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
}

function daysBetween(fromISO, toISO) {
  return Math.round((Date.parse(`${toISO}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`)) / DAY);
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) return auth.error;
    const db = base44.asServiceRole.entities;

    const today = todayISO();
    const mods = await db.RightsModification.list('-created_date', 500);
    const plans = await db.ISPlan.list('-created_date', 500);
    const managers = await db.User.filter({ role: 'manager' });
    const existingAlertSourceIds = new Set(
      (await db.AppNotification.list('-created_date', 500))
        .filter((n) => n.trigger_stage === 'rights_review_14day')
        .map((n) => n.source_id)
    );

    let flipped = 0;
    let notified = 0;

    for (const mod of mods) {
      if (mod.status !== 'Active' || !mod.next_review_date) continue;
      const days = daysBetween(today, mod.next_review_date);

      if (days < 0) {
        await db.RightsModification.update(mod.id, {
          status: 'Under review',
          history: [
            ...(mod.history || []),
            {
              status: 'Under review',
              changed_at: new Date().toISOString(),
              changed_by: 'System (review date passed)',
              note: `Review was due ${mod.next_review_date}`,
            },
          ],
        });
        await db.AuditLog.create({
          action: 'rights_modification_review_overdue',
          event_type: 'generic',
          actor_name: 'System',
          actor_role: 'system',
          target_type: 'RightsModification',
          target_id: mod.id,
          target_name: `${mod.client_name || 'Person'} · ${mod.right_affected || 'Rights modification'}`,
          field: 'status',
          old_value: 'Active',
          new_value: 'Under review',
          details: `Review was due ${mod.next_review_date}`,
          timestamp: new Date().toISOString(),
        });
        flipped += 1;
        continue;
      }

      if (days <= 14 && !existingAlertSourceIds.has(mod.id)) {
        for (const manager of managers) {
          await db.AppNotification.create({
            type: 'compliance_expiring',
            event_key: 'rights_review_due',
            severity: days <= 2 ? 'action' : 'fyi',
            source_entity: 'RightsModification',
            source_id: mod.id,
            recipient_user_id: manager.id,
            recipient_email: manager.email,
            recipient_role: 'staff',
            client_id: mod.client_id,
            message: `A rights modification review is due in ${days} day${days === 1 ? '' : 's'}.`,
            deep_link: `/clients/${mod.client_id}`,
            status: 'unread',
            trigger_stage: 'rights_review_14day',
            reminder_rule: 'rights_review_due',
            channels: ['in_app'],
          });
          notified += 1;
        }
        existingAlertSourceIds.add(mod.id);
      }
    }

    // Keep each PCSP's flag true only while a modification on it is live.
    let plansUpdated = 0;
    for (const plan of plans) {
      const shouldBe = mods.some(
        (m) => m.pcsp_id === plan.id && (m.status === 'Active' || m.status === 'Under review')
      );
      if (!!plan.rights_modifications_present !== shouldBe) {
        await db.ISPlan.update(plan.id, { rights_modifications_present: shouldBe });
        plansUpdated += 1;
      }
    }

    return Response.json({ success: true, today, flipped, notified, plansUpdated });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}