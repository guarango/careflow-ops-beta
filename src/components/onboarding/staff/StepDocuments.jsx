import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileSignature, ExternalLink, RefreshCw, CheckCircle2 } from "lucide-react";

/** Step 4 — sign the documents that came with the invite. */
export default function StepDocuments({ requests = [], saving, refreshing, onRefresh, onFinish }) {
  const pending = requests.filter((r) => r.status !== "Signed" && r.status !== "Voided");
  const allSigned = pending.length === 0;

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents to sign.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => {
            const signed = r.status === "Signed";
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSignature className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{r.template_name || "Document"}</span>
                  {r.due_date && <span className="text-xs text-muted-foreground hidden sm:inline">Due {r.due_date}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={signed ? "text-[10px] border-accent/30 bg-accent/10 text-accent" : "text-[10px]"}
                  >
                    {r.status}
                  </Badge>
                  {!signed && r.status !== "Voided" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => window.open(`/sign/${r.id}`, "_blank", "noopener,noreferrer")}
                    >
                      Sign now <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh status
        </Button>
        <Button onClick={onFinish} disabled={saving || !allSigned}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          {allSigned ? "Finish onboarding" : "Sign all documents to finish"}
        </Button>
      </div>
      {!allSigned && (
        <p className="text-xs text-muted-foreground">
          Documents open in a new tab. Once you've signed, come back and refresh.
        </p>
      )}
    </div>
  );
}