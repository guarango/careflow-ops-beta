import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getCaller, unauthorized, forbidden } from '../../shared/functionAuth.ts';
import { computeRetentionUntil, DEFAULT_SETTINGS, localTodayISO } from '../../shared/retention.ts';

// Archive replaces delete for clinical records. The live record is moved into
// ClinicalArchive with a full snapshot and the retention end date; nothing is
// destroyed before that date, and never for a person on legal hold.

const SOURCES = {
  SessionNote: {
    entity: (db: any) => db.SessionNote,
    dateFields: ['date'],
    label: (r: any) => `Session note · ${r.date || ''} ${r.service_code || ''}`.trim(),
  },
  ClientGoal: {
    entity: (db: any) => db.ClientGoal,
    dateFields: ['start_date', 'baseline_date', 'created_date'],
    label: (r: any) => `Goal · ${r.goal_title || ''}`.trim(),
  },
  MonthlySummary: {
    entity: (db: any) => db.MonthlySummary,
    dateFields: ['period_end', 'due_date'],
    label: (r: any) => `Monthly summary · ${r.month_year || ''}`.trim(),
  },
  QuarterlySummary: {
    entity: (db: any) => db.QuarterlySummary,
    dateFields: ['period_end', 'due_date'],
    label: (r: any) => `Quarterly summary · ${r.quarter || ''}`.trim(),
  },
  ISPlan: {
    entity: (db: any) => db.ISPlan,
    dateFields: ['plan_year_end', 'activation_date', 'created_date'],
    label: (r: any) => `PCSP · ${r.plan_year_start || ''} to ${r.plan_year_end || ''}`.trim(),
  },
  RightsModification: {
    entity: (db: any) => db.RightsModification,
    dateFields: ['end_date', 'next_review_date', 'created_date'],
    label: (r: any) => `Rights modification · ${r.right_affected || ''}`.trim(),
  },
  IncidentReport: {
    entity: (db: any) => db.IncidentReport,
    dateFields: ['incident_date', 'date', 'created_date'],
    label: (r: any) => `Incident · ${r.incident_date || r.date || ''}`.trim(),
  },
  BehaviorIncident: {
    entity: (db: any) => db.BehaviorIncident,
    dateFields: ['date', 'incident_date', 'created_date'],
    label: (r: any) => `Behavior incident · ${r.date || r.incident_date || ''}`.trim(),
  },
  Medication: {
    entity: (db: any) => db.Medication,
    dateFields: ['created_date'],
    label: (r: any) => `Medication · ${r.medication_name || r.name || ''}`.trim(),
  },
  MedicationLog: {
    entity: (db: any) => db.MedicationLog,
    dateFields: ['scheduled_date', 'administered_at', 'created_date'],
    label: (r: any) => `Medication record · ${r.scheduled_date || ''} ${r.medication_name || ''}`.trim(),
  },
};

function firstDate(record: any, fields: string[], fallback: string) {
  for (const f of fields) {
    const v = record?.[f];
    if (typeof v === 'string' && v.slice(0, 10).match(/^\d{4}-\d{2}-\d{2}/)) return v.slice(0, 10);
  }
  return fallback;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getCaller(base44);
    if (!user) return unauthorized();
    if (user.role !== 'admin' && user.role !== 'manager') return forbidden();

    const { entity_name, record_id, reason = '', last_service_date } = await req.json().catch(() => ({}));
    const source = SOURCES[entity_name];
    if (!source) return Response.json({ error: 'This record type cannot be archived here.' }, { status: 400 });
    if (!record_id) return Response.json({ error: 'record_id is required' }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const already = await db.ClinicalArchive.filter({ entity_name, record_id });
    if (already.some((a: any) => !a.purged)) {
      return Response.json({ error: 'This record is already archived.' }, { status: 409 });
    }

    const record = await source.entity(db).get(record_id);
    if (!record) return Response.json({ error: 'Record not found' }, { status: 404 });

    const clientId = record.client_id || '';
    const client = clientId ? await db.Client.get(clientId).catch(() => null) : null;
    const settings = (await db.RetentionSettings.list('-created_date', 1))[0] || DEFAULT_SETTINGS;
    const holds = await db.LegalHold.filter({ client_id: clientId, active: true });
    const today = localTodayISO();
    const serviceDate = last_service_date || firstDate(record, source.dateFields, today);
    const retentionUntil = computeRetentionUntil({ settings, client, lastServiceDate: serviceDate });

    const archive = await db.ClinicalArchive.create({
      entity_name,
      record_id,
      client_id: clientId,
      client_name: record.client_name || (client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : ''),
      record_label: source.label(record),
      last_service_date: serviceDate,
      retention_until: retentionUntil,
      snapshot: record,
      archived_by: user.id,
      archived_by_name: user.full_name || user.email,
      archived_at: new Date().toISOString(),
      reason,
      legal_hold_at_archive: holds.length > 0,
      purge_eligible: false,
      purged: false,
    });

    await source.entity(db).delete(record_id);

    await db.AuditLog.create({
      action: 'record_archived',
      event_type: 'generic',
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      actor_role: user.role,
      target_type: entity_name,
      target_id: record_id,
      target_name: archive.record_label,
      field: 'status',
      old_value: 'Live',
      new_value: 'Archived',
      details: `Retention until ${retentionUntil}${reason ? ` · ${reason}` : ''}`,
      timestamp: new Date().toISOString(),
    });

    return Response.json({ archive, retention_until: retentionUntil });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}