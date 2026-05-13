import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Prohibit } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { useAdminCompaniesForSelect } from "@/hooks/use-admin-companies-select";
import { filterSelectCls } from "@/lib/backoffice-filters";
import { fetchInvitesPage, revokeInvite } from "@/lib/admin-api";

export function InvitesListPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [draftCompanyId, setDraftCompanyId] = useState("");
  const [draftStatus, setDraftStatus] = useState<"all" | "active" | "revoked">("all");
  const [appliedCompanyId, setAppliedCompanyId] = useState("");
  const [appliedStatus, setAppliedStatus] = useState<"all" | "active" | "revoked">("all");

  const { data: companiesSelect, isLoading: companiesLoading } = useAdminCompaniesForSelect();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["invites", page, appliedCompanyId, appliedStatus],
    queryFn: () =>
      fetchInvitesPage(
        page,
        15,
        appliedCompanyId || undefined,
        appliedStatus === "all" ? undefined : appliedStatus,
      ),
  });

  const rev = useMutation({
    mutationFn: revokeInvite,
    onSuccess: () => {
      toast("Convite revogado.");
      void qc.invalidateQueries({ queryKey: ["invites"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Não foi possível revogar."),
  });

  const applyFilters = () => {
    setAppliedCompanyId(draftCompanyId);
    setAppliedStatus(draftStatus);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftCompanyId("");
    setDraftStatus("all");
    setAppliedCompanyId("");
    setAppliedStatus("all");
    setPage(1);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <FadeIn>
          <Eyebrow tone="garnet">Acesso</Eyebrow>
          <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Convites</h1>
          <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">Gere links para novos colaboradores entrarem pelo cadastro.</p>
        </FadeIn>
        <PillButton asLink="/convites/novo" className="self-start">
          <Plus size={18} weight="bold" />
          Novo convite
        </PillButton>
      </div>

      <FadeIn delay={0.04}>
        <div className="rounded-2xl border border-bloom-aubergine/10 bg-white/90 p-4 md:p-5 space-y-3">
          <p className="font-ui text-xs text-bloom-aubergine/60 uppercase tracking-wide">Filtros</p>
          <div className="flex flex-col lg:flex-row flex-wrap gap-4 lg:items-end">
            <div className="space-y-1 w-full max-w-[14rem]">
              <Label htmlFor="invites-filter-company" className="font-ui text-xs text-bloom-aubergine/70">
                Empresa
              </Label>
              <select
                id="invites-filter-company"
                className={filterSelectCls}
                value={draftCompanyId}
                onChange={(e) => setDraftCompanyId(e.target.value)}
                disabled={companiesLoading}
              >
                <option value="">Todas</option>
                {companiesSelect?.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 w-full max-w-[14rem]">
              <Label htmlFor="invites-filter-status" className="font-ui text-xs text-bloom-aubergine/70">
                Situação do convite
              </Label>
              <select
                id="invites-filter-status"
                className={filterSelectCls}
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as "all" | "active" | "revoked")}
              >
                <option value="all">Todos</option>
                <option value="active">Ativos (não revogados)</option>
                <option value="revoked">Revogados</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="rounded-full bg-bloom-garnet hover:bg-bloom-garnet/90" onClick={applyFilters}>
                Aplicar
              </Button>
              <Button type="button" variant="outline" className="rounded-full border-bloom-aubergine/20" onClick={clearFilters}>
                Limpar
              </Button>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="rounded-2xl border border-bloom-aubergine/10 bg-white/90 overflow-x-auto">
          <table className="w-full font-ui text-sm">
            <thead>
              <tr className="bg-bloom-plum/15 border-b border-bloom-aubergine/10 text-bloom-aubergine/75 text-left text-[11px] uppercase tracking-wide">
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Expira</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-bloom-aubergine/50">
                    Carregando…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-bloom-garnet">
                    Não foi possível carregar.
                  </td>
                </tr>
              )}
              {data?.items.map((i) => (
                <tr key={i.id} className="border-t border-bloom-aubergine/8 hover:bg-bloom-cream/40">
                  <td className="px-4 py-3 text-bloom-aubergine">{i.companyName}</td>
                  <td className="px-4 py-3">{i.role === "lider" ? "Líder" : "Colaborador"}</td>
                  <td className="px-4 py-3 text-bloom-aubergine/70">
                    {i.expiresAt ? new Date(i.expiresAt).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">{i.revokedAt ? "Revogado" : "Ativo"}</td>
                  <td className="px-4 py-3">
                    {!i.revokedAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-bloom-garnet"
                        disabled={rev.isPending}
                        onClick={() => {
                          if (window.confirm("Revogar este convite? O link deixará de funcionar.")) {
                            rev.mutate(i.id);
                          }
                        }}
                      >
                        <Prohibit size={16} className="mr-1" />
                        Revogar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.total > data.limit && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-bloom-aubergine/8 bg-bloom-cream/50">
              <span className="font-ui text-xs text-bloom-aubergine/60">
                Página {data.page} de {Math.ceil(data.total / data.limit) || 1}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * data.limit >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
