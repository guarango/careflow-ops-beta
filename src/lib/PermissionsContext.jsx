import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import {
  NAV_ACCESS as DEFAULT_NAV_ACCESS,
  CAN as DEFAULT_CAN,
} from "@/lib/permissions";

const PermissionsContext = createContext(null);

const MATRIX_KEY = "default";

/**
 * Deep-merges stored overrides on top of the static defaults from permissions.js.
 * A key present in overrides fully replaces the default role array for that key.
 */
function mergeMatrix(stored) {
  return {
    navAccess: { ...DEFAULT_NAV_ACCESS, ...(stored?.nav_access || {}) },
    can: { ...DEFAULT_CAN, ...(stored?.can || {}) },
  };
}

export function PermissionsProvider({ children }) {
  const [matrix, setMatrix] = useState({ navAccess: DEFAULT_NAV_ACCESS, can: DEFAULT_CAN });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load the singleton matrix record on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await base44.entities.PermissionMatrix.filter(
          { matrix_key: MATRIX_KEY },
          { limit: 1 }
        );
        const record = page?.items?.[0];
        if (!cancelled && record) {
          setMatrix(mergeMatrix(record));
        }
      } catch (err) {
        // If no record exists or fetch fails, fall back to defaults silently
        console.warn("PermissionMatrix load failed, using defaults:", err?.message);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Permission check functions that use the merged matrix
  const can = useCallback((role, permission, bundles = {}) => {
    const allowed = matrix.can[permission];
    if (!allowed) return false;
    if (!allowed.includes(role)) return false;
    return true;
  }, [matrix]);

  const canAccessPath = useCallback((role, path, bundles = {}) => {
    const cleanPath = path.split("?")[0];
    const allowed = matrix.navAccess[cleanPath];
    if (!allowed) return role === "admin" || role === "super_admin";
    if (!allowed.includes(role)) return false;
    return true;
  }, [matrix]);

  // Toggle a role on/off for a nav path or permission code
  // type: "nav" | "can", key: path or permission code, role: role string
  const togglePermission = useCallback(async (type, key, role) => {
    const currentArray = type === "nav"
      ? [...(matrix.navAccess[key] || [])]
      : [...(matrix.can[key] || [])];

    const has = currentArray.includes(role);
    const newArray = has
      ? currentArray.filter(r => r !== role)
      : [...currentArray, role];

    // Optimistic update
    const newMatrix = type === "nav"
      ? { ...matrix, navAccess: { ...matrix.navAccess, [key]: newArray } }
      : { ...matrix, can: { ...matrix.can, [key]: newArray } };
    setMatrix(newMatrix);

    setSaving(true);
    try {
      const overridePayload = type === "nav"
        ? { nav_access: { [key]: newArray } }
        : { can: { [key]: newArray } };

      // Try to find existing record, then update or create
      const page = await base44.entities.PermissionMatrix.filter(
        { matrix_key: MATRIX_KEY },
        { limit: 1 }
      );
      const existing = page?.items?.[0];

      if (existing) {
        // Merge: fetch current stored, merge override, save
        const storedNav = { ...(existing.nav_access || {}), ...(overridePayload.nav_access || {}) };
        const storedCan = { ...(existing.can || {}), ...(overridePayload.can || {}) };
        await base44.entities.PermissionMatrix.update(existing.id, {
          nav_access: storedNav,
          can: storedCan,
          updated_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.PermissionMatrix.create({
          matrix_key: MATRIX_KEY,
          nav_access: type === "nav" ? overridePayload.nav_access : {},
          can: type === "can" ? overridePayload.can : {},
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Failed to save permission override:", err);
      // Revert on failure
      setMatrix(matrix);
    } finally {
      setSaving(false);
    }
  }, [matrix]);

  // Reset all overrides back to defaults
  const resetToDefaults = useCallback(async () => {
    setSaving(true);
    try {
      const page = await base44.entities.PermissionMatrix.filter(
        { matrix_key: MATRIX_KEY },
        { limit: 1 }
      );
      const existing = page?.items?.[0];
      if (existing) {
        await base44.entities.PermissionMatrix.update(existing.id, {
          nav_access: {},
          can: {},
          updated_at: new Date().toISOString(),
        });
      }
      setMatrix({ navAccess: { ...DEFAULT_NAV_ACCESS }, can: { ...DEFAULT_CAN } });
    } catch (err) {
      console.error("Failed to reset permissions:", err);
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <PermissionsContext.Provider value={{
      matrix,
      loaded,
      saving,
      can,
      canAccessPath,
      togglePermission,
      resetToDefaults,
    }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return ctx;
}