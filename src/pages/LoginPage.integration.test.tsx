import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { BackofficeSessionProvider } from "@/lib/backoffice-session";
import { AUTH_STORAGE_KEY } from "@/lib/auth/session-storage";
import { LoginPage } from "./LoginPage";

function renderLoginFlow() {
  return render(
    <>
      <Toaster />
      <BackofficeSessionProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div data-testid="post-login-home">Início</div>} />
          </Routes>
        </MemoryRouter>
      </BackofficeSessionProvider>
    </>,
  );
}

describe("LoginPage (integration)", () => {
  it("posts credentials to the API and persists session", async () => {
    const user = userEvent.setup();
    renderLoginFlow();

    await user.type(screen.getByLabelText(/e-mail/i), "admin@test.dev");
    await user.type(screen.getByLabelText(/^senha$/i), "secret");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByTestId("post-login-home")).not.toBeNull();
    });

    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { kind: string; accessToken?: string; refreshToken?: string; me: { role: string } };
    expect(parsed.kind).toBe("backoffice");
    expect(parsed.accessToken).toBeUndefined();
    expect(parsed.refreshToken).toBeUndefined();
    expect(parsed.me.role).toBe("admin");
  });

  it("shows API error message on invalid credentials", async () => {
    const user = userEvent.setup();
    renderLoginFlow();

    await user.type(screen.getByLabelText(/e-mail/i), "admin@test.dev");
    await user.type(screen.getByLabelText(/^senha$/i), "wrong");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText("Credenciais inválidas.")).not.toBeNull();
    });
  });
});
