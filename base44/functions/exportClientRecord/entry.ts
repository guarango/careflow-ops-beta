import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getCaller, unauthorized, forbidden } from '../../shared/functionAuth.ts';

// One client's full record, live plus archived, in a shape the PDF and CSV
// builders can print without knowing each entity's schema.

const SECTIONS = [
  { key: 'SessionNote', label: 'Session notes', dateFields: ['date'], titleFields: ['service_code', 'client_name'], detailFields: ['summary', 'summary_note', 'status'] },
  { key: 'ClientGoal', label: 'Goals', dateFields: ['start_date', 'created_date'], titleFields: ['goal_title'], detailFields: ['status', 'domain'] },
  { key: 'MonthlySummary', label: 'Monthly summaries', dateFields: ['period_end'], titleFields: ['month_year'], detailFields: ['status', 'how_month_went'] },
  { key: 'QuarterlySummary', label: 'Quarterly summaries', dateFields: ['period_end'], titleFields: ['quarter'], detailFields: ['status', 'services_summary'] },
  { key: 'ISPlan', label: 'PCSPs', dateFields: ['plan_year_end', 'created_date'], titleFields: ['plan_year_start'], detailFields: ['status', 'plan_type'] },
  { key: 'RightsModification', label: 'Rights modifications', dateFields: ['next_review_date', 'end_date'], titleFields: ['right_affected'], detailFields: ['status', 'condition_description'] },
  { key: 'IncidentReport', label: 'Incidents', dateFields: ['incident_date', 'date'], titleFields: ['incident_type', 'title'], detailFields: ['status', 'description'] },
  { key: 'BehaviorIncident', label: 'Behavior incidents', dateFields: ['date', 'incident_date'], titleFields: ['behavior_type', 'title'], detailFields: ['status', 'description'] },
  { key: 'Medication', label: 'Medications', dateFields: ['created_date'], titleFields: ['medication_name', 'name'], detailFields: ['dosage', 'frequency'] },
  { key: 'MedicationLog', label: 'Medication records', dateFields: ['scheduled_date', 'administered_at'], titleFields: ['medication_name'], detailFields: ['status', 'notes'] },
];

const ENTITY = {
  SessionNote: 'SessionNote', ClientGoal: 'ClientGoal', MonthlySummary: 'MonthlySummary',
  QuarterlySummary: 'QuarterlySummary', ISPlan: 'ISPlan', RightsModification: 'RightsModification',
  IncidentReport: 'IncidentReport', BehaviorIncident: 'BehaviorIncident',
  Medication: 'Medication', MedicationLog: 'MedicationLog',
};

function firstValue(record: any, fields: string[]) {
  for (const f of fields) {
    const v = record?.[f];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  return '';
}

function shortDate(value: string) {
  if (!value) return '';
  const m = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getCaller(base44);
    if (!user) return unauthorized();
    if (user.role !== 'admin' && user.role !== 'manager') return forbidden();

    const { client_id } = await req.json().catch(() => ({}));
    if (!client_id) return Response.json({ error: 'client_id is required' }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const client = await db.Client.get(client_id);
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const sections = [];
    for (const section of SECTIONS) {
      const rows = await db[ENTITY[section.key]].filter({ client_id }).catch(() => []);
      sections.push({
        key: section.key,
        label: section.label,
        rows: rows.map((r: any) => ({
          date: shortDate(firstValue(r, section.dateFields)),
          title: firstValue(r, section.titleFields) || section.label,
          detail: firstValue(r, section.detailFields).slice(0, 500),
        })),
      });
    }

    const archived = await db.ClinicalArchive.filter({ client_id });
    const live = archived.filter((a: any) => !a.purged);

    const safetyPlan = client.legal_hold
      ? 'Legal hold on file'
      : '';

    const payload = {
      generated_at: new Date().toISOString(),
      generated_by: user.full_name || user.email,
      client: {
        id: client.id,
        name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        date_of_birth: client.date_of_birth || '',
        medicaid_id: client.medicaid_id || '',
        status: client.status || '',
        diagnosis: client.diagnosis || '',
        house_id: client.house_id || '',
        safety_note: safetyPlan,
      },
      sections,
      archived: live.map((a: any) => ({
        entity_name: a.entity_name,
        label: a.record_label,
        archived_at: a.archived_at,
        retention_until: a.retention_until,
        reason: a.reason || '',
        snapshot: a.snapshot,
      })),
      counts: {
        records: sections.reduce((n, s) => n + s.rows.length, 0),
        archived: live.length,
      },
    };

    await db.AuditLog.create({
      action: 'client_record_exported',
      event_type: 'generic',
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      actor_role: user.role,
      target_type: 'Client',
      target_id: client_id,
      target_name: payload.client.name,
      details: `${payload.counts.records} live record(s) and ${payload.counts.archived} archived record(s) exported as PDF and CSV`,
      timestamp: new Date().toISOString(),
    });

    return Response.json(payload);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}