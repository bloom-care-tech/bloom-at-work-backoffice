import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { WaveHierarchyBreadcrumb } from "@/components/waves/WaveHierarchyBreadcrumb";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { deleteSkillItem, fetchSkillById, reorderSkillItems } from "@/lib/admin-api";
import { skillItemTypeLabel } from "@/lib/skill-item-labels";

function swapIds(ids: string[], i: number, j: number): string[] {
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function SkillItemsListPage() {
  const { skillId } = useParams<{ skillId: string }>();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["skill", skillId],
    queryFn: () => fetchSkillById(skillId!),
    enabled: Boolean(skillId),
  });

  const sorted = useMemo(() => (data?.items ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder), [data]);
  const [orderIds, setOrderIds] = useState<string[] | null>(null);
  const ids = orderIds ?? sorted.map((c) => c.id);

  const reorder = useMutation({
    mutationFn: (next: string[]) => reorderSkillItems(skillId!, next),
    onSuccess: () => {
      toast("Ordem atualizada.");
      setOrderIds(null);
      void qc.invalidateQueries({ queryKey: ["skill", skillId] });
    },
    onError: (e) => {
      setOrderIds(null);
      toast(e instanceof ApiError ? e.message : "Erro ao reordenar.");
    },
  });

  const del = useMutation({
    mutationFn: deleteSkillItem,
    onSuccess: () => {
      toast("Item removido.");
      setOrderIds(null);
      void qc.invalidateQueries({ queryKey: ["skill", skillId] });
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

  const breadcrumbs = useMemo(() => {
    if (!skillId) return [];
    const skillLabel = data?.title ?? (isLoading ? "…" : "Habilidade");
    return [
      { label: "Habilidades", to: "/habilidades" as const },
      { label: skillLabel, to: `/habilidades/${skillId}` as const },
      { label: "Itens" },
    ];
  }, [skillId, data?.title, isLoading]);

  if (!skillId) return null;

  return (
    <div className="max-w-5xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Catálogo</Eyebrow>
        <WaveHierarchyBreadcrumb items={breadcrumbs} />
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-2">
          <div>
            <h1 className="font-serif-display text-3xl text-bloom-aubergine">Itens da habilidade</h1>
            <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
              {data ? (
                <>
                  <span className="font-medium text-bloom-aubergine">{data.title}</span>
                </>
              ) : (
                "Áudio, YouTube, texto, livro ou filme — na ordem em que aparecem no app."
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PillButton asLink="/habilidades" variant="ghost-aubergine">
              Voltar às habilidades
            </PillButton>
            <PillButton asLink={`/habilidades/${skillId}/itens/novo`}>Novo item</PillButton>
          </div>
        </div>
      </FadeIn>
      {isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {isError && <p className="font-ui text-sm text-bloom-garnet">Não foi possível carregar os itens.</p>}
      {sorted.length > 0 && (
        <FadeIn delay={0.05}>
          <div className="overflow-x-auto rounded-2xl border border-bloom-aubergine/10 bg-white/90">
            <table className="w-full font-ui text-sm text-bloom-aubergine">
              <thead>
                <tr className="border-b border-bloom-aubergine/10 text-left text-bloom-aubergine/55 uppercase text-[11px] tracking-wide">
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Título</th>
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
                      <td className="px-4 py-3 font-medium">{skillItemTypeLabel(row.type)}</td>
                      <td className="px-4 py-3">{row.title}</td>
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
                            <Link to={`/habilidades/${skillId}/itens/${id}`} aria-label="Editar">
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
                              if (window.confirm("Remover este item?")) del.mutate(id);
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
          <p className="font-ui text-sm text-bloom-aubergine/65">Nenhum item nesta habilidade.</p>
          <PillButton asLink={`/habilidades/${skillId}/itens/novo`} className="mt-4">
            <Plus className="inline mr-2" size={18} weight="bold" />
            Criar item
          </PillButton>
        </FadeIn>
      )}
    </div>
  );
}
