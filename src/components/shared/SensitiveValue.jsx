import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logAudit } from "@/lib/auditLog";
import { maskValue, REVEAL_SECONDS } from "@/lib/sensitive";

/**
 * Masks a sensitive value by default (last 4 characters visible).
 * Revealing shows the full value for 30 seconds, then masks it again,
 * and writes an audit entry (who, which record, which field, when).
 * Callers decide who may reveal — no permission means no Reveal icon.
 */
export default function SensitiveValue({
  value,
  field,
  subject = {},
  canReveal = false,
  className = "text-sm",
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!revealed) return undefined;
    const timer = setTimeout(() => setRevealed(false), REVEAL_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [revealed]);

  if (value === null || value === undefined || value === "") {
    return <span className={className}>—</span>;
  }

  const toggle = async () => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    setRevealed(true);
    await logAudit({
      action: "sensitive_field_view",
      target_type: subject.type || "record",
      target_id: subject.id || "",
      target_name: subject.name || "",
      field: field || "Sensitive field",
      details: `Revealed ${field || "a sensitive field"}${
        subject.name ? ` on ${subject.name}` : ""
      }`,
    });
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={
          revealed
            ? "font-mono"
            : "font-mono tracking-wider text-muted-foreground select-none"
        }
      >
        {revealed ? value : maskValue(value)}
      </span>
      {canReveal && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={toggle}
          title={
            revealed
              ? "Hide now"
              : `Reveal — hides again in ${REVEAL_SECONDS} seconds and is logged`
          }
          aria-label={revealed ? "Hide value" : "Reveal value"}
        >
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </Button>
      )}
    </span>
  );
}