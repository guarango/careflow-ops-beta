import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Pen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const SIG_STATUS = {
  Pending: { color: "border-border", badge: "bg-slate-100 text-slate-600", icon: Clock },
  Signed: { color: "border-emerald-200 bg-emerald-50", badge: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  Declined: { color: "border-red-200 bg-red-50", badge: "bg-red-100 text-red-700", icon: XCircle },
  Objected: { color: "border-red-300 bg-red-50", badge: "bg-red-100 text-red-700", icon: AlertTriangle },
};

export default function ISPSignaturePanel({ plan, onUpdate, updating }) {
  const [signingIdx, setSigningIdx] = useState(null);
  const [objectionText, setObjectionText] = useState("");
  const [mode, setMode] = useState("sign"); // "sign" | "decline" | "object"

  const sigs = plan.signatures || [];

  const handleAction = async () => {
    const arr = [...sigs];
    const now = new Date().toISOString();
    if (mode === "sign") {
      arr[signingIdx] = { ...arr[signingIdx], status: "Signed", signed_at: now };
    } else if (mode === "decline") {
      arr[signingIdx] = { ...arr[signingIdx], status: "Declined", signed_at: now };
    } else if (mode === "object") {
      arr[signingIdx] = { ...arr[signingIdx], status: "Objected", signed_at: now, objection_note: objectionText };
    }
    onUpdate({ ...plan, signatures: arr });
    setSigningIdx(null);
    setObjectionText("");
  };

  const signedCount = sigs.filter(s => s.status === "Signed").length;
  const allSigned = sigs.length > 0 && signedCount === sigs.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-sm">Signature Status</p>
          <p className="text-xs text-muted-foreground">{signedCount}/{sigs.length} signed {allSigned && "— all signatures collected"}</p>
        </div>
        {allSigned && <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Ready to Activate</Badge>}
      </div>

      {sigs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8 border-dashed border-2 border-border rounded-xl">
          No signatories configured. Edit the plan to add required signatures.
        </p>
      )}

      <div className="space-y-2">
        {sigs.map((sig, i) => {
          const cfg = SIG_STATUS[sig.status] || SIG_STATUS.Pending;
          const Icon = cfg.icon;
          return (
            <div key={i} className={cn("border-2 rounded-xl p-3", cfg.color)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{sig.name || <span className="text-muted-foreground italic">Name not set</span>}</p>
                    <p className="text-xs text-muted-foreground">{sig.role}</p>
                    {sig.email && <p className="text-xs text-muted-foreground">{sig.email}</p>}
                    {sig.signed_at && <p className="text-xs text-muted-foreground">{format(new Date(sig.signed_at), "MMM d, yyyy 'at' h:mm a")}</p>}
                    {sig.is_guardian_signing_for_person && (
                      <div className="mt-1 bg-amber-100 rounded px-2 py-1 text-xs text-amber-800">
                        <strong>Guardian signing for person.</strong> {sig.guardian_justification && <span>Reason: {sig.guardian_justification}</span>}
                      </div>
                    )}
                    {sig.objection_note && (
                      <div className="mt-1 bg-red-100 rounded px-2 py-1 text-xs text-red-800">
                        <strong>Written Objection:</strong> {sig.objection_note}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", cfg.badge)} variant="outline">{sig.status}</Badge>
                  {sig.status === "Pending" && (
                    <Button size="sm" variant="outline" onClick={() => { setSigningIdx(i); setMode("sign"); }} className="text-xs gap-1">
                      <Pen className="w-3 h-3" />Sign
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Signing Dialog */}
      <Dialog open={signingIdx !== null} onOpenChange={v => !v && setSigningIdx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review & Sign</DialogTitle>
            <p className="text-xs text-muted-foreground">{signingIdx !== null && sigs[signingIdx]?.role} signature for {plan.client_name}'s ISP</p>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              {["sign","object","decline"].map(m => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={cn("flex-1 py-2 rounded-xl border-2 text-xs font-semibold capitalize transition-all",
                    mode === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-muted-foreground"
                  )}>{m === "object" ? "Sign with Objection" : m === "decline" ? "Decline to Sign" : "Sign & Approve"}</button>
              ))}
            </div>
            {mode === "object" && (
              <div>
                <p className="text-xs font-semibold text-red-700 mb-1">Written Objection (required) *</p>
                <Textarea rows={3} value={objectionText} onChange={e => setObjectionText(e.target.value)} placeholder="Document your objection in full. This will be preserved in the record and triggers a required follow-up workflow." className="text-sm border-red-300" />
              </div>
            )}
            {mode === "decline" && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">Declining to sign will prevent this plan from being finalized. Document your reason through the team coordinator.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSigningIdx(null)}>Cancel</Button>
            <Button onClick={handleAction} disabled={(mode === "object" && !objectionText) || updating}
              className={mode === "decline" ? "bg-destructive hover:bg-destructive/90" : ""}>
              {mode === "sign" ? "Sign Plan" : mode === "object" ? "Submit Objection" : "Confirm Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}