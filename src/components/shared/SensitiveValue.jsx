import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

/**
 * Masks a sensitive value by default. Revealing it is written to the audit log.
 * The caller decides who may reveal (can("viewSensitiveIdentifiers") etc.).
 */
export default function SensitiveValue({
  value,
  field,
  subject = {},
  canReveal = false,
  className = "text-sm",
}) {
  const { user } = useAuth();
  const [revealed, setRevealed] = useState(false);

  if (!value) return <span className={className}>—</span>;

  const toggle = async () => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    setRevealed(true);
    try {
      await base44.entities.AuditLog.create({
        action: "sensitive_field_view",
        actor_id: user?.id || "",
        actor_name: user?.full_name || user?.email || "Unknown",
        actor_email: user?.email || "",
        target_type: subject.type || "record",
        target_id: subject.id || "",
        target_name: subject.name || "",
        details: `Revealed ${field || "sensitive field"}`,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // Auditing is best effort — never block the reveal on it
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={revealed ? "" : "font-mono tracking-wider text-muted-foreground"}>
        {revealed ? value : "••••••••"}
      </span>
      {canReveal && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={toggle}
          title={revealed ? "Hide" : "Reveal (logged to audit trail)"}
        >
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </Button>
      )}
    </span>
  );
}