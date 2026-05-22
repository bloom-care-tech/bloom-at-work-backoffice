import type { MeUserJson } from "./types";
import { isBloomBackofficeOperator } from "./backoffice-access";

export const AUTH_STORAGE_KEY = "bloom_backoffice_auth";

export interface PersistedAuth {
  kind: "backoffice";
  me: MeUserJson;
  createdAt: string;
}

let accessTokenInMemory: string | null = null;

function isPersistedAuth(value: unknown): value is PersistedAuth {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    o.kind === "backoffice" &&
    typeof o.createdAt === "string" &&
    o.me !== null &&
    typeof o.me === "object" &&
    typeof (o.me as MeUserJson).role === "string" &&
    isBloomBackofficeOperator(o.me as MeUserJson)
  );
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
    const persisted = {
      kind: "backoffice" as const,
      me: parsed.me,
      createdAt: parsed.createdAt,
    };
    // Migrate away from older entries that included raw tokens.
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(persisted));
    return persisted;
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

export function readAccessToken(): string | null {
  return accessTokenInMemory;
}

export function setAccessToken(accessToken: string | null): void {
  accessTokenInMemory = accessToken;
}

export function clearAuthState(): void {
  accessTokenInMemory = null;
  writePersistedAuth(null);
}

export function updatePersistedTokens(accessToken: string): void {
  setAccessToken(accessToken);
}

export function replacePersistedMe(me: MeUserJson): void {
  const cur = readPersistedAuth();
  if (!cur) return;
  writePersistedAuth({ ...cur, me });
}
