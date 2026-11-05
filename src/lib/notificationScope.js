/**
 * HIPAA guard for notification feeds.
 *
 * A notification may carry client-linked content (client_id / client_name).
 * A viewer in caseload mode (DSP, Manager) must never see content about a
 * client that is not in their caseload — even if the record was addressed to
 * them by mistake. If a notification references a client we cannot match to
 * the viewer's assignments, it is hidden.
 */
// canViewAllNotifications comes from the matrix (viewAllNotifications code).
// Everyone without it is a caseload viewer.
export function viewerScope(viewer, canViewAllNotifications = false) {
  return {
    isCaseloadMode: !canViewAllNotifications,
    assignedClientIds: viewer?.assigned_client_ids || [],
  };
}

export function scopeNotificationsToViewer(notifications, { isCaseloadMode, assignedClientIds } = {}) {
  if (!Array.isArray(notifications)) return [];
  if (!isCaseloadMode) return notifications;

  const allowed = new Set(assignedClientIds || []);
  return notifications.filter((n) => {
    if (n.client_id) return allowed.has(n.client_id);
    return !n.client_name;
  });
}