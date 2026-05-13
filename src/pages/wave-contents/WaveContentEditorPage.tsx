import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, Trash } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { createWaveContent, fetchWaveContent, updateWaveContent } from "@/lib/admin-api";
import {
  normalizeWaveContentKindToApi,
  WAVE_CONTENT_KIND_OPTIONS,
  type WaveContentKindApi,
} from "@/lib/wave-content-kinds";
import { WaveArticleTinyMceEditor } from "@/pages/wave-contents/WaveArticleTinyMceEditor";
import { WaveContentPreviewDialog } from "@/pages/wave-contents/WaveContentPreview";
import {
  articleExtrasFromPayload,
  buildReferenciasForApi,
  emptyRefRow,
  extractArticleEditorHtml,
  mediaDescriptionFromPayload,
  payloadRecordFromUnknown,
  mediaExtrasFromPayload,
  mediaUrlKeyForKind,
  omitKeys,
  refsFromPayload,
  type RefFormRow,
} from "@/pages/wave-contents/wave-content-editor-payload";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

function buildPayload(
  kind: WaveContentKindApi,
  ctx: {
    articleHtml: string;
    articleExtras: Record<string, unknown>;
    articleDescription: string;
    mediaUrl: string;
    mediaDescription: string;
    mediaExtras: Record<string, unknown>;
    refRows: RefFormRow[];
    refExtras: Record<string, unknown>;
    toolkitJson: string;
  },
): Record<string, unknown> {
  switch (kind) {
    case "article": {
      const d = ctx.articleDescription.trim();
      return { ...ctx.articleExtras, bodyHtml: ctx.articleHtml, ...(d ? { description: d } : {}) };
    }
    case "video": {
      const d = ctx.mediaDescription.trim();
      return { ...ctx.mediaExtras, videoUrl: ctx.mediaUrl.trim(), ...(d ? { description: d } : {}) };
    }
    case "audio": {
      const d = ctx.mediaDescription.trim();
      return { ...ctx.mediaExtras, audioUrl: ctx.mediaUrl.trim(), ...(d ? { description: d } : {}) };
    }
    case "pdf": {
      const d = ctx.mediaDescription.trim();
      return { ...ctx.mediaExtras, pdfUrl: ctx.mediaUrl.trim(), ...(d ? { description: d } : {}) };
    }
    case "scientificReferences": {
      return { ...ctx.refExtras, referencias: buildReferenciasForApi(ctx.refRows) };
    }
    case "toolkit": {
      let parsed: unknown;
      try {
        parsed = JSON.parse(ctx.toolkitJson);
      } catch {
        throw new Error("JSON do payload inválido.");
      }
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("O payload do toolkit deve ser um objeto JSON.");
      }
      return parsed as Record<string, unknown>;
    }
    default:
      return {};
  }
}

