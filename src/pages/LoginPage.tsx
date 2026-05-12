import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eyebrow, FadeIn, PillButton, TrustLine } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { backofficeLogin } from "@/lib/auth/auth-api";
import { writePersistedAuth } from "@/lib/auth/session-storage";
import { useBackofficeSession } from "@/lib/backoffice-session";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-full px-6 py-4 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function LoginPage() {
  const navigate = useNavigate();
  const { auth } = useBackofficeSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth?.kind === "backoffice") navigate("/", { replace: true });
  }, [auth, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast("Informe o usuário.");
      return;
    }
    if (!password) {
      toast("Informe a senha.");
      return;
    }
    setBusy(true);
    try {
      const res = await backofficeLogin(username.trim(), password);
      writePersistedAuth({
        kind: "backoffice",
        accessToken: res.accessToken,
        createdAt: new Date().toISOString(),
      });
      toast("Sessão iniciada.");
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Não foi possível entrar.";
      toast(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bloom-cream flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <FadeIn className="w-full max-w-md">
          <div className="text-center mb-8">
            <Eyebrow tone="garnet">Backoffice</Eyebrow>
            <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-3">
              bloom<span className="italic">@</span>work
            </h1>
            <p className="font-ui text-sm text-bloom-aubergine/65 mt-2">
              Credenciais definidas no servidor (variáveis de ambiente da API).
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 bg-white/70 border border-bloom-aubergine/10 rounded-2xl p-8 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-ui text-bloom-aubergine/80">
                Usuário
              </Label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                className={inputCls}
                placeholder="Usuário configurado na API"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-ui text-bloom-aubergine/80">
                Senha
              </Label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                className={inputCls}
              />
            </div>
            <PillButton type="submit" className="w-full justify-center" disabled={busy}>
              {busy ? "Entrando…" : "Entrar"}
            </PillButton>
          </form>

          <p className="text-center mt-8 font-ui text-xs text-bloom-aubergine/55">
            Após autenticar, você será levado ao console de APIs.
          </p>
        </FadeIn>
      </div>
      <footer className="py-6">
        <TrustLine>acesso restrito · credenciais na API (BACKOFFICE_*)</TrustLine>
      </footer>
    </div>
  );
}
