export const AUTH_STORAGE_KEY = "bloom_backoffice_auth";

export interface PersistedAuth {
  kind: "backoffice";
  accessToken: string;
  createdAt: string;
}

function isPersistedAuth(value: unknown): value is PersistedAuth {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return o.kind === "backoffice" && typeof o.accessToken === "string" && typeof o.createdAt === "string";
}

export function readPersistedAuth(): PersistedAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedAuth(parsed)) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedAuth(value: PersistedAuth | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) localStorage.removeItem(AUTH_STORAGE_KEY);
    else localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("bloom-backoffice-auth-changed"));
  } catch {
    /* ignore */
  }
}
