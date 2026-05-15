import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ListBullets, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { WaveHierarchyBreadcrumb } from "@/components/waves/WaveHierarchyBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import {
  createWaveModule,
  deleteWaveModule,
  fetchWave,
  fetchWaveModules,
  reorderWaveModules,
  updateWaveModule,
} from "@/lib/admin-api";

function swapIds(ids: string[], i: number, j: number): string[] {
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function WaveModulesListPage() {
  const { ondaId } = useParams<{ ondaId: string }>();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["wave-modules", ondaId],
    queryFn: () => fetchWaveModules(ondaId!),
    enabled: Boolean(ondaId),
  });

  const sorted = useMemo(() => (data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder), [data]);
  const [orderIds, setOrderIds] = useState<string[] | null>(null);
  const ids = orderIds ?? sorted.map((m) => m.id);

  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const reorder = useMutation({
    mutationFn: (next: string[]) => reorderWaveModules(ondaId!, next),
    onSuccess: () => {
      toast("Ordem dos módulos atualizada.");
      setOrderIds(null);
      void qc.invalidateQueries({ queryKey: ["wave-modules", ondaId] });
    },
    onError: (e) => {
      setOrderIds(null);
      toast(e instanceof ApiError ? e.message : "Erro ao reordenar.");
    },
  });

  const create = useMutation({
    mutationFn: () => createWaveModule(ondaId!, { title: newTitle.trim() }),
    onSuccess: () => {
      toast("Módulo criado.");
      setNewTitle("");
      void qc.invalidateQueries({ queryKey: ["wave-modules", ondaId] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao criar módulo."),
  });

  const updateTitle = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateWaveModule(ondaId!, id, { title }),
    onSuccess: () => {
      toast("Título atualizado.");
      setEditingId(null);
      void qc.invalidateQueries({ queryKey: ["wave-modules", ondaId] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao atualizar."),
  });

  const del = useMutation({
    mutationFn: ({ waveId, moduleId }: { waveId: string; moduleId: string }) =>
      deleteWaveModule(waveId, moduleId),
    onSuccess: () => {
      toast("Módulo removido.");
      setOrderIds(null);
      void qc.invalidateQueries({ queryKey: ["wave-modules", ondaId] });
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

  const { data: waveMeta, isLoading: waveMetaLoading } = useQuery({
    queryKey: ["wave", ondaId],
    queryFn: () => fetchWave(ondaId!),
    enabled: Boolean(ondaId),
  });

  const breadcrumbs = useMemo(() => {
    if (!ondaId) return [];
    const waveLabel = waveMeta?.title ?? (waveMetaLoading ? "…" : "Onda");
    return [
      { label: "Ondas", to: "/ondas" as const },
      { label: waveLabel, to: `/ondas/${ondaId}` as const },
      { label: "Módulos" },
    ];
  }, [ondaId, waveMeta?.title, waveMetaLoading]);

  if (!ondaId) return null;

  return (
    <div className="max-w-5xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Trilha</Eyebrow>
        <WaveHierarchyBreadcrumb items={breadcrumbs} />
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-2">
          <div>
            <h1 className="font-serif-display text-3xl text-bloom-aubergine">Módulos da onda</h1>
            <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
              Cada módulo agrupa conteúdos publicados no app. Dentro de um módulo, ordene e edite os itens da trilha.
            </p>
          </div>
          <PillButton asLink="/ondas" variant="ghost-aubergine">
            Voltar às ondas
          </PillButton>
        </div>
      </FadeIn>

      <FadeIn delay={0.04}>
        <div className="bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-5 md:p-6 space-y-3">
          <Label htmlFor="new-module-title" className="font-ui text-sm text-bloom-aubergine/80">
            Novo módulo
          </Label>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <Input
              id="new-module-title"
              className="max-w-md bg-bloom-cream-deep border-bloom-aubergine/15"
              placeholder="Título do módulo"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Button
              type="button"
              disabled={!newTitle.trim() || create.isPending}
              onClick={() => create.mutate()}
              className="rounded-full"
            >
              <Plus className="inline mr-1 h-4 w-4" weight="bold" />
              Adicionar
            </Button>
          </div>
        </div>
      </FadeIn>

      {isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {isError && <p className="font-ui text-sm text-bloom-garnet">Não foi possível carregar os módulos.</p>}

      {sorted.length > 0 && (
        <FadeIn delay={0.05}>
          <div className="overflow-x-auto rounded-2xl border border-bloom-aubergine/10 bg-white/90">
            <table className="w-full font-ui text-sm text-bloom-aubergine">
              <thead>
                <tr className="border-b border-bloom-aubergine/10 text-left text-bloom-aubergine/55 uppercase text-[11px] tracking-wide">
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Conteúdos</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ids.map((id, index) => {
                  const row = sorted.find((m) => m.id === id);
                  if (!row) return null;
                  const isEditing = editingId === id;
                  return (
                    <tr key={id} className="border-b border-bloom-aubergine/8 last:border-0">
                      <td className="px-4 py-3 text-bloom-aubergine/50">{index + 1}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              className="max-w-xs bg-bloom-cream-deep border-bloom-aubergine/15 h-9"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full h-8"
                              disabled={!editTitle.trim() || updateTitle.isPending}
                              onClick={() =>
                                updateTitle.mutate({ id, title: editTitle.trim() })
                              }
                            >
                              Salvar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => setEditingId(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <span className="font-medium">{row.title}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{row.contentCount}</td>
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
                            <Link
                              to={`/ondas/${ondaId}/modulos/${id}/conteudos`}
                              aria-label="Conteúdos do módulo"
                            >
                              <ListBullets className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            disabled={isEditing}
                            onClick={() => {
                              setEditingId(id);
                              setEditTitle(row.title);
                            }}
                            aria-label="Editar título"
                          >
                            <PencilSimple className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-bloom-garnet"
                            disabled={del.isPending}
                            onClick={() => {
                              if (window.confirm("Excluir este módulo e todos os seus conteúdos?")) {
                                del.mutate({ waveId: ondaId, moduleId: id });
                              }
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
          <p className="font-ui text-sm text-bloom-aubergine/65">
            Nenhum módulo encontrado para esta onda.
          </p>
        </FadeIn>
      )}
    </div>
  );
}
