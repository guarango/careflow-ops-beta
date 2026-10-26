import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { buildEvvRecord, validateEvvRecord } from '../../shared/evvUtils.ts';

/**
 * Build EVV records from completed shifts.
 *
 * Pulls ShiftSchedule records with status=Completed that have EVV clock-in/out
 * data, joins with EVVLog + Client + Agency, and assembles EVV records using
 * the Cures Act required data elements.
 *
 * Input: { agency_id, date_from, date_to }
 * Returns: { records, errors, summary }
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { agency_id, date_from, date_to } = body;

    if (!agency_id) return Response.json({ error: 'agency_id is required' }, { status: 400 });

    // Fetch the agency record
    const agency = await base44.asServiceRole.entities.Agency.get(agency_id);

    // Fetch completed shifts with EVV data in the date range
    const shiftQuery = {
      status: 'Completed',
      agency_id, // if agency_id is stored on shifts; otherwise filter by client assignments
    };
    if (date_from || date_to) {
      shiftQuery.date = {};
      if (date_from) shiftQuery.date.$gte = date_from;
      if (date_to) shiftQuery.date.$lte = date_to;
    }

    const { items: shifts } = await base44.asServiceRole.entities.ShiftSchedule.filter(
      { status: 'Completed', ...(date_from || date_to ? { date: { ...(date_from && { $gte: date_from }), ...(date_to && { $lte: date_to }) } } : {}) },
      { sort: '-date', limit: 500 }
    );

    if (shifts.length === 0) {
      return Response.json({
        records: [],
        errors: [],
        summary: { total: 0, valid: 0, invalid: 0, message: 'No completed shifts found in date range.' },
      });
    }

    // Fetch related EVVLog records by shift_id
    const shiftIds = shifts.map(s => s.id);
    const { items: evvLogs } = await base44.asServiceRole.entities.EVVLog.filter(
      { shift_id: { $in: shiftIds } },
      { limit: 500 }
    );
    const evvLogMap = {};
    for (const log of evvLogs) {
      if (log.shift_id) evvLogMap[log.shift_id] = log;
    }

    // Fetch related Client records
    const clientIds = [...new Set(shifts.map(s => s.client_id).filter(Boolean))];
    const { items: clients } = await base44.asServiceRole.entities.Client.filter(
      { id: { $in: clientIds } },
      { limit: 200 }
    );
    const clientMap = {};
    for (const c of clients) clientMap[c.id] = c;

    // Build EVV records
    const records = [];
    const errors = [];

    for (const shift of shifts) {
      const evvLog = evvLogMap[shift.id];
      const client = clientMap[shift.client_id];

      // Skip shifts without EVV clock-in/out data
      if (!shift.evv_clock_in && !evvLog?.clock_in) {
        errors.push({
          shift_id: shift.id,
          client_name: shift.client_name,
          staff_name: shift.staff_name,
          date: shift.date,
          error: 'Missing EVV clock-in/out data',
        });
        continue;
      }

      const record = buildEvvRecord(shift, evvLog, client, agency);
      const validation = validateEvvRecord(record);

      if (!validation.valid) {
        errors.push({
          shift_id: shift.id,
          client_name: shift.client_name,
          staff_name: shift.staff_name,
          date: shift.date,
          error: `Missing required fields: ${validation.missingFields.join(', ')}`,
          missingFields: validation.missingFields,
        });
        continue;
      }

      records.push(record);
    }

    return Response.json({
      records,
      errors,
      summary: {
        total: shifts.length,
        valid: records.length,
        invalid: errors.length,
        agency_npi: agency?.npi,
        provider_id: agency?.medicaid_provider_id,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}