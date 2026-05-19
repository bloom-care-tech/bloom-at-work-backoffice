import { apiFetch, getApiBaseUrl } from "./auth/api-client";

export interface HostedMediaAccessJson {
  mediaUrl: string;
  expiresAt: string;
}

/** Same rules as Hub {@link normalizePlaybackUrl} — target the API, not the SPA host. */
export function normalizePlaybackUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  let pathWithQuery: string;
  try {
    const parsed = new URL(trimmed);
    if (!parsed.pathname.startsWith("/api/")) {
      return trimmed;
    }
    pathWithQuery = `${parsed.pathname}${parsed.search}`;
  } catch {
    if (trimmed.startsWith("/api/")) {
      pathWithQuery = trimmed;
    } else {
      return trimmed;
    }
  }

  const base = getApiBaseUrl().replace(/\/$/, "");
  if (!base) {
    return pathWithQuery;
  }
  return `${base}${pathWithQuery}`;
}

export function isProtectedHostedMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed === "#") return false;
  try {
    const path =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? new URL(trimmed).pathname
        : trimmed.startsWith("/")
          ? trimmed
          : null;
    if (!path) return false;
    return /^\/media\/(wave|skills|document-map)\/[^/]+$/.test(path.replace(/\/$/, ""));
  } catch {
    return false;
  }
}

export async function getAdminHostedMediaAccess(sourceUrl: string): Promise<HostedMediaAccessJson> {
  return apiFetch<HostedMediaAccessJson>(
    `/admin/media/access?${new URLSearchParams({ url: sourceUrl.trim() })}`,
    { method: "GET", auth: true },
  );
}
