import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadSupportStrategiesPdf } from "@/lib/strategyPdf";

/** Builds the packet the agency sends to the support coordinator — one PDF per person. */
export default function SupportStrategyExport({ plan, strategies, codesById }) {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      await downloadSupportStrategiesPdf({ plan, strategies, codesById });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={busy || strategies.length === 0}
      title="Export Support Strategies PDF for the support coordinator"
    >
      <Download className="mr-1 h-3.5 w-3.5" />
      {busy ? "Building…" : "Export"}
    </Button>
  );
}