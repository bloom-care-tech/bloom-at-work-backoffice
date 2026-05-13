import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { filterSelectCls } from "@/lib/backoffice-filters";
import { deleteCompany, fetchCompaniesPage } from "@/lib/admin-api";

export function CompaniesListPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [draftName, setDraftName] = useState("");
  const [draftActive, setDraftActive] = useState<"any" | "yes" | "no">("any");
  const [appliedName, setAppliedName] = useState("");
  const [appliedActive, setAppliedActive] = useState<boolean | undefined>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["companies", page, appliedName, appliedActive],
    queryFn: () =>
      fetchCompaniesPage(page, 15, {
        search: appliedName || undefined,
        active: appliedActive,
      }),
  });

  const del = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      toast("Empresa excluída.");
      void qc.invalidateQueries({ queryKey: ["companies"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Não foi possível excluir."),
  });

  const applyFilters = () => {
    setAppliedName(draftName.trim());
    setAppliedActive(draftActive === "any" ? undefined : draftActive === "yes");
    setPage(1);
  };

  const clearFilters = () => {
    setDraftName("");
    setDraftActive("any");
    setAppliedName("");
    setAppliedActive(undefined);
    setPage(1);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <FadeIn>
          <Eyebrow tone="garnet">Cadastro</Eyebrow>
          <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Empresas</h1>
          <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">Crie e edite organizações e domínios de e-mail permitidos.</p>
        </FadeIn>
        <PillButton asLink="/empresas/nova" className="self-start">
          <Plus size={18} weight="bold" />
          Nova empresa
        </PillButton>
      </div>

      <FadeIn delay={0.04}>
        <div className="rounded-2xl border border-bloom-aubergine/10 bg-white/90 p-4 md:p-5 space-y-3">
          <p className="font-ui text-xs text-bloom-aubergine/60 uppercase tracking-wide">Filtros</p>
          <div className="flex flex-col lg:flex-row flex-wrap gap-4 lg:items-end">
            <div className="space-y-1 flex-1 min-w-[12rem] max-w-xs">
              <Label htmlFor="company-filter-name" className="font-ui text-xs text-bloom-aubergine/70">
                Nome da empresa
              </Label>
              <Input
                id="company-filter-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Contém…"
                className="rounded-xl border-bloom-aubergine/15"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyFilters();
                  }
                }}
              />
            </div>
            <div className="space-y-1 w-full max-w-[14rem]">
              <Label htmlFor="company-filter-active" className="font-ui text-xs text-bloom-aubergine/70">
                Situação
              </Label>
              <select
                id="company-filter-active"
                className={filterSelectCls}
                value={draftActive}
                onChange={(e) => setDraftActive(e.target.value as "any" | "yes" | "no")}
              >
                <option value="any">Todas</option>
                <option value="yes">Ativas</option>
                <option value="no">Inativas</option>
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
        <div className="rounded-2xl border border-bloom-aubergine/10 bg-white/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full font-ui text-sm">
              <thead>
                <tr className="bg-bloom-plum/15 border-b border-bloom-aubergine/10 text-bloom-aubergine/75 text-left text-[11px] uppercase tracking-wide">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Domínios</th>
                  <th className="px-4 py-3">Ativa</th>
                  <th className="px-4 py-3 w-32" />
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-bloom-aubergine/50">
                      Carregando…
                    </td>
                  </tr>
                )}
                {isError && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-bloom-garnet">
                      Não foi possível carregar a lista.
                    </td>
                  </tr>
                )}
                {data?.items.map((c) => (
                  <tr key={c.id} className="border-t border-bloom-aubergine/8 hover:bg-bloom-cream/40">
                    <td className="px-4 py-3 font-medium text-bloom-aubergine">{c.name}</td>
                    <td className="px-4 py-3 text-bloom-aubergine/70 hidden lg:table-cell max-w-md truncate">
                      {c.allowedEmailDomains.join(", ")}
                    </td>
                    <td className="px-4 py-3">{c.active ? "Sim" : "Não"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/empresas/${c.id}`}>
                            <PencilSimple size={16} />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-bloom-garnet"
                          disabled={del.isPending}
                          onClick={() => {
                            if (window.confirm(`Excluir a empresa “${c.name}”? Só é permitido se não houver usuários.`)) {
                              del.mutate(c.id);
                            }
                          }}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
