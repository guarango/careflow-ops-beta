import React, { createContext, useState, useContext } from "react";

const RolePreviewContext = createContext();

/**
 * previewRole is a PREVIEW_PRESETS token ("dsp", "manager", "admin",
 * "admin_hr", "admin_billing") or null for the real user. The token carries
 * the bundles too, so a previewed role never inherits the real user's bundles.
 */
export function RolePreviewProvider({ children }) {
  const [previewRole, setPreviewRole] = useState(null);

  return (
    <RolePreviewContext.Provider value={{ previewRole, setPreviewRole }}>
      {children}
    </RolePreviewContext.Provider>
  );
}

export function useRolePreview() {
  const ctx = useContext(RolePreviewContext);
  if (!ctx) throw new Error("useRolePreview must be used within RolePreviewProvider");
  return ctx;
}