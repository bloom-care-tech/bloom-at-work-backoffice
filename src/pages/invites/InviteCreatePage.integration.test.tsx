import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { InviteCreatePage } from "./InviteCreatePage";
import { AUTH_STORAGE_KEY } from "@/lib/auth/session-storage";

function renderInviteFlow() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/convites/novo"]}>
        <Routes>
          <Route path="/convites/novo" element={<InviteCreatePage />} />
          <Route path="/convites" element={<div data-testid="invites-redirect">Convites</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("InviteCreatePage (integration)", () => {
  beforeEach(() => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        kind: "backoffice",
        accessToken: "integration-test-token",
        createdAt: new Date().toISOString(),
      }),
    );
    vi.spyOn(window, "alert").mockImplementation(() => {});
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("loads companies and submits a new invite via API", async () => {
    const user = userEvent.setup();
    renderInviteFlow();

    const companySelect = (await screen.findByLabelText(/empresa/i)) as HTMLSelectElement;
    await waitFor(() => {
      expect(Array.from(companySelect.options).some((o) => o.textContent?.includes("Acme"))).toBe(true);
    });

    await user.selectOptions(companySelect, "11111111-1111-1111-1111-111111111111");

    const roleSelect = screen.getByLabelText(/papel do novo usuário/i);
    await user.selectOptions(roleSelect, "colaborador");

    await user.click(screen.getByRole("button", { name: /gerar convite/i }));

    await waitFor(() => {
      expect(screen.getByTestId("invites-redirect")).toBeInTheDocument();
    });
  });
});
