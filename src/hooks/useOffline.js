import { useState, useEffect, useCallback } from "react";
import { offlineEngine } from "@/lib/offlineEngine";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { user } = useAuth();

  const refreshPending = useCallback(() => {
    if (user?.id) setPendingCount(offlineEngine.queueLength(user.id));
  }, [user?.id]);

  // Sync queued actions when coming back online
  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || !user?.id) return;
    const queue = offlineEngine.getQueue().filter((a) => a.userId === user.id);
    if (queue.length === 0) return;

    setIsSyncing(true);
    for (const action of queue) {
      try {
        if (action.type === "create") {
          await base44.entities[action.entity].create(action.data);
        } else if (action.type === "update") {
          await base44.entities[action.entity].update(action.recordId, action.data);
        }
        offlineEngine.dequeue(action.id);
      } catch (e) {
        console.warn("Sync failed for action", action.id, e);
      }
    }
    setIsSyncing(false);
    refreshPending();
  }, [user?.id, refreshPending]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    refreshPending();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncQueue, refreshPending]);

  const enqueueAction = useCallback(
    (action) => {
      const id = offlineEngine.enqueue({ ...action, userId: user?.id });
      refreshPending();
      return id;
    },
    [user?.id, refreshPending]
  );

  return { isOnline, isSyncing, pendingCount, enqueueAction, syncQueue };
}