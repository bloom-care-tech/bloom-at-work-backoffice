import { useEffect, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { fetchUser, offboardUser, updateUser } from "@/lib/admin-api";
import {
  CompanyUserOrgFields,
  companyUserOrgFormFromUser,
  companyUserOrgPayload,
  emptyCompanyUserOrgForm,
} from "@/pages/users/company-user-org-fields";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function UserEditorPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isPlatformSection = Boolean(useMatch("/administradores/*"));
  const listPath = isPlatformSection ? "/administradores" : "/usuarios";
  const { data, isLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId!),
    enabled: Boolean(userId),
  });

  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<string>("colaborador");
  const [status, setStatus] = useState<string>("ativo");
  const [orgFields, setOrgFields] = useState(emptyCompanyUserOrgForm);

  const isPlatformAdmin = data?.role === "admin";

  useEffect(() => {
    if (!data || !userId) return;
    if (!isPlatformSection && data.role === "admin") {
      void navigate(`/administradores/${userId}`, { replace: true });
      return;
    }
    if (isPlatformSection && data.role !== "admin") {
      void navigate(`/usuarios/${userId}`, { replace: true });
    }
  }, [data, isPlatformSection, userId, navigate]);

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setDisplayName(data.displayName ?? "");
    setRole(data.role ?? "colaborador");
    setStatus(data.status ?? "ativo");
    setOrgFields(companyUserOrgFormFromUser(data));
  }, [data]);

  const offboard = useMutation({
    mutationFn: () => offboardUser(userId!),
    onSuccess: () => {
      toast("Usuário desligado e sessões revogadas.");
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      navigate(listPath);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao desligar."),
  });

  const save = useMutation({
    mutationFn: () =>
      updateUser(
        userId!,
        isPlatformAdmin
          ? {
              name: name.trim() || null,
              displayName: displayName.trim() || null,
            }
          : {
              name: name.trim() || null,
              displayName: displayName.trim() || null,
              role,
              status,
              ...companyUserOrgPayload(orgFields),
            },
      ),
    onSuccess: () => {
      toast("Usuário atualizado.");
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      void qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      navigate(listPath);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao salvar."),
  });

  if (!userId) return null;

  return (
    <div className="max-w-xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">{isPlatformSection ? "Administradores" : "Usuários"}</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">
          {isPlatformAdmin ? "Editar administrador" : "Editar usuário"}
        </h1>
        {data && (
          <p className="font-ui text-sm text-bloom-aubergine/60 mt-1">
            {data.email}
            {!isPlatformAdmin && <> · {data.companyName ?? "sem empresa"}</>}
          </p>
        )}
      </FadeIn>
      {isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {data && (
        <FadeIn delay={0.05}>
          {isPlatformAdmin && (
            <p className="font-ui text-sm text-bloom-aubergine/70 bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3">
              Conta operadora Bloom (perfil <strong className="font-medium">admin</strong>). Papel e situação não podem ser
              alterados aqui.
            </p>
          )}
          <form
            className="space-y-5 bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Nome</Label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Como prefere ser chamado</Label>
              <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Papel</Label>
              {isPlatformAdmin ? (
                <p className="font-ui text-sm text-bloom-aubergine/80 py-2">Bloom (plataforma)</p>
              ) : (
                <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="lider">Líder</option>
                  <option value="colaborador">Colaborador</option>
                </select>
              )}
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Situação</Label>
              {isPlatformAdmin ? (
                <p className="font-ui text-sm text-bloom-aubergine/80 py-2 capitalize">{status}</p>
              ) : (
                <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="ativo">Ativo</option>
                  <option value="pausado">Pausado</option>
                  <option value="desligado">Desligado</option>
                </select>
              )}
            </div>
            {!isPlatformAdmin ? (
              <CompanyUserOrgFields value={orgFields} onChange={setOrgFields} inputCls={inputCls} />
            ) : null}
            <div className="flex flex-wrap gap-3 pt-2">
              <PillButton type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : "Salvar"}
              </PillButton>
              <PillButton type="button" variant="ghost-aubergine" onClick={() => navigate(listPath)}>
                Voltar
              </PillButton>
              {data.status !== "desligado" && !isPlatformAdmin && (
                <PillButton
                  type="button"
                  variant="ghost-aubergine"
                  className="text-bloom-garnet border-bloom-garnet/40"
                  disabled={offboard.isPending}
                  onClick={() => {
                    if (window.confirm("Desligar usuário, revogar sessões e bloquear acesso?")) offboard.mutate();
                  }}
                >
                  {offboard.isPending ? "Desligando…" : "Desligar usuário"}
                </PillButton>
              )}
            </div>
          </form>
        </FadeIn>
      )}
    </div>
  );
}
