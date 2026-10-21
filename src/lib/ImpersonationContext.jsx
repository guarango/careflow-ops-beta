import React, { createContext, useState, useContext, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const ImpersonationContext = createContext({
  impersonation: null,
  loginAs: async () => {},
  returnToSelf: async () => {},
});

export function ImpersonationProvider({ children }) {
  const [impersonation, setImpersonation] = useState(null);

  const loginAs = useCallback(async (targetUserId) => {
    const res = await base44.functions.invoke("manageImpersonation", {
      action: "loginAs",
      targetUserId,
    });
    setImpersonation(res.data);
    return res.data;
  }, []);

  const returnToSelf = useCallback(async () => {
    if (impersonation?.targetUser?.id) {
      await base44.functions.invoke("manageImpersonation", {
        action: "returnToSelf",
        targetUserId: impersonation.targetUser.id,
      });
    }
    setImpersonation(null);
  }, [impersonation]);

  return (
    <ImpersonationContext.Provider value={{ impersonation, loginAs, returnToSelf }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}