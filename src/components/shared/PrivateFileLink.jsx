import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

/** Opens a privately stored file through a short-lived signed URL. */
export default function PrivateFileLink({ fileUri, label = "View file", className = "" }) {
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (!fileUri) return;
    if (/^https?:\/\//i.test(fileUri)) {
      window.open(fileUri, "_blank", "noopener,noreferrer");
      return;
    }
    setBusy(true);
    try {
      const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 300 });
      if (res?.signed_url) window.open(res.signed_url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  };

  if (!fileUri) return null;

  return (
    <button type="button" onClick={open} disabled={busy} className={`text-xs text-primary hover:underline ${className}`}>
      {busy ? "Opening…" : label}
    </button>
  );
}