import { useEffect, useRef, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { createDocumentCategory, fetchDocumentCategory, updateDocumentCategory } from "@/lib/admin-api";
import {
  isValidResourceSlug,
  resourceSlugValidationMessage,
  slugFromTitle,
} from "@/lib/slug";

const DEFAULT_ACCENT = "#1C0F29";
const HEX_ACCENT = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

function hexForNativeColorInput(hex: string): string {
  const t = hex.trim();
  const m = /^#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.exec(t);
  if (!m) return DEFAULT_ACCENT;
  const body = m[1].length === 8 ? m[1].slice(0, 6) : m[1];
  return `#${body}`.toLowerCase();
}

export function DocumentCategoryEditorPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = useMatch({ path: "/mapa-documentos/nova", end: true }) != null;
  const { categoryId } = useParams<{ categoryId: string }>();
  const id = isNew ? undefined : categoryId;

  const { data, isLoading } = useQuery({
    queryKey: ["document-category", id],
    queryFn: () => fetchDocumentCategory(id!),
    enabled: Boolean(id),
  });

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const slugManualRef = useRef(false);

  useEffect(() => {
    if (!data) return;
    setSlug(data.slug);
    setName(data.name);
    setDescription(data.description ?? "");
    setAccentColor(data.accentColor?.trim() && HEX_ACCENT.test(data.accentColor.trim()) ? data.accentColor.trim() : DEFAULT_ACCENT);
    slugManualRef.current = false;
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error("Preencha o nome.");
      }
      const raw = accentColor.trim();
      const accentOrDefault = HEX_ACCENT.test(raw) ? raw : DEFAULT_ACCENT;
      if (id) {
        await updateDocumentCategory(id, {
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          accentColor: accentOrDefault,
        });
      } else {
        const normalizedSlug = slugFromTitle(slug.trim() || name);
        if (!isValidResourceSlug(normalizedSlug)) {
          throw new Error(resourceSlugValidationMessage());
        }
        await createDocumentCategory({
          slug: normalizedSlug,
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          accentColor: accentOrDefault,
        });
      }
    },
    onSuccess: () => {
      toast(id ? "Categoria atualizada." : "Categoria criada.");
      void qc.invalidateQueries({ queryKey: ["doc-cats"] });
      void qc.invalidateQueries({ queryKey: ["document-category"] });
      navigate("/mapa-documentos");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao salvar."),
  });

  if (!isNew && !categoryId) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Biblioteca</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">
          {isNew ? "Nova categoria" : "Editar categoria"}
        </h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">Slug em minúsculas e hífens (ex.: beneficios).</p>
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
              <Label htmlFor="doc-cat-name" className="font-ui text-bloom-aubergine/80">
                Nome
              </Label>
              <input
                id="doc-cat-name"
                className={inputCls}
                value={name}
                onChange={(e) => {
                  const v = e.target.value;
                  setName(v);
                  if (isNew && !slugManualRef.current) {
                    setSlug(slugFromTitle(v));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-cat-slug" className="font-ui text-bloom-aubergine/80">
                Slug
              </Label>
              <input
                id="doc-cat-slug"
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
              <Label htmlFor="doc-cat-desc" className="font-ui text-bloom-aubergine/80">
                Descrição (opcional)
              </Label>
              <textarea
                id="doc-cat-desc"
                className={`${inputCls} min-h-[100px]`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-cat-accent" className="font-ui text-bloom-aubergine/80">
                Cor no mapa (hub)
              </Label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="doc-cat-accent-picker"
                  type="color"
                  aria-label="Escolher cor"
                  value={hexForNativeColorInput(accentColor)}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-11 w-14 shrink-0 rounded-xl border border-bloom-aubergine/10 cursor-pointer bg-bloom-cream-deep p-1"
                />
                <input
                  id="doc-cat-accent"
                  className={`${inputCls} flex-1 min-w-[160px]`}
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder={DEFAULT_ACCENT}
                  spellCheck={false}
                />
              </div>
              <p className="font-ui text-xs text-bloom-aubergine/55">
                Formato hex (#RRGGBB ou #RRGGBBAA). Aparece nos filtros e destaques do mapa de documentos no app.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <PillButton type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : "Salvar"}
              </PillButton>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate("/mapa-documentos")}>
                Cancelar
              </Button>
            </div>
          </form>
        </FadeIn>
      )}
    </div>
  );
}
