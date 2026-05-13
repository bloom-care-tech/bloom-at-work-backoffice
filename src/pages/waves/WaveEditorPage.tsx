import { useEffect, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { createWave, fetchWave, updateWave } from "@/lib/admin-api";

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

  useEffect(() => {
    if (!data) return;
    setSlug(data.slug);
    setTitle(data.title);
    setSubtitle(data.subtitle);
    setActive(data.active);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!slug.trim() || !title.trim() || !subtitle.trim()) {
        throw new Error("Preencha slug, título e subtítulo.");
      }
      if (id) {
        await updateWave(id, {
          title: title.trim(),
          subtitle: subtitle.trim(),
          active,
        });
      } else {
        await createWave({
          slug: slug.trim().toLowerCase(),
          title: title.trim(),
          subtitle: subtitle.trim(),
          active,
        });
      }
    },
    onSuccess: () => {
      toast(id ? "Onda atualizada." : "Onda criada.");
      void qc.invalidateQueries({ queryKey: ["waves"] });
      void qc.invalidateQueries({ queryKey: ["wave"] });
      navigate("/ondas");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao salvar."),
  });

  if (!isNew && !ondaId) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Trilha</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">{isNew ? "Nova onda" : "Editar onda"}</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">Slug em minúsculas e hífens (ex.: minha-onda).</p>
      </FadeIn>
      {!isNew && isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {(isNew || data) && (
        <FadeIn delay={0.05}>
          <form
            className="space-y-5 bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="wave-slug" className="font-ui text-bloom-aubergine/80">
                Slug
              </Label>
              <input
                id="wave-slug"
                className={inputCls}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                disabled={!isNew}
              />
              {!isNew && (
                <p className="font-ui text-xs text-bloom-aubergine/50">Slug travado após criação; exclua e recrie para trocar.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wave-title" className="font-ui text-bloom-aubergine/80">
                Título
              </Label>
              <input id="wave-title" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
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
                required
              />
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
