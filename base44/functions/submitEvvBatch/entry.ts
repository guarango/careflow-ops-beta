import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { generateEvvCsv, buildSoapEnvelope, parseSoapAcknowledgement } from '../../shared/evvUtils.ts';

/**
 * Submit a batch of EVV records to the state Medicaid system.
 *
 * Supports two submission methods:
 *  - "csv": Generates a CSV file for manual portal upload. Returns the CSV as
 *           a downloadable file response.
 *  - "soap": Submits via SOAP API with WS-Security. Returns the acknowledgement.
 *
 * Input: {
 *   agency_id, integration_key, submission_method ("csv"|"soap"),
 *   test_mode (boolean), record_ids (string[]) — if omitted, submits all pending
 * }
 *
 * For "csv", the response is a file download (text/csv).
 * For "soap", the response is JSON with the acknowledgement result.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { agency_id, integration_key, submission_method, test_mode, record_ids } = body;

    if (!agency_id || !integration_key) {
      return Response.json({ error: 'agency_id and integration_key are required' }, { status: 400 });
    }

    const method = submission_method || 'csv';

    // Fetch the integration config
    const { items: integrations } = await base44.asServiceRole.entities.Integration.filter(
      { agency_id, integration_key },
      { limit: 1 }
    );
    const integration = integrations[0];
    if (!integration) {
      return Response.json({ error: 'Integration not configured. Please configure it first.' }, { status: 404 });
    }

    const agency = await base44.asServiceRole.entities.Agency.get(agency_id);
    const credentials = integration.credentials || {};

    // Build EVV records by calling buildEvvRecords function
    const buildResponse = await base44.functions.invoke('buildEvvRecords', {
      agency_id,
    });
    const buildResult = buildResponse.data || buildResponse;

    let records = buildResult.records || [];
    if (record_ids && record_ids.length > 0) {
      records = records.filter(r => record_ids.includes(r.shift_id));
    }

    if (records.length === 0) {
      return Response.json({
        error: 'No valid EVV records to submit',
        errors: buildResult.errors || [],
      }, { status: 400 });
    }

    // Log the submission attempt
    const batchId = `EVV-BATCH-${Date.now()}`;
    await base44.asServiceRole.entities.IntegrationLog.create({
      agency_id,
      integration_key,
      integration_name: integration.integration_name,
      direction: 'outbound',
      record_type: 'evv_submission',
      record_count: records.length,
      status: 'pending',
      triggered_by: 'manual',
      payload_summary: `EVV batch submission (${method}) - ${records.length} records - ${test_mode ? 'TEST' : 'PRODUCTION'}`,
    });

    // ── CSV Method: Generate and return CSV file ────────────────────────────
    if (method === 'csv') {
      const csv = generateEvvCsv(records, agency, credentials);
      const filename = `utah_evv_${new Date().toISOString().split('T')[0]}_${batchId}.csv`;

      // Update EVVLog records to "Submitted"
      const evvLogIds = records.map(r => r.evv_log_id).filter(Boolean);
      if (evvLogIds.length > 0) {
        await base44.asServiceRole.entities.EVVLog.updateMany(
          { id: { $in: evvLogIds } },
          { $set: { status: 'Submitted', submitted_at: new Date().toISOString() } }
        );
      }

      // Update integration record
      await base44.asServiceRole.entities.Integration.update(integration.id, {
        last_submission_at: new Date().toISOString(),
        last_submission_batch_id: batchId,
        last_submission_record_count: records.length,
        last_submission_status: 'pending',
        records_synced_24h: (integration.records_synced_24h || 0) + records.length,
        total_records_synced: (integration.total_records_synced || 0) + records.length,
      });

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ── SOAP Method: Submit to API endpoint ─────────────────────────────────
    if (method === 'soap') {
      const endpoint = credentials.api_endpoint || integration.api_endpoint || 'https://evv.medicaid.utah.gov/evv-api/services/EVVSubmission';
      const soapEnvelope = buildSoapEnvelope(records, agency, credentials);

      const apiUrl = test_mode
        ? endpoint.replace('/evv-api/', '/evv-api-test/')
        : endpoint;

      const fetchResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://evv.medicaid.utah.gov/evv-api/EVVSubmission',
        },
        body: soapEnvelope,
        signal: AbortSignal.timeout(30000),
      });

      const responseText = await fetchResponse.text();
      const acknowledgement = parseSoapAcknowledgement(responseText);

      // Update EVVLog records based on acknowledgement
      const evvLogIds = records.map(r => r.evv_log_id).filter(Boolean);
      if (evvLogIds.length > 0) {
        const logStatus = acknowledgement.accepted ? 'Accepted' : 'Rejected';
        await base44.asServiceRole.entities.EVVLog.updateMany(
          { id: { $in: evvLogIds } },
          {
            $set: {
              status: logStatus,
              submitted_at: new Date().toISOString(),
              aggregator_response: responseText.substring(0, 5000),
            },
          }
        );
      }

      // Update integration record
      await base44.asServiceRole.entities.Integration.update(integration.id, {
        last_sync_at: new Date().toISOString(),
        last_submission_at: new Date().toISOString(),
        last_submission_batch_id: acknowledgement.batchId || batchId,
        last_submission_record_count: records.length,
        last_submission_status: acknowledgement.accepted ? 'accepted' : 'rejected',
        last_sync_status: acknowledgement.accepted ? 'success' : 'error',
        records_synced_24h: (integration.records_synced_24h || 0) + records.length,
        total_records_synced: (integration.total_records_synced || 0) + records.length,
      });

      return Response.json({
        success: acknowledgement.accepted,
        batchId: acknowledgement.batchId || batchId,
        recordCount: records.length,
        testMode: test_mode,
        acknowledgement,
        errors: buildResult.errors || [],
      });
    }

    return Response.json({ error: `Unsupported submission method: ${method}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}