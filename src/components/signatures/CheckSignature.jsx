import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Lock, User, Clock } from "lucide-react";
import { format } from "date-fns";

/**
 * Lightweight check-signature component.
 * recordId: the ID of the document being signed
 * recordType: "SessionNote" | "IncidentReport" | "MedicationLog" | "ClientGoal"
 * requiredSigners: array of { role, label } — e.g. [{role:"dsp", label:"DSP Signature"}, {role:"supervisor", label:"Supervisor Co-Signature"}]
 * onSignComplete: callback after a signature is recorded
 */
export default function CheckSignature({ recordId, recordType, requiredSigners = [], onSignComplete }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [signing, setSigning] = useState(false);

  const { data: existingSigs = [] } = useQuery({
    queryKey: ["signatures", recordId],
    queryFn: () => base44.entities.Signature.filter({ record_id: recordId }),
    enabled: !!recordId,
  });

  const signMutation = useMutation({
    mutationFn: (data) => base44.entities.Signature.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signatures", recordId] });
      setSigning(false);
      onSignComplete?.();
    },
  });

  const userAlreadySigned = existingSigs.some(s => s.signer_id === user?.id);
  const isLocked = existingSigs.length >= requiredSigners.length && requiredSigners.length > 0;

  const handleSign = () => {
    setSigning(true);
    signMutation.mutate({
      record_id: recordId,
      record_type: recordType,
      signer_id: user?.id,
      signer_name: user?.full_name || user?.email,
      signer_role: user?.role,
      signer_email: user?.email,
      signature_type: "check",
      signed_at: new Date().toISOString(),
      device_type: /Mobi/.test(navigator.userAgent) ? "mobile" : "desktop",
    });
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {isLocked ? <Lock className="w-4 h-4 text-accent" /> : <CheckCircle2 className="w-4 h-4 text-muted-foreground" />}
        <span>Signatures</span>
        {isLocked && <Badge variant="outline" className="text-accent border-accent/30 bg-accent/10 text-xs">Fully Executed</Badge>}
      </div>

      {/* Required signer slots */}
      <div className="space-y-2">
        {requiredSigners.map((required, i) => {
          const sig = existingSigs[i];
          return (
            <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-background border border-border/50">
              <div className="flex items-center gap-2 text-xs">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">{required.label}</span>
              </div>
              {sig ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                  <div className="text-right">
                    <p className="text-xs font-semibold">{sig.signer_name}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {sig.signed_at ? format(new Date(sig.signed_at), "MMM d, yyyy h:mm a") : "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">Awaiting</Badge>
              )}
            </div>
          );
        })}

        {/* Free-form existing signatures if no required list */}
        {requiredSigners.length === 0 && existingSigs.map(sig => (
          <div key={sig.id} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-background border border-border/50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold">{sig.signer_name}</span>
              <Badge variant="outline" className="text-[10px]">{sig.signer_role}</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {sig.signed_at ? format(new Date(sig.signed_at), "MMM d, yyyy h:mm a") : "—"}
            </p>
          </div>
        ))}
      </div>

      {!userAlreadySigned && !isLocked && (
        <Button size="sm" onClick={handleSign} disabled={signing} className="w-full gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {signing ? "Signing…" : `Sign as ${user?.full_name || user?.email}`}
        </Button>
      )}

      {userAlreadySigned && (
        <p className="text-xs text-center text-accent font-medium flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> You have signed this document
        </p>
      )}
    </div>
  );
}