import { base44 } from "@/api/base44Client";

/**
 * Single writer for audit entries created from the app.
 * Entries are append-only: the AuditLog entity refuses updates and deletes.
 *
 * Every call records WHO did WHAT, to WHICH record, and WHEN.
 */
let cachedActor = null;

async function currentActor() {
  if (cachedActor) return cachedActor;
  const me = await base44.auth.me();
  cachedActor = me;
  return me;
}

export async function logAudit({
  action,
  event_type = "generic",
  target_type = "",
  target_id = "",
  target_name = "",
  field = "",
  old_value = "",
  new_value = "",
  details = "",
  session_id = "",
}) {
  try {
    const me = await currentActor();
    await base44.entities.AuditLog.create({
      action,
      event_type,
      actor_id: me?.id || "",
      actor_name: me?.full_name || me?.email || "Unknown",
      actor_email: me?.email || "",
      actor_role: me?.role || "",
      target_type,
      target_id,
      target_name,
      field,
      old_value: old_value === null || old_value === undefined ? "" : String(old_value),
      new_value: new_value === null || new_value === undefined ? "" : String(new_value),
      details,
      session_id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Auditing must never block the action the user asked for.
  }
}