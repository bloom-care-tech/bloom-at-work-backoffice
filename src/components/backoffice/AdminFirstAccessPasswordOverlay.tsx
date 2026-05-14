import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { completeAdminFirstAccess } from "@/lib/auth/auth-api";
import { replacePersistedMe } from "@/lib/auth/session-storage";
import { useBackofficeSession } from "@/lib/backoffice-session";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-full px-5 py-3.5 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function AdminFirstAccessPasswordOverlay() {
  const navigate = useNavigate();
  const { auth, signOut } = useBackofficeSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!auth || auth.kind !== "backoffice" || auth.me.firstAccessCompleted) {
    return null;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("A confirmação da nova senha não confere.");
      return;
    }
    setBusy(true);
    try {
      const me = await completeAdminFirstAccess({ currentPassword, newPassword });
      replacePersistedMe(me);
      toast("Senha atualizada. Bem-vindo ao painel.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Não foi possível atualizar a senha.";
      toast(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-bloom-aubergine/85 backdrop-blur-sm px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-first-access-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-bloom-aubergine/15 bg-bloom-cream p-8 shadow-xl">
        <Eyebrow tone="garnet">Primeiro acesso</Eyebrow>
        <h2
          id="admin-first-access-title"
          className="font-serif-display text-2xl text-bloom-aubergine mt-3"
        >
          Defina sua senha
        </h2>
        <p className="font-ui text-sm text-bloom-aubergine/70 mt-2">
          Por segurança, altere a senha temporária que recebeu antes de usar o painel.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-first-current" className="font-ui text-bloom-aubergine/80">
              Senha atual (temporária)
            </Label>
            <input
              id="admin-first-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(ev) => setCurrentPassword(ev.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-first-new" className="font-ui text-bloom-aubergine/80">
              Nova senha
            </Label>
            <input
              id="admin-first-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(ev) => setNewPassword(ev.target.value)}
              className={inputCls}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-first-confirm" className="font-ui text-bloom-aubergine/80">
              Confirmar nova senha
            </Label>
            <input
              id="admin-first-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(ev) => setConfirmPassword(ev.target.value)}
              className={inputCls}
              required
              minLength={8}
            />
          </div>
          <PillButton type="submit" className="w-full justify-center mt-2" disabled={busy}>
            {busy ? "Salvando…" : "Continuar"}
          </PillButton>
        </form>

        <button
          type="button"
          className="mt-6 w-full text-center font-ui text-xs text-bloom-aubergine/55 hover:text-bloom-aubergine underline-offset-2 hover:underline"
          onClick={() => {
            signOut();
            navigate("/login", { replace: true });
          }}
        >
          Sair e usar outra conta
        </button>
      </div>
    </div>
  );
}
