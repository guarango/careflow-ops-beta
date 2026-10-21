import React, { createContext, useState, useContext, useCallback, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const ImpersonationContext = createContext({
  impersonation: null,
  isReadOnly: false,
  loginAs: async () => {},
  returnToSelf: async () => {},
  logPageView: async () => {},
});

export function ImpersonationProvider({ children }) {
  const [impersonation, setImpersonation] = useState(null);
  const timeoutRef = useRef(null);

  const endSession = useCallback(async (sessionId, targetUserId, timedOut = false) => {
    try {
      await base44.functions.invoke("manageImpersonation", {
        action: "endSession",
        sessionId,
        targetUserId,
        timedOut,
      });
    } catch (e) {
      // best-effort logging
    }
  }, []);

  const clearTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const returnToSelf = useCallback(async () => {
    clearTimeout();
    if (impersonation) {
      const { sessionId, targetUser } = impersonation;
      await endSession(sessionId, targetUser?.id, false);
      setImpersonation(null);
    }
  }, [impersonation, clearTimeout, endSession]);

  const loginAs = useCallback(async (targetUserId, reason) => {
    const res = await base44.functions.invoke("manageImpersonation", {
      action: "loginAs",
      targetUserId,
      reason,
    });
    const data = res.data;
    setImpersonation(data);

    // Start 30-minute auto-timeout
    clearTimeout();
    timeoutRef.current = setTimeout(async () => {
      toast({
        title: "Session timed out",
        description: "Your 30-minute viewing session has ended. Returning to your account.",
        variant: "destructive",
      });
      await endSession(data.sessionId, data.targetUser?.id, true);
      setImpersonation(null);
    }, SESSION_TIMEOUT_MS);

    return data;
  }, [clearTimeout, endSession]);

  const logPageView = useCallback(async (path, recordInfo) => {
    if (!impersonation?.sessionId) return;
    try {
      await base44.functions.invoke("manageImpersonation", {
        action: "logPageView",
        sessionId: impersonation.sessionId,
        path,
        recordId: recordInfo?.recordId || "",
        recordType: recordInfo?.recordType || "",
        recordName: recordInfo?.recordName || "",
      });
    } catch (e) {
      // best-effort
    }
  }, [impersonation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout();
  }, [clearTimeout]);

  return (
    <ImpersonationContext.Provider
      value={{
        impersonation,
        isReadOnly: !!impersonation,
        loginAs,
        returnToSelf,
        logPageView,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}