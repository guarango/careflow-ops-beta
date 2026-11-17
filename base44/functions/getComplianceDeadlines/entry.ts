import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getCaller, unauthorized, forbidden } from '../../shared/functionAuth.ts';
import { buildComplianceDeadlines } from '../../shared/complianceDeadlines.ts';

// Role-scoped compliance deadline counts for the dashboard.
// Admin: whole agency · Manager: their caseload · DSP: only their own notes.

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getCaller(base44);
    if (!user) return unauthorized();
    if (!['admin', 'manager', 'dsp'].includes(user.role)) return forbidden();

    const deadlines = await buildComplianceDeadlines(base44, user);

    if (user.role === 'dsp') {
      const notes = deadlines.cards.find((c: any) => c.key === 'notes');
      return Response.json({ ...deadlines, cards: notes ? [notes] : [] });
    }
    return Response.json(deadlines);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}