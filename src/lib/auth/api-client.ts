import type { RefreshBody } from "./types";
import { clearAuthState, readAccessToken, updatePersistedTokens } from "./session-storage";

export function getApiBaseUrl(): string {
  let raw = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "").trim() ?? "";

  // Misconfiguration: API URL set to the backoffice dev origin — would skip Vite proxy but hit the wrong server.
  if (import.meta.env.DEV && typeof window !== "undefined" && raw.length > 0) {
    const pageOrigin = `${window.location.protocol}//${window.location.host}`;
    if (raw === pageOrigin) {
      raw = "";
    }
  }

  if (raw.length > 0) {
    return raw;
  }

  // Dev: call the API directly so POST/multipart is reliable (Vite proxy can mis-handle uploads).
  if (import.meta.env.DEV) {
    return "http://127.0.0.1:3000";
  }

  return "";
}

function joinUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!path.startsWith("/")) return `${base}/${path}`;
  return base ? `${base}${path}` : path;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function parseErrorMessage(body: unknown, status: number): string {
  if (typeof body === "string") {
    const t = body.trim();
    if (t.startsWith("<") || /<!DOCTYPE/i.test(t)) {
      return `Resposta inválida do servidor (HTTP ${status}). Verifique se a API está em execução e se a URL base está correta (VITE_API_URL / proxy).`;
    }
    return t.length > 280 ? `${t.slice(0, 280)}…` : t;
  }
  if (!body || typeof body !== "object") {
    return status ? `Erro HTTP ${status}.` : "Erro ao comunicar com o servidor.";
  }
  const rec = body as Record<string, unknown>;
  const msg = rec.message;
  if (typeof msg === "string") return msg;
  if (Array.isArray(msg) && msg.length > 0) {
    const first = msg[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const o = first as Record<string, unknown>;
      if (typeof o.message === "string") return o.message;
      if (o.constraints && typeof o.constraints === "object") {
        const vals = Object.values(o.constraints as Record<string, string>);
        if (vals[0]) return String(vals[0]);
      }
    }
  }
  if (typeof rec.error === "string" && rec.error.length > 0) return rec.error;
  return status ? `Erro HTTP ${status}.` : "Erro ao comunicar com o servidor.";
}

let refreshInFlight: Promise<boolean> | null = null;

async function postRefresh(): Promise<RefreshBody | null> {
  const res = await fetch(joinUrl("/auth/refresh"), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;
  return (await res.json()) as RefreshBody;
}

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const next = await postRefresh();
    if (!next) {
      clearAuthState();
      return false;
    }
    updatePersistedTokens(next.accessToken);
    return true;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export type ApiFetchOptions = RequestInit & {
  auth?: boolean;
  skipRefresh?: boolean;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = false, skipRefresh = false, headers: hdrs, ...rest } = options;
  const headers = new Headers(hdrs);
  if (rest.body !== undefined && !headers.has("Content-Type")) {
    if (!(rest.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
  }

  if (auth) {
    let token = readAccessToken();
    if (!token && !skipRefresh) {
      const ok = await tryRefresh();
      token = ok ? readAccessToken() : null;
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const url = joinUrl(path);
  let res = await fetch(url, { ...rest, headers, credentials: "include" });

  if (res.status === 401 && auth && !skipRefresh) {
    const ok = await tryRefresh();
    if (ok) {
      const h2 = new Headers(hdrs);
      if (rest.body !== undefined && !h2.has("Content-Type")) {
        h2.set("Content-Type", "application/json");
      }
      const token = readAccessToken();
      if (token) h2.set("Authorization", `Bearer ${token}`);
      res = await fetch(url, { ...rest, headers: h2, credentials: "include" });
    }
  }

  const text = await res.text();
  let json: unknown = undefined;
  if (text.length > 0) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(parseErrorMessage(json, res.status), res.status, json);
  }

  return json as T;
}

export type ApiFetchBlobOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetchBlob(
  path: string,
  options: ApiFetchBlobOptions = {},
): Promise<{ blob: Blob; contentDisposition: string | null }> {
  const { auth = false, headers: hdrs, ...rest } = options;
  const headers = new Headers(hdrs);

  if (auth) {
    let token = readAccessToken();
    if (!token) {
      const ok = await tryRefresh();
      token = ok ? readAccessToken() : null;
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const url = joinUrl(path);
  let res = await fetch(url, { ...rest, headers, credentials: "include" });

  if (res.status === 401 && auth) {
    const ok = await tryRefresh();
    if (ok) {
      const h2 = new Headers(hdrs);
      const token = readAccessToken();
      if (token) h2.set("Authorization", `Bearer ${token}`);
      res = await fetch(url, { ...rest, headers: h2, credentials: "include" });
    }
  }

  if (!res.ok) {
    const text = await res.text();
    let json: unknown = text;
    try {
      json = text.length ? JSON.parse(text) : undefined;
    } catch {
      /* keep text */
    }
    throw new ApiError(parseErrorMessage(json, res.status), res.status, json);
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("content-disposition");
  return { blob, contentDisposition };
}
