import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { deleteWaveContent, fetchWaveContentsPage, reorderWaveContents } from "@/lib/admin-api";
import { waveContentKindLabel } from "@/lib/wave-content-kinds";

function swapIds(ids: string[], i: number, j: number): string[] {
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function WaveContentsListPage() {
  const { ondaId, moduloId } = useParams<{ ondaId: string; moduloId: string }>();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["wave-contents", ondaId, moduloId],
    queryFn: () => fetchWaveContentsPage(ondaId!, moduloId!, 1, 200),
    enabled: Boolean(ondaId && moduloId),
  });

  const sorted = useMemo(() => (data?.items ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder), [data]);
  const [orderIds, setOrderIds] = useState<string[] | null>(null);
  const ids = orderIds ?? sorted.map((c) => c.id);

  const reorder = useMutation({
    mutationFn: (next: string[]) => reorderWaveContents(ondaId!, moduloId!, next),
    onSuccess: () => {
      toast("Ordem atualizada.");
      setOrderIds(null);
      void qc.invalidateQueries({ queryKey: ["wave-contents", ondaId, moduloId] });
    },
    onError: (e) => {
      setOrderIds(null);
      toast(e instanceof ApiError ? e.message : "Erro ao reordenar.");
    },
  });

  const del = useMutation({
    mutationFn: deleteWaveContent,
    onSuccess: () => {
      toast("Conteúdo removido.");
      setOrderIds(null);
      void qc.invalidateQueries({ queryKey: ["wave-contents", ondaId, moduloId] });
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

  if (!ondaId || !moduloId) return null;

  return (
    <div className="max-w-5xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Trilha</Eyebrow>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-2">
          <div>
            <h1 className="font-serif-display text-3xl text-bloom-aubergine">Conteúdos da onda</h1>
            <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">Qualquer tipo pode ser marcado como exercício. Inclua referências científicas como tipo próprio. Publique para aparecer no app.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PillButton asLink={`/ondas/${ondaId}/modulos`} variant="ghost-aubergine">
              Voltar aos módulos
            </PillButton>
            <PillButton asLink={`/ondas/${ondaId}/modulos/${moduloId}/conteudos/novo`}>Novo conteúdo</PillButton>
          </div>
        </div>
      </FadeIn>
      {isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {isError && <p className="font-ui text-sm text-bloom-garnet">Não foi possível carregar os conteúdos.</p>}
      {sorted.length > 0 && (
        <FadeIn delay={0.05}>
          <div className="overflow-x-auto rounded-2xl border border-bloom-aubergine/10 bg-white/90">
            <table className="w-full font-ui text-sm text-bloom-aubergine">
              <thead>
                <tr className="border-b border-bloom-aubergine/10 text-left text-bloom-aubergine/55 uppercase text-[11px] tracking-wide">
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Publicado</th>
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
                      <td className="px-4 py-3 font-medium">
                        {waveContentKindLabel(row.kind)}
                        {row.isExercise ? <span className="text-bloom-garnet"> · Exercício</span> : null}
                      </td>
                      <td className="px-4 py-3">{row.title}</td>
                      <td className="px-4 py-3">{row.publishedAt ? "Sim" : "Não"}</td>
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
                            <Link to={`/ondas/${ondaId}/modulos/${moduloId}/conteudos/${id}`} aria-label="Editar">
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
                              if (window.confirm("Remover este conteúdo?")) del.mutate(id);
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
          <p className="font-ui text-sm text-bloom-aubergine/65">Nenhum conteúdo nesta onda.</p>
          <PillButton asLink={`/ondas/${ondaId}/modulos/${moduloId}/conteudos/novo`} className="mt-4">
            <Plus className="inline mr-2" size={18} weight="bold" />
            Criar conteúdo
          </PillButton>
        </FadeIn>
      )}
    </div>
  );
}
