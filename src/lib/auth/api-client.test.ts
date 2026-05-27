import { apiFetch, ensureAccessToken } from "./api-client";
import * as sessionStorage from "./session-storage";

describe("api-client", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "http://127.0.0.1:3333");
    vi.spyOn(sessionStorage, "readPersistedAuth").mockReturnValue(null);
    vi.spyOn(sessionStorage, "readAccessToken").mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("apiFetch joins path with VITE_API_URL and returns JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await apiFetch<{ ok: boolean }>("/admin/ping", { method: "GET" });
    expect(result).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:3333/admin/ping",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("apiFetch uses default API origin in dev when VITE_API_URL is empty", async () => {
    vi.stubEnv("VITE_API_URL", "");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    await apiFetch("/admin/only-path");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/admin/only-path",
      expect.anything(),
    );
  });

  it("apiFetch sets Authorization when auth is true and token exists", async () => {
    vi.spyOn(sessionStorage, "readAccessToken").mockReturnValue("abc");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

    await apiFetch("/admin/x", { auth: true });
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("Authorization")).toBe("Bearer abc");
  });

  it("apiFetch throws ApiError with string message body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(apiFetch("/admin/x")).rejects.toMatchObject({
      name: "ApiError",
      message: "Not allowed",
      status: 403,
    });
  });

  it("apiFetch throws ApiError using first string in message array", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: ["first", "second"] }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(apiFetch("/admin/x")).rejects.toMatchObject({
      message: "first",
      status: 422,
    });
  });

  it("apiFetch omits Content-Type for FormData so the boundary is set by fetch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const fd = new FormData();
    fd.append("file", new Blob(["x"], { type: "application/pdf" }), "x.pdf");
    await apiFetch("/admin/conteudos/midia/upload?kind=pdf&context=wave", {
      method: "POST",
      body: fd,
    });
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("Content-Type")).toBeNull();
  });

  it("ensureAccessToken returns unavailable on network error without clearing persisted auth", async () => {
    const persisted = {
      kind: "backoffice" as const,
      me: {
        id: "u1",
        email: "a@b.com",
        role: "admin",
        name: "Admin",
        displayName: null,
        firstAccessCompleted: true,
        company: { id: "c1", name: "Bloom", slug: "bloom" },
      },
      createdAt: new Date().toISOString(),
    };
    vi.spyOn(sessionStorage, "readPersistedAuth").mockReturnValue(persisted);
    vi.spyOn(sessionStorage, "readAccessToken").mockReturnValue(null);
    const clearSpy = vi.spyOn(sessionStorage, "clearAuthState");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(ensureAccessToken()).resolves.toBe("unavailable");
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it("ensureAccessToken clears auth on 401 refresh response", async () => {
    vi.spyOn(sessionStorage, "readPersistedAuth").mockReturnValue(null);
    vi.spyOn(sessionStorage, "readAccessToken").mockReturnValue(null);
    const clearSpy = vi.spyOn(sessionStorage, "clearAuthState");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));

    await expect(ensureAccessToken()).resolves.toBe("auth_failed");
    expect(clearSpy).toHaveBeenCalled();
  });
});
