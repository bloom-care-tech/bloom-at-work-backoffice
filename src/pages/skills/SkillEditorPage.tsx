import { useEffect, useRef, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { createSkill, fetchSkillById, updateSkill } from "@/lib/admin-api";
import {
  isValidResourceSlug,
  resourceSlugValidationMessage,
  slugFromTitle,
} from "@/lib/slug";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function SkillEditorPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = useMatch({ path: "/habilidades/nova", end: true }) != null;
  const { skillId } = useParams<{ skillId: string }>();
  const id = isNew ? undefined : skillId;

  const { data, isLoading } = useQuery({
    queryKey: ["skill", id],
    queryFn: () => fetchSkillById(id!),
    enabled: Boolean(id),
  });

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [whatItIs, setWhatItIs] = useState("");
  const [scienceSays, setScienceSays] = useState("");
  const [active, setActive] = useState(true);
  const slugManualRef = useRef(false);

  useEffect(() => {
    if (!data) return;
    setSlug(data.slug);
    setTitle(data.title);
    setDescription(data.description ?? "");
    setWhatItIs(data.whatItIs ?? "");
    setScienceSays(data.scienceSays ?? "");
    setActive(data.active);
    slugManualRef.current = false;
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) {
        throw new Error("Preencha o título.");
      }
      if (id) {
        await updateSkill(id, {
          title: title.trim(),
          description: description.trim() || null,
          whatItIs: whatItIs.trim(),
          scienceSays: scienceSays.trim(),
          active,
        });
      } else {
        const normalizedSlug = slugFromTitle(slug.trim() || title);
        if (!isValidResourceSlug(normalizedSlug)) {
          throw new Error(resourceSlugValidationMessage());
        }
        await createSkill({
          slug: normalizedSlug,
          title: title.trim(),
          description: description.trim() || null,
          whatItIs: whatItIs.trim() || undefined,
          scienceSays: scienceSays.trim() || undefined,
          active,
        });
      }
    },
    onSuccess: () => {
      toast(id ? "Habilidade atualizada." : "Habilidade criada.");
      void qc.invalidateQueries({ queryKey: ["skills"] });
      void qc.invalidateQueries({ queryKey: ["skill"] });
      navigate("/habilidades");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao salvar."),
  });

  if (!isNew && !skillId) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Catálogo</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">{isNew ? "Nova habilidade" : "Editar habilidade"}</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">Slug em minúsculas e hífens (ex.: escuta-ativa).</p>
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
              <Label htmlFor="skill-title" className="font-ui text-bloom-aubergine/80">
                Título
              </Label>
              <input
                id="skill-title"
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
              <Label htmlFor="skill-slug" className="font-ui text-bloom-aubergine/80">
                Slug
              </Label>
              <input
                id="skill-slug"
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
              <Label htmlFor="skill-desc" className="font-ui text-bloom-aubergine/80">
                Descrição
              </Label>
              <textarea
                id="skill-desc"
                className={`${inputCls} min-h-[80px]`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-what" className="font-ui text-bloom-aubergine/80">
                O que é
              </Label>
              <textarea
                id="skill-what"
                className={`${inputCls} min-h-[120px]`}
                value={whatItIs}
                onChange={(e) => setWhatItIs(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-sci" className="font-ui text-bloom-aubergine/80">
                O que a ciência diz
              </Label>
              <textarea
                id="skill-sci"
                className={`${inputCls} min-h-[120px]`}
                value={scienceSays}
                onChange={(e) => setScienceSays(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="skill-active" className="font-ui text-sm text-bloom-aubergine cursor-pointer">
                Ativa no app
              </Label>
              <Switch id="skill-active" checked={active} onCheckedChange={setActive} />
            </div>
            {!isNew && id && (
              <div className="pt-1">
                <PillButton asLink={`/habilidades/${id}/itens`} variant="ghost-aubergine">
                  Gerenciar itens
                </PillButton>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <PillButton type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : "Salvar"}
              </PillButton>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate("/habilidades")}>
                Cancelar
              </Button>
            </div>
          </form>
        </FadeIn>
      )}
    </div>
  );
}
