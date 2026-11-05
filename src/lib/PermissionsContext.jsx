import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  NAV_ACCESS as DEFAULT_NAV_ACCESS,
  CAN as DEFAULT_CAN,
  checkCan,
  checkPathAccess,
  getSubjectLabel,
} from "@/lib/permissions";

const PermissionsContext = createContext(null);

const MATRIX_KEY = "default";

/**
 * Deep-merges stored overrides on top of the static defaults from permissions.js.
 * A key present in overrides fully replaces the default subject array for that key.
 */
function mergeMatrix(stored) {
  return {
    navAccess: { ...DEFAULT_NAV_ACCESS, ...(stored?.nav_access || {}) },
    can: { ...DEFAULT_CAN, ...(stored?.can || {}) },
  };
}

export function PermissionsProvider({ children }) {
  const { user } = useAuth();
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

  // Permission checks that use the merged matrix
  const can = useCallback((role, permission, bundles = {}) => {
    return checkCan(matrix.can, role, permission, bundles);
  }, [matrix]);

  const canAccessPath = useCallback((role, path, bundles = {}) => {
    return checkPathAccess(matrix.navAccess, matrix.can, role, path, bundles);
  }, [matrix]);

  // Write an audit entry for a permission change (best effort)
  const logChange = useCallback(async (details, targetName) => {
    try {
      await base44.entities.AuditLog.create({
        action: "permission_change",
        event_type: "generic",
        actor_id: user?.id || "",
        actor_name: user?.full_name || user?.email || "Unknown",
        actor_email: user?.email || "",
        target_type: "PermissionMatrix",
        target_name: targetName || "Role permissions",
        details,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // Auditing is best effort — never block a permission save on it
    }
  }, [user]);

  // Persist nav and/or can overrides into the singleton record
  const persistOverrides = useCallback(async (navOverride, canOverride) => {
    const page = await base44.entities.PermissionMatrix.filter(
      { matrix_key: MATRIX_KEY },
      { limit: 1 }
    );
    const existing = page?.items?.[0];

    if (existing) {
      await base44.entities.PermissionMatrix.update(existing.id, {
        nav_access: { ...(existing.nav_access || {}), ...(navOverride || {}) },
        can: { ...(existing.can || {}), ...(canOverride || {}) },
        updated_by: user?.id || "",
        updated_at: new Date().toISOString(),
      });
    } else {
      await base44.entities.PermissionMatrix.create({
        matrix_key: MATRIX_KEY,
        nav_access: navOverride || {},
        can: canOverride || {},
        updated_by: user?.id || "",
        updated_at: new Date().toISOString(),
      });
    }
  }, [user]);

  /**
   * Toggle one subject for one nav path or one permission code.
   * type: "nav" | "can"; key: path or permission code; subject: role or bundle.
   * meta: { featureLabel, rowLabel } — used for the audit entry.
   */
  const togglePermission = useCallback(async (type, key, subject, meta = {}) => {
    const currentArray = type === "nav"
      ? [...(matrix.navAccess[key] || [])]
      : [...(matrix.can[key] || [])];

    const has = currentArray.includes(subject);
    const newArray = has
      ? currentArray.filter((s) => s !== subject)
      : [...currentArray, subject];

    const newMatrix = type === "nav"
      ? { ...matrix, navAccess: { ...matrix.navAccess, [key]: newArray } }
      : { ...matrix, can: { ...matrix.can, [key]: newArray } };
    setMatrix(newMatrix);

    setSaving(true);
    try {
      await persistOverrides(type === "nav" ? { [key]: newArray } : null,
                              type === "can" ? { [key]: newArray } : null);
      await logChange(
        `${meta.rowLabel || key} — ${getSubjectLabel(subject)}: ${has ? "Granted" : "Not granted"} → ${has ? "Not granted" : "Granted"}`,
        meta.featureLabel
      );
    } catch (err) {
      console.error("Failed to save permission override:", err);
      setMatrix(matrix);
    } finally {
      setSaving(false);
    }
  }, [matrix, persistOverrides, logChange]);

  // Toggle one subject across several nav paths in a single save
  const toggleNavPaths = useCallback(async (paths, subject, meta = {}) => {
    const grant = !paths.every((p) => (matrix.navAccess[p] || []).includes(subject));
    const navOverride = {};
    paths.forEach((p) => {
      const current = [...(matrix.navAccess[p] || [])];
      navOverride[p] = grant
        ? (current.includes(subject) ? current : [...current, subject])
        : current.filter((s) => s !== subject);
    });

    const newMatrix = { ...matrix, navAccess: { ...matrix.navAccess, ...navOverride } };
    setMatrix(newMatrix);

    setSaving(true);
    try {
      await persistOverrides(navOverride, null);
      await logChange(
        `${meta.rowLabel || "View page"} — ${getSubjectLabel(subject)}: ${grant ? "Not granted" : "Granted"} → ${grant ? "Granted" : "Not granted"}`,
        meta.featureLabel
      );
    } catch (err) {
      console.error("Failed to save permission override:", err);
      setMatrix(matrix);
    } finally {
      setSaving(false);
    }
  }, [matrix, persistOverrides, logChange]);

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
          updated_by: user?.id || "",
          updated_at: new Date().toISOString(),
        });
      }
      setMatrix({ navAccess: { ...DEFAULT_NAV_ACCESS }, can: { ...DEFAULT_CAN } });
      await logChange("All permissions reset to defaults", "Role permissions");
    } catch (err) {
      console.error("Failed to reset permissions:", err);
    } finally {
      setSaving(false);
    }
  }, [logChange, user]);

  return (
    <PermissionsContext.Provider value={{
      matrix,
      loaded,
      saving,
      can,
      canAccessPath,
      togglePermission,
      toggleNavPaths,
      resetToDefaults,
    }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used inside PermissionsProvider");
  return ctx;
}