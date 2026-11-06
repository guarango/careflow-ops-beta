import React, { createContext, useState, useContext, useCallback, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes

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

  // Safety control: exit the impersonated session immediately.
  // The UI must never wait on (or be blocked by) the audit-log round trip,
  // so local state is cleared first and the audit entry is sent afterwards.
  const returnToSelf = useCallback(() => {
    clearTimeout();
    const current = impersonation;
    setImpersonation(null);
    if (current) {
      endSession(current.sessionId, current.targetUser?.id, false);
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

    // Start 60-minute auto-timeout
    clearTimeout();
    timeoutRef.current = setTimeout(async () => {
      toast({
        title: "Session timed out",
        description: "Your 60-minute viewing session has ended. Returning to your account.",
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