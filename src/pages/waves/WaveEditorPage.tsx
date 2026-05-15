import { useEffect, useMemo, useRef, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { WaveHierarchyBreadcrumb } from "@/components/waves/WaveHierarchyBreadcrumb";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { createWave, fetchWave, updateWave } from "@/lib/admin-api";
import {
  isValidResourceSlug,
  resourceSlugValidationMessage,
  slugFromTitle,
} from "@/lib/slug";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function WaveEditorPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = useMatch({ path: "/ondas/nova", end: true }) != null;
  const { ondaId } = useParams<{ ondaId: string }>();
  const id = isNew ? undefined : ondaId;

  const { data, isLoading } = useQuery({
    queryKey: ["wave", id],
    queryFn: () => fetchWave(id!),
    enabled: Boolean(id),
  });

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [active, setActive] = useState(true);
  const [audience, setAudience] = useState<"colaborador" | "lider">("colaborador");
  const slugManualRef = useRef(false);

  useEffect(() => {
    if (!data) return;
    setSlug(data.slug);
    setTitle(data.title);
    setSubtitle(data.subtitle);
    setActive(data.active);
    setAudience(data.audience ?? "colaborador");
    slugManualRef.current = false;
  }, [data]);

  const save = useMutation({
    mutationFn: async (): Promise<{ navigateToModules: boolean; newWaveId?: string }> => {
      if (!title.trim() || !subtitle.trim()) {
        throw new Error("Preencha título e subtítulo.");
      }
      if (id) {
        await updateWave(id, {
          title: title.trim(),
          subtitle: subtitle.trim(),
          active,
          audience,
        });
        return { navigateToModules: false };
      }
      const normalizedSlug = slugFromTitle(slug.trim() || title);
      if (!isValidResourceSlug(normalizedSlug)) {
        throw new Error(resourceSlugValidationMessage());
      }
      const created = await createWave({
        slug: normalizedSlug,
        title: title.trim(),
        subtitle: subtitle.trim(),
        active,
        audience,
      });
      return { navigateToModules: true, newWaveId: created.id };
    },
    onSuccess: (res) => {
      toast(id ? "Onda atualizada." : "Onda criada.");
      void qc.invalidateQueries({ queryKey: ["waves"] });
      void qc.invalidateQueries({ queryKey: ["wave"] });
      if (res.navigateToModules && res.newWaveId) {
        navigate(`/ondas/${res.newWaveId}/modulos`);
      } else {
        navigate("/ondas");
      }
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao salvar."),
  });

  if (!isNew && !ondaId) return null;

  const breadcrumbs = useMemo(() => {
    const root = { label: "Ondas", to: "/ondas" as const };
    if (isNew) return [root, { label: "Nova onda" }];
    const waveLabel = (title.trim() || data?.title || (isLoading ? "…" : "Onda")).trim();
    return [root, { label: waveLabel }];
  }, [isNew, title, data?.title, isLoading]);

  return (
    <div className="max-w-2xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Trilha</Eyebrow>
        <WaveHierarchyBreadcrumb items={breadcrumbs} />
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">{isNew ? "Nova onda" : "Editar onda"}</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">Slug em minúsculas e hífens (ex.: minha-onda).</p>
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
              <Label htmlFor="wave-title" className="font-ui text-bloom-aubergine/80">
                Título
              </Label>
              <input
                id="wave-title"
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
              <Label htmlFor="wave-slug" className="font-ui text-bloom-aubergine/80">
                Slug
              </Label>
              <input
                id="wave-slug"
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
                <p className="font-ui text-xs text-bloom-aubergine/50">Slug travado após criação; exclua e recrie para trocar.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wave-subtitle" className="font-ui text-bloom-aubergine/80">
                Subtítulo
              </Label>
              <textarea
                id="wave-subtitle"
                className={`${inputCls} min-h-[100px]`}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wave-audience" className="font-ui text-bloom-aubergine/80">
                Visível no app para
              </Label>
              <select
                id="wave-audience"
                className={inputCls}
                value={audience}
                onChange={(e) => setAudience(e.target.value as "colaborador" | "lider")}
              >
                <option value="colaborador">Colaborador</option>
                <option value="lider">Líder</option>
              </select>
              <p className="font-ui text-xs text-bloom-aubergine/50">
                Usuários do app só veem ondas do mesmo tipo de perfil; não há troca automática de conteúdo.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="wave-active" className="font-ui text-sm text-bloom-aubergine cursor-pointer">
                Ativa (visível no app)
              </Label>
              <Switch id="wave-active" checked={active} onCheckedChange={setActive} />
            </div>
            <div className="flex gap-3 pt-2">
              <PillButton type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : "Salvar"}
              </PillButton>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate("/ondas")}>
                Cancelar
              </Button>
            </div>
          </form>
        </FadeIn>
      )}
    </div>
  );
}
