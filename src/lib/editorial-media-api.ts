import { apiFetch } from "./auth/api-client";

export interface HostedMediaAccessJson {
  mediaUrl: string;
  expiresAt: string;
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
