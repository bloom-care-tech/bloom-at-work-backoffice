import { useEffect, useMemo, useRef, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { WaveHierarchyBreadcrumb } from "@/components/waves/WaveHierarchyBreadcrumb";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { createWaveModule, fetchWave, fetchWaveModule, updateWaveModule } from "@/lib/admin-api";
import {
  isValidResourceSlug,
  resourceSlugValidationMessage,
  slugFromTitle,
} from "@/lib/slug";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function WaveModuleEditorPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { ondaId, moduloId } = useParams<{ ondaId: string; moduloId: string }>();
  const isNew = useMatch({ path: "/ondas/:ondaId/modulos/novo", end: true }) != null;
  const id = isNew ? undefined : moduloId;

  const { data: waveMeta, isLoading: waveMetaLoading } = useQuery({
    queryKey: ["wave", ondaId],
    queryFn: () => fetchWave(ondaId!),
    enabled: Boolean(ondaId),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["wave-module", ondaId, id],
    queryFn: () => fetchWaveModule(ondaId!, id!),
    enabled: Boolean(ondaId && id),
  });

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const slugManualRef = useRef(false);

  useEffect(() => {
    if (!data) return;
    setSlug(data.slug);
    setTitle(data.title);
    setSubtitle(data.subtitle);
    slugManualRef.current = false;
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !subtitle.trim()) {
        throw new Error("Preencha título e subtítulo.");
      }
      if (!ondaId) {
        throw new Error("Onda inválida.");
      }
      if (id) {
        await updateWaveModule(ondaId, id, {
          title: title.trim(),
          subtitle: subtitle.trim(),
        });
      } else {
        const normalizedSlug = slugFromTitle(slug.trim() || title);
        if (!isValidResourceSlug(normalizedSlug)) {
          throw new Error(resourceSlugValidationMessage());
        }
        await createWaveModule(ondaId, {
          slug: normalizedSlug,
          title: title.trim(),
          subtitle: subtitle.trim(),
        });
      }
    },
    onSuccess: () => {
      toast(id ? "Módulo atualizado." : "Módulo criado.");
      void qc.invalidateQueries({ queryKey: ["wave-modules", ondaId] });
      void qc.invalidateQueries({ queryKey: ["wave-module", ondaId] });
      navigate(`/ondas/${ondaId}/modulos`);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao salvar."),
  });

  const breadcrumbs = useMemo(() => {
    if (!ondaId) return [];
    const waveLabel = waveMeta?.title ?? (waveMetaLoading ? "…" : "Onda");
    const modulesRoot = { label: "Módulos", to: `/ondas/${ondaId}/modulos` as const };
    const waveCrumb = { label: waveLabel, to: `/ondas/${ondaId}` as const };
    if (isNew) {
      return [
        { label: "Ondas", to: "/ondas" as const },
        waveCrumb,
        modulesRoot,
        { label: "Novo módulo" },
      ];
    }
    const moduleLabel = (title.trim() || data?.title || (isLoading ? "…" : "Módulo")).trim();
    return [
      { label: "Ondas", to: "/ondas" as const },
      waveCrumb,
      modulesRoot,
      { label: moduleLabel },
    ];
  }, [ondaId, isNew, title, data?.title, isLoading, waveMeta?.title, waveMetaLoading]);

  if (!ondaId) return null;
  if (!isNew && !moduloId) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Trilha</Eyebrow>
        <WaveHierarchyBreadcrumb items={breadcrumbs} />
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">
          {isNew ? "Novo módulo" : "Editar módulo"}
        </h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
          O subtítulo aparece no app abaixo do título do módulo. Slug em minúsculas e hífens.
        </p>
      </FadeIn>
      {!isNew && isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {(isNew || data) && (
        <FadeIn delay={0.05}>
          <form
            noValidate
            className="space-y-5 bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="module-title" className="font-ui text-bloom-aubergine/80">
                Título
              </Label>
              <input
                id="module-title"
                className={inputCls}
                value={title}
                onChange={(e) => {
                  const v = e.target.value;
                  setTitle(v);
                  if (isNew && !slugManualRef.current) {
                    setSlug(slugFromTitle(v));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-subtitle" className="font-ui text-bloom-aubergine/80">
                Subtítulo
              </Label>
              <input
                id="module-subtitle"
                className={inputCls}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-slug" className="font-ui text-bloom-aubergine/80">
                Slug
              </Label>
              <input
                id="module-slug"
                className={inputCls}
                value={slug}
                onChange={(e) => {
                  if (isNew) {
                    slugManualRef.current = true;
                    setSlug(slugFromTitle(e.target.value));
                  }
                }}
                disabled={!isNew}
              />
              {!isNew && (
                <p className="font-ui text-xs text-bloom-aubergine/50">
                  Slug travado após criação; exclua e recrie para trocar.
                </p>
              )}
            </div>
            {!isNew && id && (
              <div className="pt-1">
                <PillButton asLink={`/ondas/${ondaId}/modulos/${id}/conteudos`} variant="ghost-aubergine">
                  Gerenciar conteúdos
                </PillButton>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <PillButton type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : "Salvar"}
              </PillButton>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => navigate(`/ondas/${ondaId}/modulos`)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </FadeIn>
      )}
    </div>
  );
}
