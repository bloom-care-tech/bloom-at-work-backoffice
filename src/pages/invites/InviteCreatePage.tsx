import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { createInvite, fetchCompaniesPage } from "@/lib/admin-api";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function InviteCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: companies } = useQuery({
    queryKey: ["companies", "all-select"],
    queryFn: () => fetchCompaniesPage(1, 200),
  });

  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("colaborador");
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
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label className="font-ui text-bloom-aubergine/80">Empresa</Label>
            <select className={inputCls} value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
              <option value="">Selecione…</option>
              {companies?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="font-ui text-bloom-aubergine/80">Papel do novo usuário</Label>
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="colaborador">Colaborador</option>
              <option value="lider">Líder</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="font-ui text-bloom-aubergine/80">Data de expiração (opcional)</Label>
            <input className={inputCls} type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
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
