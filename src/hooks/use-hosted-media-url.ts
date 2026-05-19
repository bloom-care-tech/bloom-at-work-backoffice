import { useEffect, useState } from "react";

import {
  getAdminHostedMediaAccess,
  isProtectedHostedMediaUrl,
  normalizePlaybackUrl,
  type HostedMediaAccessJson,
} from "@/lib/editorial-media-api";

type MintAccess = (sourceUrl: string) => Promise<HostedMediaAccessJson>;

export function useHostedMediaUrl(
  raw: string | undefined,
  mintAccess: MintAccess = getAdminHostedMediaAccess,
) {
  const [src, setSrc] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const trimmed = raw?.trim();
    if (!trimmed || trimmed === "#") {
      setSrc(undefined);
      setLoading(false);
      setError(false);
      return;
    }
    if (!isProtectedHostedMediaUrl(trimmed)) {
      setSrc(trimmed);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    setSrc(undefined);
    mintAccess(trimmed)
      .then((r) => {
        if (!cancelled) {
          setSrc(normalizePlaybackUrl(r.mediaUrl));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [raw, mintAccess]);

  return { src, loading, error };
}
