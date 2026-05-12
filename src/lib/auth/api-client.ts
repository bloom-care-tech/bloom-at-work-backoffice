import { readPersistedAuth } from "./session-storage";

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  return (raw?.replace(/\/$/, "") ?? "").trim();
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

function parseErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "Erro ao comunicar com o servidor.";
  const rec = body as Record<string, unknown>;
  const msg = rec.message;
  if (typeof msg === "string") return msg;
  if (Array.isArray(msg) && msg.length > 0 && typeof msg[0] === "string") return msg[0];
  return "Erro ao comunicar com o servidor.";
}

export type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = false, headers: hdrs, ...rest } = options;
  const headers = new Headers(hdrs);
  if (rest.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const p = readPersistedAuth();
    const token = p?.accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const url = joinUrl(path);
  const res = await fetch(url, { ...rest, headers });

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
    throw new ApiError(parseErrorMessage(json), res.status, json);
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
    const p = readPersistedAuth();
    const token = p?.accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const url = joinUrl(path);
  const res = await fetch(url, { ...rest, headers });

  if (!res.ok) {
    const text = await res.text();
    let json: unknown = text;
    try {
      json = text.length ? JSON.parse(text) : undefined;
    } catch {
      /* keep text */
    }
    throw new ApiError(parseErrorMessage(json), res.status, json);
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("content-disposition");
  return { blob, contentDisposition };
}
