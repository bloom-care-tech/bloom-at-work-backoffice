import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { deleteCompany, fetchCompaniesPage } from "@/lib/admin-api";

export function CompaniesListPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["companies", page],
    queryFn: () => fetchCompaniesPage(page, 15),
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

      <FadeIn delay={0.05}>
        <div className="rounded-2xl border border-bloom-aubergine/10 bg-white/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full font-ui text-sm">
              <thead>
                <tr className="bg-bloom-cream-deep/80 text-bloom-aubergine/70 text-left text-[11px] uppercase tracking-wide">
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
