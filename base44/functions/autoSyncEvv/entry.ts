import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { generateEvvCsv, buildSoapEnvelope, parseSoapAcknowledgement } from '../../shared/evvUtils.ts';

/**
 * Auto-sync EVV records for all agencies with active SOAP integrations.
 *
 * Called by the daily EVV Auto-Sync workflow. Finds all active EVV integrations
 * with submission_method="soap", builds records for each, and submits them.
 *
 * Returns: { agencies_processed, records_submitted, errors[] }
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Find all active EVV integrations with SOAP submission
    const { items: integrations } = await base44.asServiceRole.entities.Integration.filter(
      { is_active: true, category: 'evv', submission_method: 'soap' },
      { limit: 100 }
    );

    const results = [];
    let totalRecordsSubmitted = 0;

    for (const integration of integrations) {
      try {
        const agency = await base44.asServiceRole.entities.Agency.get(integration.agency_id);
        const credentials = integration.credentials || {};

        // Build EVV records for this agency
        const buildResponse = await base44.functions.invoke('buildEvvRecords', {
          agency_id: integration.agency_id,
        });
        const buildResult = buildResponse.data || buildResponse;
        const records = buildResult.records || [];

        if (records.length === 0) {
          results.push({
            agency_id: integration.agency_id,
            agency_name: agency?.name,
            status: 'no_records',
            record_count: 0,
          });
          continue;
        }

        // Submit via SOAP
        const endpoint = credentials.api_endpoint || integration.api_endpoint || 'https://evv.medicaid.utah.gov/evv-api/services/EVVSubmission';
        const apiUrl = integration.test_mode
          ? endpoint.replace('/evv-api/', '/evv-api-test/')
          : endpoint;

        const soapEnvelope = buildSoapEnvelope(records, agency, credentials);
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

        // Update EVVLog records
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
          last_submission_record_count: records.length,
          last_submission_status: acknowledgement.accepted ? 'accepted' : 'rejected',
          last_sync_status: acknowledgement.accepted ? 'success' : 'error',
          records_synced_24h: records.length,
          total_records_synced: (integration.total_records_synced || 0) + records.length,
        });

        // Log to IntegrationLog
        await base44.asServiceRole.entities.IntegrationLog.create({
          agency_id: integration.agency_id,
          integration_key: integration.integration_key,
          integration_name: integration.integration_name,
          direction: 'outbound',
          record_type: 'evv_submission',
          record_count: records.length,
          status: acknowledgement.accepted ? 'success' : 'error',
          triggered_by: 'scheduled',
          payload_summary: `Auto-sync: ${records.length} records ${acknowledgement.accepted ? 'accepted' : 'rejected'} - ${integration.test_mode ? 'TEST' : 'PRODUCTION'}`,
        });

        totalRecordsSubmitted += records.length;
        results.push({
          agency_id: integration.agency_id,
          agency_name: agency?.name,
          status: acknowledgement.accepted ? 'accepted' : 'rejected',
          record_count: records.length,
          batch_id: acknowledgement.batchId,
        });
      } catch (err) {
        results.push({
          agency_id: integration.agency_id,
          status: 'error',
          error: err.message,
        });
      }
    }

    return Response.json({
      agencies_processed: integrations.length,
      records_submitted: totalRecordsSubmitted,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}