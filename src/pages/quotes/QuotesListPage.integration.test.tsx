import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AUTH_STORAGE_KEY } from "@/lib/auth/session-storage";
import { QuotesListPage } from "./QuotesListPage";

const persistedAuth = {
  kind: "backoffice" as const,
  accessToken: "jwt-test-access",
  refreshToken: "jwt-test-refresh",
  createdAt: "2026-01-01T00:00:00.000Z",
  me: {
    id: "u-admin",
    email: "admin@test.dev",
    name: "Admin",
    displayName: "Admin",
    role: "admin",
    status: "ativo",
    company: {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Acme Corp",
      logoUrl: null as string | null,
    },
    firstAccessCompleted: true,
  },
};

function renderQuotesList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/frases"]}>
        <Routes>
          <Route path="/frases" element={<QuotesListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("QuotesListPage (integration)", () => {
  beforeEach(() => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(persistedAuth));
  });

  it("renders quotes returned by the admin API", async () => {
    renderQuotesList();

    await waitFor(() => {
      expect(screen.getByText("Hello quote")).toBeInTheDocument();
    });
    expect(screen.getByText("Author Name")).toBeInTheDocument();
  });
});
