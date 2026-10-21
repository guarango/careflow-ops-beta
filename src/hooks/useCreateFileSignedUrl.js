import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Resolves signed URLs for an array of private file URIs.
 * Returns { urls, loading }.
 */
export function useCreateFileSignedUrl(fileUris) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    if (!fileUris || fileUris.length === 0) { setUrls([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const resolved = await Promise.all(
          fileUris.map(async (uri) => {
            if (!uri) return null;
            try {
              const r = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri });
              return r.signed_url;
            } catch { return null; }
          })
        );
        if (!cancelled) setUrls(resolved);
      } catch {
        if (!cancelled) setUrls([]);
      }
    })();
    return () => { cancelled = true; };
  }, [JSON.stringify(fileUris)]);

  return { urls };
}