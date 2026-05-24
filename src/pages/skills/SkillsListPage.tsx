import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ListBullets, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { deleteSkill, fetchSkills, reorderSkills } from "@/lib/admin-api";

function swapIds(ids: string[], i: number, j: number): string[] {
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

type SkillAudience = "all" | "leader" | "collaborator";

function skillAudienceLabel(audience: SkillAudience): string {
  if (audience === "all") return "Todos";
  if (audience === "leader") return "Líderes";
  return "Colaboradores";
}

function skillSectionLabel(section: number): string {
  return section === 2 ? "2 · Apoiar meu time" : "1 · Crescer como líder";
}

function sameOrderingBucket(
  a: { audience: SkillAudience; section: number } | undefined,
  b: { audience: SkillAudience; section: number } | undefined,
): boolean {
  return Boolean(a && b && a.audience === b.audience && a.section === b.section);
}

export function SkillsListPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["skills"], queryFn: fetchSkills });

  const sorted = useMemo(
    () =>
      (data ?? [])
        .slice()
        .sort(
          (a, b) =>
            a.audience.localeCompare(b.audience) ||
            a.section - b.section ||
            a.sortOrder - b.sortOrder,
        ),
    [data],
  );
  const [orderIds, setOrderIds] = useState<string[] | null>(null);
  const ids = orderIds ?? sorted.map((s) => s.id);

  const reorder = useMutation({
    mutationFn: reorderSkills,
    onSuccess: () => {
      toast("Ordem atualizada.");
      setOrderIds(null);
      void qc.invalidateQueries({ queryKey: ["skills"] });
    },
    onError: (e) => {
      setOrderIds(null);
      toast(e instanceof ApiError ? e.message : "Erro ao reordenar.");
    },
  });

  const del = useMutation({
    mutationFn: deleteSkill,
    onSuccess: () => {
      toast("Habilidade excluída.");
      setOrderIds(null);
      void qc.invalidateQueries({ queryKey: ["skills"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
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
        <Eyebrow tone="garnet">Catálogo</Eyebrow>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-2">
          <div>
            <h1 className="font-serif-display text-3xl text-bloom-aubergine">Habilidades socioemocionais</h1>
            <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
              Defina público, seção, ordem e itens (áudio, vídeo, texto, livro, filme).
            </p>
          </div>
          <PillButton asLink="/habilidades/nova">Nova habilidade</PillButton>
        </div>
      </FadeIn>

      {isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {isError && <p className="font-ui text-sm text-bloom-garnet">Não foi possível carregar as habilidades.</p>}

      {sorted.length > 0 && (
        <FadeIn delay={0.05}>
          <div className="overflow-x-auto rounded-2xl border border-bloom-aubergine/10 bg-white/90">
            <table className="w-full font-ui text-sm text-bloom-aubergine">
              <thead>
                <tr className="border-b border-bloom-aubergine/10 text-left text-bloom-aubergine/55 uppercase text-[11px] tracking-wide">
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Público</th>
                  <th className="px-4 py-3">Seção</th>
                  <th className="px-4 py-3">Itens</th>
                  <th className="px-4 py-3">Ativa</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ids.map((id, index) => {
                  const row = sorted.find((s) => s.id === id);
                  if (!row) return null;
                  const previous = sorted.find((s) => s.id === ids[index - 1]);
                  const next = sorted.find((s) => s.id === ids[index + 1]);
                  return (
                    <tr key={id} className="border-b border-bloom-aubergine/8 last:border-0">
                      <td className="px-4 py-3 text-bloom-aubergine/50">{index + 1}</td>
                      <td className="px-4 py-3">{row.title}</td>
                      <td className="px-4 py-3">{skillAudienceLabel(row.audience)}</td>
                      <td className="px-4 py-3">{skillSectionLabel(row.section)}</td>
                      <td className="px-4 py-3">{row.itemCount}</td>
                      <td className="px-4 py-3">{row.active ? "Sim" : "Não"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            disabled={index === 0 || !sameOrderingBucket(row, previous) || reorder.isPending}
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
                            disabled={index === ids.length - 1 || !sameOrderingBucket(row, next) || reorder.isPending}
                            onClick={() => move(index, 1)}
                            aria-label="Descer"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" asChild>
                            <Link to={`/habilidades/${id}/itens`} aria-label="Itens">
                              <ListBullets className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" asChild>
                            <Link to={`/habilidades/${id}`} aria-label="Editar">
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
                              if (window.confirm("Excluir esta habilidade e todos os seus itens?")) del.mutate(id);
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
          <p className="font-ui text-sm text-bloom-aubergine/65">Nenhuma habilidade cadastrada.</p>
          <PillButton asLink="/habilidades/nova" className="mt-4">
            <Plus className="inline mr-2" size={18} weight="bold" />
            Criar primeira habilidade
          </PillButton>
        </FadeIn>
      )}
    </div>
  );
}
