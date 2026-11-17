import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getCaller, unauthorized, forbidden } from '../../shared/functionAuth.ts';

// Rights modification lifecycle. Activation and renewal are decided here, not in
// the browser: an active modification restricts a person's rights, so the record
// must prove approval and consent before it can limit anything.

const ELEMENT_FIELDS = [
  'assessed_need', 'positive_interventions', 'less_intrusive_methods', 'condition_description',
  'data_collection_review', 'review_time_limits', 'informed_consent', 'no_harm_assurance',
];

function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
}

function addDaysISO(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(n || 0));
  return d.toISOString().slice(0, 10);
}

function missingElements(mod) {
  return ELEMENT_FIELDS.filter((f) => !String(mod?.[f] || '').trim());
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getCaller(base44);
    if (!user) return unauthorized();
    if (user.role !== 'admin' && user.role !== 'manager') return forbidden();

    const body = await req.json().catch(() => ({}));
    const { action, id, note = '', outcome = 'Continued' } = body;
    if (!id || !action) return Response.json({ error: 'action and id are required' }, { status: 400 });
    if (action === 'approve' && user.role !== 'admin') return forbidden();

    const db = base44.asServiceRole.entities;
    const mod = await db.RightsModification.get(id);
    if (!mod) return Response.json({ error: 'Rights modification not found' }, { status: 404 });

    const actor = user.full_name || user.email;
    const now = new Date().toISOString();
    const appendHistory = (status, historyNote) => [
      ...(mod.history || []),
      { status, changed_at: now, changed_by: actor, note: historyNote || '' },
    ];

    const syncPlanFlag = async () => {
      if (!mod.pcsp_id) return;
      const active = await db.RightsModification.filter({ pcsp_id: mod.pcsp_id });
      const anyActive = active.some((m) =>
        (m.status === 'Active' || m.status === 'Under review') && m.id !== mod.id
      ) || ['Active', 'Under review'].includes(mod.status);
      await db.ISPlan.update(mod.pcsp_id, { rights_modifications_present: anyActive });
    };

    const audit = (oldStatus, newStatus) => db.AuditLog.create({
      action: 'rights_modification_status_change',
      event_type: 'generic',
      actor_id: user.id,
      actor_name: actor,
      actor_email: user.email,
      actor_role: user.role,
      target_type: 'RightsModification',
      target_id: mod.id,
      target_name: `${mod.client_name || 'Person'} · ${mod.right_affected || 'Rights modification'}`,
      field: 'status',
      old_value: oldStatus,
      new_value: newStatus,
      details: note || outcome || '',
      timestamp: now,
    });

    if (action === 'approve') {
      if (mod.status !== 'Draft' && mod.status !== 'Approved') {
        return Response.json({ error: 'Only a draft can be approved' }, { status: 400 });
      }
      const missing = missingElements(mod);
      if (missing.length) return Response.json({ error: 'The eight documented elements are incomplete' }, { status: 400 });
      if (!mod.approved_by || !mod.approval_date) {
        return Response.json({ error: 'Approved by and approval date are required' }, { status: 400 });
      }
      const updated = await db.RightsModification.update(id, {
        status: 'Approved',
        history: appendHistory('Approved', `Approved by ${mod.approved_by}${mod.approval_body ? ` (${mod.approval_body})` : ''}`),
      });
      await audit(mod.status, 'Approved');
      return Response.json({ record: updated });
    }

    if (action === 'activate') {
      if (mod.status !== 'Approved') {
        return Response.json({ error: 'Admin approval is required before activation' }, { status: 400 });
      }
      const missing = missingElements(mod);
      if (missing.length) return Response.json({ error: 'The eight documented elements are incomplete' }, { status: 400 });
      if (!mod.approved_by || !mod.approval_date) {
        return Response.json({ error: 'Approval is required before activation' }, { status: 400 });
      }
      if (!mod.consent_by || !mod.consent_date) {
        return Response.json({ error: 'Consent is required before activation' }, { status: 400 });
      }
      if (!mod.review_interval_days) {
        return Response.json({ error: 'A review interval is required' }, { status: 400 });
      }
      const next = addDaysISO(todayISO(), mod.review_interval_days);
      const updated = await db.RightsModification.update(id, {
        status: 'Active',
        next_review_date: next,
        history: appendHistory('Active', `Activated · next review ${next}`),
      });
      mod.status = 'Active';
      await syncPlanFlag();
      await audit('Approved', 'Active');
      return Response.json({ record: updated, next_review_date: next });
    }

    if (action === 'record_review') {
      if (!['Active', 'Under review'].includes(mod.status)) {
        return Response.json({ error: 'Only an active modification can be reviewed' }, { status: 400 });
      }
      const next = addDaysISO(todayISO(), mod.review_interval_days || 90);
      const updated = await db.RightsModification.update(id, {
        status: 'Active',
        next_review_date: next,
        history: appendHistory('Active', `Reviewed — ${outcome}${note ? `: ${note}` : ''}`),
        reviews: [
          ...(mod.reviews || []),
          { reviewed_at: now, reviewed_by: actor, outcome, note, next_review_date: next },
        ],
      });
      await audit(mod.status, 'Active');
      return Response.json({ record: updated, next_review_date: next });
    }

    if (action === 'end') {
      if (!String(note || '').trim()) return Response.json({ error: 'A reason is required to end it' }, { status: 400 });
      if (mod.status === 'Ended') return Response.json({ error: 'Already ended' }, { status: 400 });
      const updated = await db.RightsModification.update(id, {
        status: 'Ended',
        end_date: todayISO(),
        end_reason: note,
        ended_at: now,
        ended_by: actor,
        history: appendHistory('Ended', note),
      });
      mod.status = 'Ended';
      await syncPlanFlag();
      await audit(mod.status, 'Ended');
      return Response.json({ record: updated });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}