import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const REVIEWER_ROLES = ["manager", "admin", "super_admin"];

/**
 * A submitted note is locked. Corrections are addenda, appended with a reason —
 * the original text is never rewritten.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const noteId = String(body.noteId || "").trim();
    const text = String(body.text || "").trim();
    const reason = String(body.reason || "").trim();
    if (!noteId) return Response.json({ error: "noteId is required" }, { status: 400 });
    if (!text) return Response.json({ error: "Addendum text is required" }, { status: 400 });
    if (!reason) return Response.json({ error: "A reason is required for an addendum" }, { status: 400 });

    const note = await base44.asServiceRole.entities.SessionNote.get(noteId).catch((e) =>
      e.status === 404 ? null : Promise.reject(e)
    );
    if (!note) return Response.json({ error: "Session note not found" }, { status: 404 });

    const isOwner = note.created_by_id === user.id;
    const isReviewer = REVIEWER_ROLES.includes(user.role);
    if (!isOwner && !isReviewer) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    if (note.status === "Draft" || note.status === "Returned") {
      return Response.json(
        { error: "This note is still editable. Change it directly, or submit it first." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const actor = user.full_name || user.email || "Staff";
    const version = (note.version || 1) + 1;
    const updated = await base44.asServiceRole.entities.SessionNote.update(noteId, {
      addenda: [
        ...(note.addenda || []),
        { text, reason, added_by: actor, added_at: now },
      ],
      version,
      version_history: [
        ...(note.version_history || []),
        {
          version,
          saved_at: now,
          saved_by: actor,
          summary_of_changes: `Addendum: ${reason}`,
        },
      ],
    });

    await base44.asServiceRole.entities.AuditLog.create({
      action: "session_note_addendum",
      actor_id: user.id,
      actor_name: actor,
      actor_email: user.email || "",
      actor_role: user.role || "",
      target_type: "SessionNote",
      target_id: noteId,
      target_name: `${note.client_name || "Client"} — ${note.date || ""}`.trim(),
      field: "Addendum",
      new_value: text.slice(0, 200),
      details: `Addendum added: ${reason}`,
      timestamp: now,
    });

    return Response.json({ note: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}