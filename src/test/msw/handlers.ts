import { http, HttpResponse } from "msw";

/** Must match `vi.stubEnv("VITE_API_URL", ...)` in `src/test/setup.ts`. */
export const TEST_API_ORIGIN = "http://127.0.0.1:3333";

const companyRow = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Acme Corp",
  allowedEmailDomains: ["acme.com"],
  logoUrl: null,
  active: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
  updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
};

const testAuthUser = {
  id: "u-admin",
  name: "Admin",
  displayName: "Admin",
  role: "admin",
  status: "ativo",
  company: { id: companyRow.id, name: companyRow.name, logoUrl: null as string | null },
  firstAccessCompleted: true,
};

export const defaultHandlers = [
  http.get(`${TEST_API_ORIGIN}/admin/empresas`, () => {
    return HttpResponse.json({
      items: [companyRow],
      page: 1,
      limit: 100,
      total: 1,
    });
  }),

  http.get(`${TEST_API_ORIGIN}/admin/quotes`, ({ request }) => {
    const auth = request.headers.get("authorization");
    if (auth !== "Bearer jwt-test-access") {
      return HttpResponse.json({ message: "Não autorizado." }, { status: 401 });
    }
    return HttpResponse.json({
      items: [
        {
          id: "33333333-3333-3333-3333-333333333333",
          text: "Hello quote",
          author: "Author Name",
          publicationDate: "2026-05-01",
          companyId: null,
          audience: "all",
          active: true,
        },
      ],
      page: 1,
      limit: 15,
      total: 1,
    });
  }),

  http.post(`${TEST_API_ORIGIN}/admin/links-acesso`, async ({ request }) => {
    const body = (await request.json()) as { companyId: string; role: string };
    return HttpResponse.json({
      id: "22222222-2222-2222-2222-222222222222",
      accessUrl: "http://localhost:8080/?acesso=test-invite-token-21chars",
      companyName: "Acme Corp",
      role: body.role,
      expiresAt: null,
    });
  }),

  http.post(`${TEST_API_ORIGIN}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === "admin@test.dev" && body.password === "secret") {
      return HttpResponse.json({
        accessToken: "jwt-test-access",
        refreshToken: "jwt-test-refresh",
        user: testAuthUser,
      });
    }
    return HttpResponse.json({ message: "Credenciais inválidas." }, { status: 401 });
  }),

  http.get(`${TEST_API_ORIGIN}/api/me`, ({ request }) => {
    const auth = request.headers.get("authorization");
    if (auth === "Bearer jwt-test-access") {
      return HttpResponse.json({
        ...testAuthUser,
        email: "admin@test.dev",
      });
    }
    return HttpResponse.json({ message: "Não autorizado." }, { status: 401 });
  }),

  http.post(`${TEST_API_ORIGIN}/auth/logout`, () => {
    return HttpResponse.json({ message: "Sessão encerrada com sucesso." });
  }),
];