export function WaveContentEditorPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { ondaId, conteudoId } = useParams<{ ondaId: string; conteudoId: string }>();
  const isNew = useMatch({ path: "/ondas/:ondaId/conteudos/novo", end: true }) != null;
  const id = isNew ? undefined : conteudoId;

  const { data, isLoading } = useQuery({
    queryKey: ["wave-content", id],
    queryFn: () => fetchWaveContent(id!),
    enabled: Boolean(id),
  });

  const [kind, setKind] = useState<WaveContentKindApi>("article");
  const [title, setTitle] = useState("");
  const [isExercise, setIsExercise] = useState(false);
  const [isNewFlag, setIsNewFlag] = useState(false);
  const [published, setPublished] = useState(true);

  const [articleHtml, setArticleHtml] = useState("<p></p>");
  const [articleDescription, setArticleDescription] = useState("");
  const [articleExtras, setArticleExtras] = useState<Record<string, unknown>>({});
  const [articleEditorNonce, setArticleEditorNonce] = useState(0);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaDescription, setMediaDescription] = useState("");
  const [mediaExtras, setMediaExtras] = useState<Record<string, unknown>>({});

  const [refRows, setRefRows] = useState<RefFormRow[]>([emptyRefRow()]);
  const [refExtras, setRefExtras] = useState<Record<string, unknown>>({});

  const [toolkitJson, setToolkitJson] = useState("{}");

  const [showPreview, setShowPreview] = useState(false);

  const prevKindRef = useRef<WaveContentKindApi | null>(null);

  useEffect(() => {
    if (!isNew) {
      prevKindRef.current = kind;
      return;
    }
    const prev = prevKindRef.current;
    if (prev === null) {
      prevKindRef.current = kind;
      return;
    }
    if (prev === kind) return;
    prevKindRef.current = kind;
    if (kind === "article") {
      setArticleHtml("<p></p>");
      setArticleDescription("");
      setArticleExtras({});
      setArticleEditorNonce((n) => n + 1);
    }
    if (kind === "video" || kind === "audio" || kind === "pdf") {
      setMediaUrl("");
      setMediaDescription("");
      setMediaExtras({});
    }
    if (kind === "scientificReferences") {
      setRefRows([emptyRefRow()]);
      setRefExtras({});
    }
    if (kind === "toolkit") {
      setToolkitJson("{}");
    }
  }, [kind, isNew]);

  useLayoutEffect(() => {
    if (!data) return;
    const k = normalizeWaveContentKindToApi(data.kind);
    const p = payloadRecordFromUnknown(data.payload);
    setKind(k);
    setTitle(data.title);
    setIsExercise(Boolean(data.isExercise));
    setIsNewFlag(data.isNew);
    setPublished(Boolean(data.publishedAt));

    if (k === "article") {
      setArticleHtml(extractArticleEditorHtml(p));
      setArticleDescription(mediaDescriptionFromPayload(p));
      setArticleExtras(articleExtrasFromPayload(p));
      setArticleEditorNonce((n) => n + 1);
    } else if (k === "video" || k === "audio" || k === "pdf") {
      const key = mediaUrlKeyForKind(k);
      setMediaUrl(typeof p[key] === "string" ? (p[key] as string) : "");
      setMediaDescription(mediaDescriptionFromPayload(p));
      setMediaExtras(mediaExtrasFromPayload(p, k));
    } else if (k === "scientificReferences") {
      setRefRows(refsFromPayload(p));
      setRefExtras(omitKeys(p, ["referencias"]));
    } else if (k === "toolkit") {
      setToolkitJson(JSON.stringify(p, null, 2));
    }
  }, [data]);

  const preview = useMemo(() => {
    try {
      const payload = buildPayload(kind, {
        articleHtml,
        articleExtras,
        articleDescription,
        mediaUrl,
        mediaDescription,
        mediaExtras,
        refRows,
        refExtras,
        toolkitJson,
      });
      return { ok: true as const, payload, error: null as string | null };
    } catch (e) {
      return {
        ok: false as const,
        payload: null as Record<string, unknown> | null,
        error: e instanceof Error ? e.message : "Não foi possível montar a pré-visualização.",
      };
    }
  }, [
    kind,
    articleHtml,
    articleExtras,
    articleDescription,
    mediaUrl,
    mediaDescription,
    mediaExtras,
    refRows,
    refExtras,
    toolkitJson,
  ]);

  const save = useMutation({
    mutationFn: async () => {
      let payload: Record<string, unknown>;
      try {
        payload = buildPayload(kind, {
          articleHtml,
          articleExtras,
          articleDescription,
          mediaUrl,
          mediaDescription,
          mediaExtras,
          refRows,
          refExtras,
          toolkitJson,
        });
      } catch (e) {
        throw e instanceof Error ? e : new Error("Invalid payload.");
      }
      if (!title.trim()) throw new Error("Informe o título.");
      const publishedAt = published ? new Date().toISOString() : null;
      if (id) {
        await updateWaveContent(id, {
          kind,
          title: title.trim(),
          payload,
          isExercise,
          isNew: isNewFlag,
          publishedAt,
        });
      } else {
        await createWaveContent(ondaId!, {
          kind,
          title: title.trim(),
          payload,
          isExercise,
          isNew: isNewFlag,
          publishedAt,
        });
      }
    },
    onSuccess: () => {
      toast(id ? "Conteúdo atualizado." : "Conteúdo criado.");
      void qc.invalidateQueries({ queryKey: ["wave-contents", ondaId] });
      void qc.invalidateQueries({ queryKey: ["wave-content"] });
      navigate(`/ondas/${ondaId}/conteudos`);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao salvar."),
  });

  function updateRefRow(i: number, patch: Partial<RefFormRow>) {
    setRefRows((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  if (!ondaId || (!isNew && !conteudoId)) return null;

  const mediaLabel =
    kind === "video" ? "Video URL" : kind === "audio" ? "Audio URL" : kind === "pdf" ? "PDF URL" : "URL";

  return (
    <div className="space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Trilha</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">{isNew ? "Novo conteúdo" : "Editar conteúdo"}</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
          Artigos: corpo em HTML (TinyMCE — inclui modo código na barra). Vídeo/áudio/PDF: descrição e URL; referências: tabela; toolkit: JSON.
        </p>
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
              <Label className="font-ui text-bloom-aubergine/80">Tipo</Label>
              <select
                className={inputCls}
                value={kind}
                onChange={(e) => setKind(e.target.value as WaveContentKindApi)}
                disabled={!isNew}
              >
                {WAVE_CONTENT_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {!isNew && <p className="font-ui text-xs text-bloom-aubergine/50">Tipo não pode ser alterado após criação.</p>}
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Título</Label>
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            {kind === "article" && (
              <div className="space-y-4" data-article-editor="tinymce">
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Descrição</Label>
                  <textarea
                    className={`${inputCls} min-h-[88px] resize-y`}
                    value={articleDescription}
                    onChange={(e) => setArticleDescription(e.target.value)}
                    placeholder="Subtítulo ou resumo curto (aparece no app como descricao / linha de apoio ao título)."
                    rows={3}
                  />
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    Gravado como <code className="text-[11px]">description</code> no payload (campo <code className="text-[11px]">descricao</code> no front).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Corpo do artigo</Label>
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    Gravado como <code className="text-[11px]">bodyHtml</code>. Edição visual e código-fonte estão no editor (botão &quot;code&quot; / fullscreen).
                  </p>
                  <WaveArticleTinyMceEditor
                    editorKey={`article-${id ?? "new"}-${articleEditorNonce}`}
                    value={articleHtml}
                    onChange={setArticleHtml}
                    disabled={save.isPending}
                  />
                </div>
              </div>
            )}

            {(kind === "video" || kind === "audio" || kind === "pdf") && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Descrição</Label>
                  <textarea
                    className={`${inputCls} min-h-[88px] resize-y`}
                    value={mediaDescription}
                    onChange={(e) => setMediaDescription(e.target.value)}
                    placeholder={
                      kind === "video"
                        ? "Ex.: Vídeo aplicado ao ambiente corporativo."
                        : kind === "audio"
                          ? "Ex.: Áudio breve para uma pausa intencional."
                          : "Ex.: Guia visual com marcadores por fase."
                    }
                    rows={3}
                  />
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    Salvo como <code className="text-[11px]">description</code> no payload (subtítulo no app).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">{mediaLabel}</Label>
                  <input
                    className={inputCls}
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder={
                      kind === "video"
                        ? "https://www.youtube.com/embed/…"
                        : "URL do arquivo ou caminho público"
                    }
                    required
                  />
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    Campo <code className="text-[11px]">{mediaUrlKeyForKind(kind)}</code> no payload. Outros metadados do item são preservados ao editar.
                  </p>
                </div>
              </div>
            )}

            {kind === "scientificReferences" && (
              <div className="space-y-3">
                <Label className="font-ui text-bloom-aubergine/80">Referências</Label>
                <p className="font-ui text-xs text-bloom-aubergine/55">
                  Cada linha com título, autores, fonte e DOI obrigatórios; número opcional (padrão: ordem na lista).
                </p>
                <div className="space-y-4">
                  {refRows.map((row, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-bloom-aubergine/10 bg-bloom-cream-deep/25 p-4 space-y-3 relative"
                    >
                      {refRows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 text-bloom-aubergine/60 hover:text-bloom-garnet"
                          aria-label="Remove reference"
                          onClick={() => setRefRows((rows) => rows.filter((_, j) => j !== i))}
                        >
                          <Trash size={18} />
                        </Button>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2 pr-8">
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs text-bloom-aubergine/70">Título</Label>
                          <input
                            className={inputCls}
                            value={row.titulo}
                            onChange={(e) => updateRefRow(i, { titulo: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs text-bloom-aubergine/70">Autores</Label>
                          <input
                            className={inputCls}
                            value={row.autores}
                            onChange={(e) => updateRefRow(i, { autores: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-bloom-aubergine/70">Fonte</Label>
                          <input className={inputCls} value={row.fonte} onChange={(e) => updateRefRow(i, { fonte: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-bloom-aubergine/70">DOI</Label>
                          <input className={inputCls} value={row.doi} onChange={(e) => updateRefRow(i, { doi: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-bloom-aubergine/70">Número (opcional)</Label>
                          <input
                            className={inputCls}
                            value={row.numero}
                            onChange={(e) => updateRefRow(i, { numero: e.target.value })}
                            placeholder="1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full gap-2"
                  onClick={() => setRefRows((rows) => [...rows, emptyRefRow()])}
                >
                  <Plus size={18} weight="bold" />
                  Adicionar referência
                </Button>
              </div>
            )}

            {kind === "toolkit" && (
              <div className="space-y-2">
                <Label className="font-ui text-bloom-aubergine/80">Payload (JSON)</Label>
                <textarea
                  className={`${inputCls} min-h-[200px] font-mono text-xs`}
                  value={toolkitJson}
                  onChange={(e) => setToolkitJson(e.target.value)}
                />
              </div>
            )}

            <div className="rounded-xl border border-bloom-aubergine/12 bg-bloom-cream-deep/30 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <Label className="font-ui text-bloom-aubergine/80">Pré-visualização</Label>
                <p className="font-ui text-xs text-bloom-aubergine/55">
                  Abre o mesmo modal usado na trilha do app (HTML sanitizado).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-full shrink-0 gap-2 border-bloom-aubergine/20"
                onClick={() => setShowPreview(true)}
              >
                <Eye size={18} weight="bold" />
                Pré-visualizar
              </Button>
            </div>
            <WaveContentPreviewDialog
              open={showPreview}
              onOpenChange={setShowPreview}
              kind={kind}
              title={title}
              payload={preview.ok ? preview.payload : null}
              error={preview.error}
              isExercise={isExercise}
              isNew={isNewFlag}
              published={published}
            />

            <div className="flex items-center gap-3">
              <Label htmlFor="wave-content-exercise" className="font-ui text-sm text-bloom-aubergine cursor-pointer">
                Exercício
              </Label>
              <Switch id="wave-content-exercise" checked={isExercise} onCheckedChange={setIsExercise} />
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="wave-content-is-new" className="font-ui text-sm text-bloom-aubergine cursor-pointer">
                Mostrar como novo
              </Label>
              <Switch id="wave-content-is-new" checked={isNewFlag} onCheckedChange={setIsNewFlag} />
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="wave-content-published" className="font-ui text-sm text-bloom-aubergine cursor-pointer">
                Publicado
              </Label>
              <Switch id="wave-content-published" checked={published} onCheckedChange={setPublished} />
            </div>
            <div className="flex gap-3 pt-2">
              <PillButton type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : "Salvar"}
              </PillButton>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate(`/ondas/${ondaId}/conteudos`)}>
                Cancelar
              </Button>
            </div>
          </form>
        </FadeIn>
      )}
    </div>
  );
}
