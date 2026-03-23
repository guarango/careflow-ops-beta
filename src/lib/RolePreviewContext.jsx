import React, { createContext, useState, useContext } from "react";

const RolePreviewContext = createContext();

export function RolePreviewProvider({ children }) {
  const [previewRole, setPreviewRole] = useState(null); // null = use real role

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