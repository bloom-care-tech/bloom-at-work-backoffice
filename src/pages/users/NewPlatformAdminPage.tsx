import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { createPlatformAdminUser } from "@/lib/admin-api";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function NewPlatformAdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const createUser = useMutation({
    mutationFn: () =>
      createPlatformAdminUser({
        email: email.trim(),
        password,
        name: name.trim() || null,
        displayName: displayName.trim() || null,
      }),
    onSuccess: (res) => {
      toast("Administrador criado.");
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      navigate(`/administradores/${res.id}`);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao criar."),
  });

  return (
    <div className="max-w-xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Administradores</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Novo administrador Bloom</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
          Conta operadora da plataforma (perfil admin). O usuário poderá entrar com este e-mail e senha.
        </p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <form
          noValidate
          className="space-y-5 bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-6 md:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            let ok = true;
            if (!email.trim()) {
              setEmailError("Informe o e-mail.");
              ok = false;
            } else {
              setEmailError("");
            }
            if (password.length < 8) {
              setPasswordError("A senha deve ter pelo menos 8 caracteres.");
              ok = false;
            } else {
              setPasswordError("");
            }
            if (!ok) return;
            createUser.mutate();
          }}
        >
          <div className="space-y-2">
            <Label className="font-ui text-bloom-aubergine/80">E-mail</Label>
            <input
              className={inputCls}
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
            />
            <FieldError message={emailError} />
          </div>
          <div className="space-y-2">
            <Label className="font-ui text-bloom-aubergine/80">Senha inicial</Label>
            <input
              className={inputCls}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
            />
            <FieldError message={passwordError} />
            <p className="font-ui text-xs text-bloom-aubergine/55">Mínimo de 8 caracteres.</p>
          </div>
          <div className="space-y-2">
            <Label className="font-ui text-bloom-aubergine/80">Nome (opcional)</Label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-ui text-bloom-aubergine/80">Como prefere ser chamado (opcional)</Label>
            <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <PillButton type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? "Criando…" : "Criar administrador"}
            </PillButton>
            <PillButton type="button" variant="ghost-aubergine" onClick={() => navigate("/administradores")}>
              Voltar
            </PillButton>
          </div>
        </form>
      </FadeIn>
    </div>
  );
}
