// Shared caller verification for backend functions.
// Every endpoint is reachable by anyone who knows its URL, so each one must
// prove BOTH identity and entitlement before touching data.
//
// Platform workflow / scheduler invocations arrive as an authenticated admin
// identity (verified against recent workflow runs), so scheduled maintenance
// functions use the same checks as interactive callers.

export async function getCaller(base44) {
  return await base44.auth.me().catch(() => null);
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}

// Admin-only: agency-wide exports, scheduled maintenance, platform operations.
export async function requireAdmin(base44) {
  const user = await getCaller(base44);
  if (!user) return { error: unauthorized() };
  if (user.role !== 'admin') return { error: forbidden() };
  return { user };
}

// Manager or admin: clinical review, summary generation, recognition.
export async function requireManager(base44) {
  const user = await getCaller(base44);
  if (!user) return { error: unauthorized() };
  if (user.role !== 'admin' && user.role !== 'manager') return { error: forbidden() };
  return { user };
}