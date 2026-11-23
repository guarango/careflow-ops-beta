import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ShieldQuestion } from "lucide-react";
import { format } from "date-fns";

const BADGE = {
  Verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Unverified: "bg-amber-50 text-amber-800 border-amber-200",
  "Needs Correction": "bg-red-50 text-red-700 border-red-200",
};

export default function MedOrderVerification({ med, onVerify, saving, canVerify }) {
  const status = med?.verification_status || "Unverified";
  const missing = [
    !med?.prescriber && "prescriber",
    !med?.pharmacy && "pharmacy",
    !med?.instructions && "instructions",
  ].filter(Boolean);

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Order verification</p>
        <Badge variant="outline" className={`gap-1 ${BADGE[status] || BADGE.Unverified}`}>
          {status === "Verified" ? <CheckCircle2 className="w-3 h-3" /> : <ShieldQuestion className="w-3 h-3" />}
          {status}
        </Badge>
      </div>

      {status === "Verified" ? (
        <p className="text-[11px] text-muted-foreground">
          Verified by <span className="font-medium text-foreground">{med.verified_by_name || "staff"}</span>
          {med.verified_at ? ` · ${format(new Date(med.verified_at), "MMM d, yyyy h:mm a")}` : ""}
        </p>
      ) : (
        <>
          {missing.length > 0 && (
            <p className="text-[11px] text-amber-700 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Cannot verify until the order has a {missing.join(", ")}.
            </p>
          )}
          {canVerify && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                disabled={missing.length > 0 || saving}
                onClick={() => onVerify({ verification_status: "Verified" })}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verify order
              </Button>
              {status !== "Needs Correction" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => onVerify({ verification_status: "Needs Correction" })}
                >
                  Needs correction
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}