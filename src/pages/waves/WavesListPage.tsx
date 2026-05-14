import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Plus, PencilSimple, ListBullets, Trash } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { deleteWave, fetchWaves, reorderWaves, type WaveDto } from "@/lib/admin-api";

function swapIds(ids: string[], i: number, j: number): string[] {
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function wavesForAudience(data: WaveDto[] | undefined, audience: "colaborador" | "lider"): WaveDto[] {
  return (data ?? [])
    .filter((w) => w.audience === audience)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function WavesListPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["waves"],
    queryFn: fetchWaves,
  });

  const colabSorted = useMemo(() => wavesForAudience(data, "colaborador"), [data]);
  const liderSorted = useMemo(() => wavesForAudience(data, "lider"), [data]);

  const [colabOrderIds, setColabOrderIds] = useState<string[] | null>(null);
  const [liderOrderIds, setLiderOrderIds] = useState<string[] | null>(null);

  const colabIds = colabOrderIds ?? colabSorted.map((w) => w.id);
  const liderIds = liderOrderIds ?? liderSorted.map((w) => w.id);

  const reorder = useMutation({
    mutationFn: reorderWaves,
    onSuccess: () => {
      toast("Ordem atualizada.");
      setColabOrderIds(null);
      setLiderOrderIds(null);
      void qc.invalidateQueries({ queryKey: ["waves"] });
    },
    onError: (e) => {
      setColabOrderIds(null);
      setLiderOrderIds(null);
      toast(e instanceof ApiError ? e.message : "Erro ao reordenar.");
    },
  });

  const del = useMutation({
    mutationFn: deleteWave,
    onSuccess: () => {
      toast("Onda excluída.");
      setColabOrderIds(null);
      setLiderOrderIds(null);
      void qc.invalidateQueries({ queryKey: ["waves"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao excluir."),
  });

  const applyReorder = (nextColab: string[], nextLider: string[]) => {
    setColabOrderIds(nextColab);
    setLiderOrderIds(nextLider);
    reorder.mutate([...nextColab, ...nextLider]);
  };

  const moveColab = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= colabIds.length) return;
    applyReorder(swapIds(colabIds, index, j), liderIds);
  };

  const moveLider = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= liderIds.length) return;
    applyReorder(colabIds, swapIds(liderIds, index, j));
  };

  const totalWaves = (data ?? []).length;
  const hasAny = totalWaves > 0;

  const renderRows = (
    ids: string[],
    sorted: WaveDto[],
    move: (index: number, dir: -1 | 1) => void,
  ) =>
    ids.map((id, index) => {
      const row = sorted.find((w) => w.id === id);
      if (!row) return null;
      return (
        <tr key={id} className="border-b border-bloom-aubergine/8 last:border-0">
          <td className="px-4 py-3 text-bloom-aubergine/50">{index + 1}</td>
          <td className="px-4 py-3">{row.title}</td>
          <td className="px-4 py-3">{row.contentCount}</td>
          <td className="px-4 py-3">{row.active ? "Sim" : "Não"}</td>
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
                <Link to={`/ondas/${id}/modulos`} aria-label="Módulos e conteúdos">
                  <ListBullets className="h-4 w-4" />
                </Link>
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" asChild>
                <Link to={`/ondas/${id}`} aria-label="Editar">
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
                  if (window.confirm("Excluir esta onda?")) del.mutate(id);
                }}
                aria-label="Excluir"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </td>
        </tr>
      );
    });

  const tableShell = (
    title: string,
    hint: string,
    ids: string[],
    sorted: WaveDto[],
    move: (index: number, dir: -1 | 1) => void,
  ) => (
    <section className="space-y-2">
      <div>
        <h2 className="font-ui text-base font-semibold text-bloom-aubergine">{title}</h2>
        <p className="font-ui text-xs text-bloom-aubergine/60 mt-0.5">{hint}</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-bloom-aubergine/10 bg-white/90">
        <table className="w-full font-ui text-sm text-bloom-aubergine">
          <thead>
            <tr className="border-b border-bloom-aubergine/10 text-left text-bloom-aubergine/55 uppercase text-[11px] tracking-wide">
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Conteúdos</th>
              <th className="px-4 py-3">Ativa</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>{ids.length > 0 ? renderRows(ids, sorted, move) : null}</tbody>
        </table>
      </div>
      {ids.length === 0 && (
        <p className="font-ui text-sm text-bloom-aubergine/55 px-1">Nenhuma onda neste público.</p>
      )}
    </section>
  );

  return (
    <div className="max-w-5xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Trilha</Eyebrow>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-2">
          <div>
            <h1 className="font-serif-display text-3xl text-bloom-aubergine">Ondas</h1>
            <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
              Colaborador e líder têm listas separadas; use as setas para ordenar dentro de cada público (a ordem no app segue cada lista).
            </p>
          </div>
          <PillButton asLink="/ondas/nova">Nova onda</PillButton>
        </div>
      </FadeIn>

      {isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {isError && <p className="font-ui text-sm text-bloom-garnet">Não foi possível carregar as ondas.</p>}

      {hasAny && (
        <FadeIn delay={0.05}>
          <div className="space-y-10">
            {tableShell(
              "Colaborador",
              "Ordem exibida no app para perfil colaborador.",
              colabIds,
              colabSorted,
              moveColab,
            )}
            {tableShell(
              "Líder",
              "Ordem exibida no app para perfil líder.",
              liderIds,
              liderSorted,
              moveLider,
            )}
          </div>
        </FadeIn>
      )}

      {!isLoading && !hasAny && (
        <FadeIn delay={0.05}>
          <p className="font-ui text-sm text-bloom-aubergine/65">Nenhuma onda cadastrada.</p>
          <PillButton asLink="/ondas/nova" className="mt-4">
            <Plus className="inline mr-2" size={18} weight="bold" />
            Criar primeira onda
          </PillButton>
        </FadeIn>
      )}
    </div>
  );
}
