import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { deleteEditorialExpert, fetchEditorialExperts } from "@/lib/admin-api";

export function ExpertsListPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["editorial-experts"],
    queryFn: () => fetchEditorialExperts(),
  });

  const del = useMutation({
    mutationFn: deleteEditorialExpert,
    onSuccess: () => {
      toast("Especialista removido.");
      void qc.invalidateQueries({ queryKey: ["editorial-experts"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao remover."),
  });

  const items = data?.items ?? [];

  return (
    <div className="max-w-4xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Conteúdo editorial</Eyebrow>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-1">
          <div>
            <h1 className="font-serif-display text-3xl text-bloom-aubergine">Especialistas</h1>
            <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
              Nome, especialidade, bio e foto — usados como autor de artigos nas ondas.
            </p>
          </div>
          <PillButton asLink="/especialistas/novo" className="!py-2 !px-5 text-sm">
            <Plus size={18} weight="bold" />
            Novo especialista
          </PillButton>
        </div>
      </FadeIn>

      {isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {isError && <p className="font-ui text-sm text-red-700">Não foi possível carregar a lista.</p>}

      {!isLoading && !isError && (
        <FadeIn delay={0.05}>
          <div className="rounded-2xl border border-bloom-aubergine/10 bg-white/90 overflow-hidden">
            <ul className="divide-y divide-bloom-aubergine/8">
              {items.length === 0 ? (
                <li className="px-5 py-8 font-ui text-sm text-bloom-aubergine/55 text-center">
                  Nenhum especialista. Crie o primeiro para associar a artigos.
                </li>
              ) : (
                items.map((ex) => (
                  <li
                    key={ex.id}
                    className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-bloom-cream-deep/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {ex.photoUrl ? (
                        <img
                          src={ex.photoUrl}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover shrink-0 border border-bloom-aubergine/10"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-bloom-aubergine/8 shrink-0" aria-hidden />
                      )}
                      <div className="min-w-0">
                        <p className="font-serif-display text-base text-bloom-aubergine truncate">{ex.name}</p>
                        <p className="font-ui text-xs text-bloom-aubergine/60 truncate">{ex.specialty}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!ex.active && (
                        <span className="font-ui text-[10px] uppercase tracking-wider text-bloom-garnet px-2 py-0.5 rounded-full bg-bloom-garnet/10">
                          Inativo
                        </span>
                      )}
                      <Button variant="outline" size="sm" className="rounded-full gap-1" asChild>
                        <Link to={`/especialistas/${ex.id}`}>
                          <PencilSimple size={16} />
                          Editar
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-bloom-aubergine/60 hover:text-red-700"
                        disabled={del.isPending}
                        onClick={() => {
                          if (!window.confirm(`Remover "${ex.name}"? Artigos que o referenciem deixam de mostrar este autor.`)) return;
                          del.mutate(ex.id);
                        }}
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
