import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ListBullets, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { deleteDocumentCategory, fetchDocumentCategories, reorderDocumentCategories } from "@/lib/admin-api";

function swapIds(ids: string[], i: number, j: number): string[] {
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function DocumentCategoriesListPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["doc-cats"],
    queryFn: fetchDocumentCategories,
  });

  const sorted = useMemo(() => (data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder), [data]);
  const [orderIds, setOrderIds] = useState<string[] | null>(null);
  const ids = orderIds ?? sorted.map((c) => c.id);

  const reorder = useMutation({
    mutationFn: reorderDocumentCategories,
    onSuccess: () => {
      toast("Ordem atualizada.");
      setOrderIds(null);
      void qc.invalidateQueries({ queryKey: ["doc-cats"] });
    },
    onError: (e) => {
      setOrderIds(null);
      toast(e instanceof ApiError ? e.message : "Erro ao reordenar.");
    },
  });

  const del = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) => deleteDocumentCategory(id, force),
    onSuccess: () => {
      toast("Categoria excluída.");
      setOrderIds(null);
      void qc.invalidateQueries({ queryKey: ["doc-cats"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao excluir."),
  });

  const applyReorder = (nextIds: string[]) => {
    setOrderIds(nextIds);
    reorder.mutate(nextIds);
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    applyReorder(swapIds(ids, index, j));
  };

  return (
    <div className="max-w-5xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Biblioteca</Eyebrow>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-2">
          <div>
            <h1 className="font-serif-display text-3xl text-bloom-aubergine">Mapa de documentos</h1>
            <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
              Ordene com as setas; crie categorias e edite documentos por categoria (como ondas e conteúdos).
            </p>
          </div>
          <PillButton asLink="/mapa-documentos/nova">Nova categoria</PillButton>
        </div>
      </FadeIn>

      {isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {isError && <p className="font-ui text-sm text-bloom-garnet">Não foi possível carregar as categorias.</p>}

      {sorted.length > 0 && (
        <FadeIn delay={0.05}>
          <div className="overflow-x-auto rounded-2xl border border-bloom-aubergine/10 bg-white/90">
            <table className="w-full font-ui text-sm text-bloom-aubergine">
              <thead>
                <tr className="border-b border-bloom-aubergine/10 text-left text-bloom-aubergine/55 uppercase text-[11px] tracking-wide">
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Documentos</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ids.map((id, index) => {
                  const row = sorted.find((c) => c.id === id);
                  if (!row) return null;
                  return (
                    <tr key={id} className="border-b border-bloom-aubergine/8 last:border-0">
                      <td className="px-4 py-3 text-bloom-aubergine/50">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{row.slug}</td>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">{row.documentCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            disabled={index === 0 || reorder.isPending}
                            onClick={() => move(index, -1)}
                            aria-label="Subir"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            disabled={index === ids.length - 1 || reorder.isPending}
                            onClick={() => move(index, 1)}
                            aria-label="Descer"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" asChild>
                            <Link to={`/mapa-documentos/${id}/documentos`} aria-label="Documentos">
                              <ListBullets className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" asChild>
                            <Link to={`/mapa-documentos/${id}`} aria-label="Editar">
                              <PencilSimple className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-bloom-garnet"
                            disabled={del.isPending}
                            onClick={() => {
                              const msg = row.documentCount
                                ? "Esta categoria tem documentos. Excluir a categoria e todos os documentos?"
                                : "Excluir esta categoria?";
                              if (window.confirm(msg)) del.mutate({ id, force: row.documentCount > 0 });
                            }}
                            aria-label="Excluir"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </FadeIn>
      )}

      {!isLoading && sorted.length === 0 && (
        <FadeIn delay={0.05}>
          <p className="font-ui text-sm text-bloom-aubergine/65">Nenhuma categoria cadastrada.</p>
          <PillButton asLink="/mapa-documentos/nova" className="mt-4">
            <Plus className="inline mr-2" size={18} weight="bold" />
            Criar primeira categoria
          </PillButton>
        </FadeIn>
      )}
    </div>
  );
}
