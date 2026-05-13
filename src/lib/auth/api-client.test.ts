import { apiFetch } from "./api-client";
import * as sessionStorage from "./session-storage";

describe("api-client", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "http://127.0.0.1:3333");
    vi.spyOn(sessionStorage, "readPersistedAuth").mockReturnValue(null);
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

  it("apiFetch uses relative URL when VITE_API_URL is empty", async () => {
    vi.stubEnv("VITE_API_URL", "");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    await apiFetch("/admin/only-path");
    expect(globalThis.fetch).toHaveBeenCalledWith("/admin/only-path", expect.anything());
  });

  it("apiFetch sets Authorization when auth is true and token exists", async () => {
    vi.spyOn(sessionStorage, "readPersistedAuth").mockReturnValue({
      kind: "backoffice",
      accessToken: "abc",
      refreshToken: "ref",
      me: {
        id: "u",
        email: "a@b.co",
        name: null,
        displayName: null,
        role: "colaborador",
        status: "ativo",
        isAdmin: true,
        company: { id: "c", name: "C", logoUrl: null },
        firstAccessCompleted: true,
      },
      createdAt: "2026-01-01T00:00:00.000Z",
    });
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
});
