import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Assembles three signed monthly summaries into a quarterly summary
// in the DHHS 91172 format.
//
// Required content per DHHS 91172:
//   - Client name
//   - Each service provided with date range
//   - General summary of client's status
//   - Response to services
//   - Notable events
//   - Progress toward each goal (not required for ELS, MTP, PBA,
//     Professional Medication Monitoring, Respite)
//   - Name of staff who wrote it
//
// Can be called with { client_id, quarter_number, year } or { client_id, monthly_summary_ids }.
// If monthly summaries aren't all signed, returns an error.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const { client_id, quarter_number, year, monthly_summary_ids } = body;

    if (!client_id) {
      return Response.json({ error: 'client_id is required' }, { status: 400 });
    }

    const clients = await base44.asServiceRole.entities.Client.list();
    const client = clients.find(c => c.id === client_id);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }
    const clientName = `${client.first_name} ${client.last_name}`;

    // Determine quarter and year
    let qNum, qYear;
    if (quarter_number && year) {
      qNum = quarter_number;
      qYear = year;
    } else {
      // Default to the most recent completed quarter
      const now = new Date();
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
      qNum = currentQuarter - 1;
      qYear = now.getFullYear();
      if (qNum === 0) { qNum = 4; qYear = qYear - 1; }
    }

    const quarterLabel = `Q${qNum} ${qYear}`;
    const quarterStartMonth = (qNum - 1) * 3;
    const periodStart = new Date(qYear, quarterStartMonth, 1);
    const periodEnd = new Date(qYear, quarterStartMonth + 3, 0);
    const periodStartStr = periodStart.toISOString().split('T')[0];
    const periodEndStr = periodEnd.toISOString().split('T')[0];
    const dueDate = new Date(qYear, quarterStartMonth + 3, 15);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Fetch the three monthly summaries
    let monthSummaries;
    if (monthly_summary_ids && monthly_summary_ids.length > 0) {
      const all = await base44.asServiceRole.entities.MonthlySummary.list();
      monthSummaries = all.filter(s => monthly_summary_ids.includes(s.id));
    } else {
      const all = await base44.asServiceRole.entities.MonthlySummary.filter({ client_id });
      monthSummaries = all.filter(s =>
        s.period_start >= periodStartStr && s.period_start <= periodEndStr
      );
    }

    // Validate all three are signed
    const unsigned = monthSummaries.filter(s => s.status !== 'Signed');
    if (unsigned.length > 0) {
      return Response.json({
        error: 'Cannot assemble quarterly summary: not all monthly summaries are signed',
        unsigned_count: unsigned.length,
        unsigned: unsigned.map(s => ({ id: s.id, month: s.month_year, status: s.status }))
      }, { status: 400 });
    }

    if (monthSummaries.length < 3) {
      return Response.json({
        error: `Expected 3 monthly summaries for ${quarterLabel}, found ${monthSummaries.length}`,
        found: monthSummaries.length
      }, { status: 400 });
    }

    // Sort by period_start
    monthSummaries.sort((a, b) => a.period_start.localeCompare(b.period_start));

    // Gather service enrollments from client record
    const serviceEnrollments = client.service_enrollments || [];

    // Build the AI prompt to assemble the quarterly summary
    const monthlyData = monthSummaries.map(ms => ({
      month: ms.month_year,
      how_month_went: ms.how_month_went,
      goals_summary: ms.goals_summary,
      notable_events: ms.notable_events,
      source_data: ms.source_data,
      signed_by_name: ms.signed_by_name,
    }));

    const EXEMPT_SERVICES = ['ELS', 'MTP', 'PBA', 'Professional Medication Monitoring', 'Respite'];

    const prompt = `You are assembling a Quarterly Summary for ${clientName} for ${quarterLabel} (${periodStartStr} to ${periodEndStr}).

This is a DHHS 91172 compliant document. Required content:
1. Client name
2. Each service provided with date range
3. General summary of the client's status
4. Response to services
5. Notable events
6. Progress toward each goal (NOT required for these service types: ELS, MTP, PBA, Professional Medication Monitoring, Respite)
7. Name of staff who wrote it

CRITICAL RULES:
- Use ONLY facts from the three signed monthly summaries below.
- Do not speculate or invent information.
- If data is missing, state "No data recorded."

=== CLIENT SERVICE ENROLLMENTS ===
${JSON.stringify(serviceEnrollments.map(se => ({
  service_type: se.service_type,
  service_code: se.service_code,
})), null, 2)}

=== THREE SIGNED MONTHLY SUMMARIES ===
${JSON.stringify(monthlyData, null, 2)}

=== EXEMPT SERVICE TYPES (no goal progress required) ===
${EXEMPT_SERVICES.join(', ')}

Now assemble the quarterly summary. For each service in services_provided, include the service type, date range (using the quarter period), a general summary of the client's status for that service, the client's response to services, notable events, and goal progress (mark goal_progress_exempt as true for exempt services, otherwise summarize progress toward each goal). Also provide an overall_status_summary that captures the client's general status across the quarter.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          services_provided: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                service_type: { type: 'string' },
                service_code: { type: 'string' },
                date_range_start: { type: 'string' },
                date_range_end: { type: 'string' },
                general_summary: { type: 'string' },
                response_to_services: { type: 'string' },
                notable_events: { type: 'string' },
                goal_progress: { type: 'string' },
                goal_progress_exempt: { type: 'boolean' }
              }
            }
          },
          overall_status_summary: { type: 'string' }
        },
        required: ['services_provided', 'overall_status_summary']
      }
    });

    // Check for existing quarterly summary
    const existing = await base44.asServiceRole.entities.QuarterlySummary.filter({
      client_id,
      quarter: quarterLabel,
    });

    const summaryData = {
      client_id,
      client_name: clientName,
      quarter: quarterLabel,
      quarter_number: qNum,
      year: qYear,
      period_start: periodStartStr,
      period_end: periodEndStr,
      due_date: dueDateStr,
      status: 'Pending Review',
      monthly_summary_ids: monthSummaries.map(s => s.id),
      monthly_summary_dates: monthSummaries.map(s => s.month_year),
      services_provided: aiResponse.services_provided || [],
      overall_status_summary: aiResponse.overall_status_summary || '',
    };

    let summary;
    if (existing.length > 0) {
      summary = await base44.asServiceRole.entities.QuarterlySummary.update(existing[0].id, summaryData);
    } else {
      summary = await base44.asServiceRole.entities.QuarterlySummary.create(summaryData);
    }

    // Link monthly summaries to the quarterly summary
    for (const ms of monthSummaries) {
      await base44.asServiceRole.entities.MonthlySummary.update(ms.id, {
        quarterly_summary_id: summary.id,
      });
    }

    return Response.json({
      success: true,
      summary_id: summary.id,
      quarter: quarterLabel,
      client_name: clientName,
      period_start: periodStartStr,
      period_end: periodEndStr,
      due_date: dueDateStr,
      monthly_count: monthSummaries.length,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});