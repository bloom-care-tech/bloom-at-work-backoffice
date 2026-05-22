import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NewAccessLinkPage } from "./NewAccessLinkPage";
import { AUTH_STORAGE_KEY, setAccessToken } from "@/lib/auth/session-storage";

function renderAccessLinkFlow() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/links-acesso/novo"]}>
        <Routes>
          <Route path="/links-acesso/novo" element={<NewAccessLinkPage />} />
          <Route path="/links-acesso" element={<div data-testid="access-links-redirect">Links de acesso</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("NewAccessLinkPage (integration)", () => {
  beforeEach(() => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        kind: "backoffice",
        createdAt: new Date().toISOString(),
      }),
    );
    setAccessToken("integration-test-token");
    vi.spyOn(window, "alert").mockImplementation(() => {});
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("loads companies and submits a new signup access link via API", async () => {
    const user = userEvent.setup();
    renderAccessLinkFlow();

    const companySelect = (await screen.findByLabelText(/empresa/i)) as HTMLSelectElement;
    await waitFor(() => {
      expect(Array.from(companySelect.options).some((o) => o.textContent?.includes("Acme"))).toBe(true);
    });

    await user.selectOptions(companySelect, "11111111-1111-1111-1111-111111111111");

    const roleSelect = screen.getByLabelText(/papel do novo usuário/i);
    await user.selectOptions(roleSelect, "colaborador");

    await user.click(screen.getByRole("button", { name: /gerar link/i }));

    await waitFor(() => {
      expect(screen.getByTestId("access-links-redirect")).toBeInTheDocument();
    });
  });
});
