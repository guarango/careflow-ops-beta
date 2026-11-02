import { useState, useEffect } from "react";

/**
 * Persists a page's view preference (grid vs list) so it survives navigation
 * and reloads. Key should be unique per page, e.g. "clients".
 */
export function useViewMode(storageKey, defaultMode = "grid") {
  const key = `careflow.viewMode.${storageKey}`;

  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = window.localStorage.getItem(key);
      return saved === "grid" || saved === "list" ? saved : defaultMode;
    } catch {
      return defaultMode;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, viewMode);
    } catch {
      // storage unavailable — view falls back to in-session state only
    }
  }, [key, viewMode]);

  return [viewMode, setViewMode];
}