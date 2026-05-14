import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Prohibit } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { useAdminCompaniesForSelect } from "@/hooks/use-admin-companies-select";
import { filterSelectCls } from "@/lib/backoffice-filters";
import { ApiError } from "@/lib/auth/api-client";
import { fetchSignupAccessLink, fetchSignupAccessPage, revokeSignupAccess } from "@/lib/admin-api";
import { formatPtBrNumericDate } from "@bloom-at-work/lib/format-date";

export function AccessLinksListPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [draftCompanyId, setDraftCompanyId] = useState("");
  const [draftStatus, setDraftStatus] = useState<"all" | "active" | "revoked">("all");
  const [appliedCompanyId, setAppliedCompanyId] = useState("");
  const [appliedStatus, setAppliedStatus] = useState<"all" | "active" | "revoked">("all");

  const { data: companiesSelect, isLoading: companiesLoading } = useAdminCompaniesForSelect();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["signup-access", page, appliedCompanyId, appliedStatus],
    queryFn: () =>
      fetchSignupAccessPage(
        page,
        15,
        appliedCompanyId || undefined,
        appliedStatus === "all" ? undefined : appliedStatus,
      ),
  });

  const rev = useMutation({
    mutationFn: revokeSignupAccess,
    onSuccess: () => {
      toast("Link de acesso revogado.");
      void qc.invalidateQueries({ queryKey: ["signup-access"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Não foi possível revogar."),
  });

  const copyAccessLink = useMutation({
    mutationFn: (id: string) => fetchSignupAccessLink(id),
    onSuccess: async (res) => {
      try {
        await navigator.clipboard.writeText(res.accessUrl);
        toast("Link de acesso copiado.");
      } catch {
        window.prompt("Copie o link (Ctrl+C):", res.accessUrl);
      }
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Não foi possível obter o link."),
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
          <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Links de acesso</h1>
          <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">Gere links para novos colaboradores entrarem pelo cadastro.</p>
        </FadeIn>
        <PillButton asLink="/links-acesso/novo" className="self-start">
          <Plus size={18} weight="bold" />
          Novo link
        </PillButton>
      </div>

      <FadeIn delay={0.04}>
        <div className="rounded-2xl border border-bloom-aubergine/10 bg-white/90 p-4 md:p-5 space-y-3">
          <p className="font-ui text-xs text-bloom-aubergine/60 uppercase tracking-wide">Filtros</p>
          <div className="flex flex-col lg:flex-row flex-wrap gap-4 lg:items-end">
            <div className="space-y-1 w-full max-w-[14rem]">
              <Label htmlFor="access-links-filter-company" className="font-ui text-xs text-bloom-aubergine/70">
                Empresa
              </Label>
              <select
                id="access-links-filter-company"
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
              <Label htmlFor="access-links-filter-status" className="font-ui text-xs text-bloom-aubergine/70">
                Situação do link
              </Label>
              <select
                id="access-links-filter-status"
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
                <th className="px-4 py-3 text-right min-w-[14rem]">Ações</th>
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
                    {i.expiresAt ? formatPtBrNumericDate(i.expiresAt) : "—"}
                  </td>
                  <td className="px-4 py-3">{i.revokedAt ? "Revogado" : "Ativo"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {!i.revokedAt && i.accessLinkAvailable && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-bloom-aubergine"
                          disabled={copyAccessLink.isPending && copyAccessLink.variables === i.id}
                          onClick={() => copyAccessLink.mutate(i.id)}
                        >
                          <Copy size={16} className="mr-1" />
                          Copiar link
                        </Button>
                      )}
                      {!i.revokedAt && !i.accessLinkAvailable && (
                        <span
                          className="font-ui text-xs text-bloom-aubergine/45 px-1"
                          title="Registros antigos não permitem recuperar o link. Gere um novo link de acesso."
                        >
                          —
                        </span>
                      )}
                      {!i.revokedAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-bloom-garnet"
                          disabled={rev.isPending}
                          onClick={() => {
                            if (window.confirm("Revogar este link? Ele deixará de funcionar.")) {
                              rev.mutate(i.id);
                            }
                          }}
                        >
                          <Prohibit size={16} className="mr-1" />
                          Revogar
                        </Button>
                      )}
                    </div>
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
