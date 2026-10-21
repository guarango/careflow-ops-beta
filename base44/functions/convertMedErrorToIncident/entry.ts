import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Converts a MedicationLog (med error) into an IncidentReport
// Called by managers from the Med Error Review Queue

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { medicationLogId, followupNotes } = body;

    if (!medicationLogId) {
      return Response.json({ error: 'medicationLogId is required' }, { status: 400 });
    }

    // Fetch the medication log
    const medLog = await base44.asServiceRole.entities.MedicationLog.get(medicationLogId);
    if (!medLog) {
      return Response.json({ error: 'Medication log not found' }, { status: 404 });
    }

    // Determine incident type based on med log status
    let incidentType = 'Medication Error';
    if (medLog.status === 'Missed') incidentType = 'Medication Error';
    else if (medLog.status === 'Refused') incidentType = 'Medication Error';
    else if (medLog.status === 'Held') incidentType = 'Medication Error';
    else if (medLog.status === 'Not Available') incidentType = 'Medication Error';

    const description = `Medication administration error: ${medLog.status} for ${medLog.medication_name}.
Reason: ${medLog.reason || 'Not provided'}
Staff: ${medLog.administered_by_name || 'Unknown'}
Date: ${medLog.date} at ${medLog.time || 'N/A'}
${medLog.notes ? `Notes: ${medLog.notes}` : ''}
${followupNotes ? `Manager follow-up: ${followupNotes}` : ''}`;

    // Create the incident report
    const incident = await base44.asServiceRole.entities.IncidentReport.create({
      client_id: medLog.client_id,
      client_name: medLog.client_name,
      reported_by: user.id,
      reported_by_name: user.full_name || user.email,
      date: medLog.date,
      time: medLog.time || new Date().toTimeString().slice(0, 5),
      type: incidentType,
      severity: medLog.is_late ? 'Medium' : 'Low',
      description,
      actions_taken: followupNotes || 'Converted from medication error review queue.',
      follow_up_required: true,
      follow_up_notes: followupNotes || '',
      status: 'Open',
    });

    // Update the medication log
    await base44.asServiceRole.entities.MedicationLog.update(medicationLogId, {
      review_status: 'converted',
      review_followup: followupNotes || '',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      converted_to_incident_id: incident.id,
    });

    return Response.json({
      success: true,
      incidentId: incident.id,
      medicationLogId,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});