import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { useAdminCompaniesForSelect } from "@/hooks/use-admin-companies-select";
import { createInvite } from "@/lib/admin-api";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function InviteCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: companies, isError, isLoading } = useAdminCompaniesForSelect();

  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const create = useMutation({
    mutationFn: () => {
      let expiresIso: string | undefined;
      if (expiresAt.trim()) {
        const d = new Date(expiresAt);
        if (!Number.isNaN(d.getTime())) expiresIso = d.toISOString();
      }
      return createInvite({
        companyId,
        role,
        ...(expiresIso ? { expiresAt: expiresIso } : {}),
      });
    },
    onSuccess: (res) => {
      toast("Convite criado. Copie o link abaixo.");
      void navigator.clipboard.writeText(res.inviteUrl).catch(() => {});
      void qc.invalidateQueries({ queryKey: ["invites"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      window.alert(`Link do convite (copiado para a área de transferência se permitido):\n\n${res.inviteUrl}`);
      navigate("/convites");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao criar convite."),
  });

  return (
    <div className="max-w-lg space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Convites</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Novo convite</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">O link leva à tela de cadastro do Bloom@Work.</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <form
          className="space-y-5 bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-6 md:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (!companyId) {
              toast("Selecione a empresa.");
              return;
            }
            if (!role) {
              toast("Selecione o papel.");
              return;
            }
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="invite-company" className="font-ui text-bloom-aubergine/80">
              Empresa
            </Label>
            <select
              id="invite-company"
              className={inputCls}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              required
              disabled={isLoading || isError}
            >
              <option value="">
                {isLoading ? "Carregando empresas…" : isError ? "Não foi possível carregar empresas" : "Selecione…"}
              </option>
              {companies?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {isError && (
              <p className="font-ui text-xs text-bloom-garnet">Verifique a conexão e tente recarregar a página.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role" className="font-ui text-bloom-aubergine/80">
              Papel do novo usuário
            </Label>
            <select id="invite-role" className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} required>
              <option value="">Selecione…</option>
              <option value="colaborador">Colaborador</option>
              <option value="lider">Líder</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-expires" className="font-ui text-bloom-aubergine/80">
              Data de expiração (opcional)
            </Label>
            <input
              id="invite-expires"
              className={inputCls}
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <PillButton type="submit" disabled={create.isPending}>
              {create.isPending ? "Gerando…" : "Gerar convite"}
            </PillButton>
            <PillButton type="button" variant="ghost-aubergine" onClick={() => navigate("/convites")}>
              Cancelar
            </PillButton>
          </div>
        </form>
      </FadeIn>
    </div>
  );
}
