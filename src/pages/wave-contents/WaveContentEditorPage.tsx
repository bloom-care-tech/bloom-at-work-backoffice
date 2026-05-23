import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMatch, useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, Trash } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { WaveHierarchyBreadcrumb } from "@/components/waves/WaveHierarchyBreadcrumb";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import {
  createMuxDirectUpload,
  createWaveContent,
  fetchMuxUploadStatus,
  fetchEditorialExperts,
  fetchWave,
  fetchWaveContent,
  fetchWaveModules,
  updateWaveContent,
  uploadEditorialMediaAsset,
} from "@/lib/admin-api";
import {
  normalizeWaveContentKindToApi,
  WAVE_CONTENT_KIND_OPTIONS,
  type WaveContentKindApi,
} from "@/lib/wave-content-kinds";
import { WaveArticleTinyMceEditor } from "@/pages/wave-contents/WaveArticleTinyMceEditor";
import { WaveContentPreviewDialog } from "@/pages/wave-contents/WaveContentPreview";
import {
  articleExtrasFromPayload,
  articleFormatFromPayload,
  articleHtmlUrlFromPayload,
  buildReferenciasForApi,
  emptyRefRow,
  extractArticleEditorHtml,
  mediaDescriptionFromPayload,
  payloadRecordFromUnknown,
  mediaExtrasFromPayload,
  mediaUrlKeyForKind,
  refsFromPayload,
  scientificRefsExtrasFromPayload,
  toolkitExtrasFromPayload,
  toolkitItensFromPayload,
  toolkitSectionTituloFromPayload,
  type ArticleFormat,
  type RefFormRow,
} from "@/pages/wave-contents/wave-content-editor-payload";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

type VideoProvider = "youtube" | "mux";

const MUX_POLL_INTERVAL_MS = 3000;
const MUX_MAX_POLL_ATTEMPTS = 80;

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function articleExtrasForHtmlFormat(extras: Record<string, unknown>): Record<string, unknown> {
  const next = { ...extras };
  delete next.expertId;
  delete next.quote;
  delete next.author;
  return next;
}

function videoPayloadFromEditor(
  provider: VideoProvider,
  mediaUrl: string,
  mediaExtras: Record<string, unknown>,
  description: string,
): Record<string, unknown> {
  const d = description.trim();
  const extras = { ...mediaExtras };
  if (provider === "youtube") {
    delete extras.muxUploadId;
    delete extras.muxAssetId;
    delete extras.muxPlaybackId;
    delete extras.muxStatus;
    delete extras.muxDuration;
    delete extras.muxAspectRatio;
    delete extras.muxThumbnailUrl;
  }
  return {
    ...extras,
    provider,
    videoUrl: mediaUrl.trim(),
    ...(d ? { description: d } : {}),
  };
}

function buildPayload(
  kind: WaveContentKindApi,
  ctx: {
    articleHtml: string;
    articleFormat: ArticleFormat;
    articleHtmlUrl: string;
    articleExtras: Record<string, unknown>;
    articleDescription: string;
    mediaUrl: string;
    mediaDescription: string;
    mediaExtras: Record<string, unknown>;
    videoProvider: VideoProvider;
    refRows: RefFormRow[];
    scientificRefsDescription: string;
    refExtras: Record<string, unknown>;
    contentTitle: string;
    toolkitSectionTitulo: string;
    toolkitItens: string[];
    toolkitExtras: Record<string, unknown>;
    exerciseFormUrl: string;
    exerciseDescription: string;
    exerciseDisplayMode: "iframe" | "new_tab";
  },
): Record<string, unknown> {
  switch (kind) {
    case "article": {
      const d = ctx.articleDescription.trim();
      if (ctx.articleFormat === "html") {
        return {
          ...articleExtrasForHtmlFormat(ctx.articleExtras),
          articleFormat: "html",
          htmlUrl: ctx.articleHtmlUrl.trim(),
          displayMode: "iframe",
          ...(d ? { description: d } : {}),
        };
      }
      return {
        ...ctx.articleExtras,
        articleFormat: "editor",
        bodyHtml: ctx.articleHtml,
        ...(d ? { description: d } : {}),
      };
    }
    case "video": {
      return videoPayloadFromEditor(ctx.videoProvider, ctx.mediaUrl, ctx.mediaExtras, ctx.mediaDescription);
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
      const d = ctx.scientificRefsDescription.trim();
      return {
        ...ctx.refExtras,
        referencias: buildReferenciasForApi(ctx.refRows),
        ...(d ? { description: d } : {}),
      };
    }
    case "toolkit": {
      const titulo = ctx.contentTitle.trim();
      const sectionTitulo = ctx.toolkitSectionTitulo.trim() || titulo;
      const itens = ctx.toolkitItens.map((s) => s.trim()).filter(Boolean);
      return {
        ...ctx.toolkitExtras,
        kind: "toolkit",
        titulo,
        toolkit: { titulo: sectionTitulo, itens },
      };
    }
    case "exercise": {
      const d = ctx.exerciseDescription.trim();
      return {
        externalFormUrl: ctx.exerciseFormUrl.trim(),
        displayMode: ctx.exerciseDisplayMode,
        ...(d ? { description: d } : {}),
      };
    }
    default:
      return {};
  }
}

export function WaveContentEditorPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { ondaId, moduloId, conteudoId } = useParams<{
    ondaId: string;
    moduloId: string;
    conteudoId: string;
  }>();
  const isNew =
    useMatch({ path: "/ondas/:ondaId/modulos/:moduloId/conteudos/novo", end: true }) != null;
  const id = isNew ? undefined : conteudoId;

  const { data, isLoading } = useQuery({
    queryKey: ["wave-content", id],
    queryFn: () => fetchWaveContent(id!),
    enabled: Boolean(id),
  });

  const { data: waveMeta, isLoading: waveMetaLoading } = useQuery({
    queryKey: ["wave", ondaId],
    queryFn: () => fetchWave(ondaId!),
    enabled: Boolean(ondaId),
  });

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ["wave-modules", ondaId],
    queryFn: () => fetchWaveModules(ondaId!),
    enabled: Boolean(ondaId),
  });

  const moduleTitle = useMemo(() => modules?.find((m) => m.id === moduloId)?.title, [modules, moduloId]);

  const [kind, setKind] = useState<WaveContentKindApi>("article");
  const [title, setTitle] = useState("");
  const { data: expertsForArticles } = useQuery({
    queryKey: ["editorial-experts", true],
    queryFn: () => fetchEditorialExperts(true),
    enabled: kind === "article",
  });
  const [exerciseFormUrl, setExerciseFormUrl] = useState("");
  const [exerciseDescription, setExerciseDescription] = useState("");
  const [exerciseDisplayMode, setExerciseDisplayMode] = useState<"iframe" | "new_tab">("iframe");
  const [isNewFlag, setIsNewFlag] = useState(false);
  const [published, setPublished] = useState(true);

  const [articleFormat, setArticleFormat] = useState<ArticleFormat>("editor");
  const [articleHtml, setArticleHtml] = useState("<p></p>");
  const [articleHtmlUrl, setArticleHtmlUrl] = useState("");
  const [articleDescription, setArticleDescription] = useState("");
  const [articleExtras, setArticleExtras] = useState<Record<string, unknown>>({});
  const [articleEditorNonce, setArticleEditorNonce] = useState(0);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaDescription, setMediaDescription] = useState("");
  const [mediaExtras, setMediaExtras] = useState<Record<string, unknown>>({});
  const [videoProvider, setVideoProvider] = useState<VideoProvider>("youtube");

  const [refRows, setRefRows] = useState<RefFormRow[]>([emptyRefRow()]);
  const [scientificRefsDescription, setScientificRefsDescription] = useState("");
  const [refExtras, setRefExtras] = useState<Record<string, unknown>>({});

  const [toolkitSectionTitulo, setToolkitSectionTitulo] = useState("");
  const [toolkitItens, setToolkitItens] = useState<string[]>([""]);
  const [toolkitExtras, setToolkitExtras] = useState<Record<string, unknown>>({});

  const [showPreview, setShowPreview] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [articleHtmlUploading, setArticleHtmlUploading] = useState(false);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const articleHtmlFileInputRef = useRef<HTMLInputElement>(null);

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
      setArticleFormat("editor");
      setArticleHtml("<p></p>");
      setArticleHtmlUrl("");
      setArticleDescription("");
      setArticleExtras({});
      setArticleEditorNonce((n) => n + 1);
    }
    if (kind === "video" || kind === "audio" || kind === "pdf") {
      setMediaUrl("");
      setMediaDescription("");
      setMediaExtras({});
      setVideoProvider("youtube");
    }
    if (kind === "scientificReferences") {
      setRefRows([emptyRefRow()]);
      setScientificRefsDescription("");
      setRefExtras({});
    }
    if (kind === "toolkit") {
      setToolkitSectionTitulo("");
      setToolkitItens([""]);
      setToolkitExtras({});
    }
    if (kind === "exercise") {
      setExerciseFormUrl("");
      setExerciseDescription("");
      setExerciseDisplayMode("iframe");
    }
  }, [kind, isNew]);

  useLayoutEffect(() => {
    if (!data) return;
    const k = normalizeWaveContentKindToApi(data.kind);
    const p = payloadRecordFromUnknown(data.payload);
    setKind(k);
    setTitle(data.title);
    setIsNewFlag(data.isNew);
    setPublished(Boolean(data.publishedAt));

    if (k === "article") {
      setArticleFormat(articleFormatFromPayload(p));
      setArticleHtml(extractArticleEditorHtml(p));
      setArticleHtmlUrl(articleHtmlUrlFromPayload(p));
      setArticleDescription(mediaDescriptionFromPayload(p));
      setArticleExtras(articleExtrasFromPayload(p));
      setArticleEditorNonce((n) => n + 1);
    } else if (k === "video" || k === "audio" || k === "pdf") {
      const key = mediaUrlKeyForKind(k);
      setMediaUrl(typeof p[key] === "string" ? (p[key] as string) : "");
      setMediaDescription(mediaDescriptionFromPayload(p));
      setMediaExtras(mediaExtrasFromPayload(p, k));
      if (k === "video") {
        setVideoProvider(p.provider === "mux" ? "mux" : "youtube");
      }
    } else if (k === "scientificReferences") {
      setRefRows(refsFromPayload(p));
      setScientificRefsDescription(mediaDescriptionFromPayload(p));
      setRefExtras(scientificRefsExtrasFromPayload(p));
    } else if (k === "toolkit") {
      setToolkitSectionTitulo(toolkitSectionTituloFromPayload(p));
      setToolkitItens(toolkitItensFromPayload(p));
      setToolkitExtras(toolkitExtrasFromPayload(p));
    } else if (k === "exercise") {
      setExerciseFormUrl(typeof p.externalFormUrl === "string" ? p.externalFormUrl : "");
      setExerciseDescription(mediaDescriptionFromPayload(p));
      setExerciseDisplayMode(p.displayMode === "new_tab" ? "new_tab" : "iframe");
    }
  }, [data]);

  const preview = useMemo(() => {
    try {
      const payload = buildPayload(kind, {
        articleHtml,
        articleFormat,
        articleHtmlUrl,
        articleExtras,
        articleDescription,
        mediaUrl,
        mediaDescription,
        mediaExtras,
        videoProvider,
        refRows,
        scientificRefsDescription,
        refExtras,
        contentTitle: title.trim(),
        toolkitSectionTitulo,
        toolkitItens,
        toolkitExtras,
        exerciseFormUrl,
        exerciseDescription,
        exerciseDisplayMode,
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
    articleFormat,
    articleHtmlUrl,
    articleExtras,
    articleDescription,
    mediaUrl,
    mediaDescription,
    mediaExtras,
    videoProvider,
    refRows,
    scientificRefsDescription,
    refExtras,
    title,
    toolkitSectionTitulo,
    toolkitItens,
    toolkitExtras,
    exerciseFormUrl,
    exerciseDescription,
    exerciseDisplayMode,
  ]);

  const breadcrumbs = useMemo(() => {
    if (!ondaId || !moduloId) return [];
    const waveLabel = waveMeta?.title ?? (waveMetaLoading ? "…" : "Onda");
    const modLabel = moduleTitle ?? (modulesLoading ? "…" : "Módulo");
    const contentsPath = `/ondas/${ondaId}/modulos/${moduloId}/conteudos`;
    const leaf = isNew
      ? "Novo conteúdo"
      : title.trim() || data?.title || (isLoading ? "…" : "Conteúdo");
    return [
      { label: "Ondas", to: "/ondas" as const },
      { label: waveLabel, to: `/ondas/${ondaId}` as const },
      { label: modLabel, to: `/ondas/${ondaId}/modulos` as const },
      { label: "Conteúdos", to: contentsPath },
      { label: leaf },
    ];
  }, [
    ondaId,
    moduloId,
    waveMeta?.title,
    waveMetaLoading,
    moduleTitle,
    modulesLoading,
    isNew,
    title,
    data?.title,
    isLoading,
  ]);

  const save = useMutation({
    mutationFn: async () => {
      let payload: Record<string, unknown>;
      try {
        payload = buildPayload(kind, {
          articleHtml,
          articleFormat,
          articleHtmlUrl,
          articleExtras,
          articleDescription,
          mediaUrl,
          mediaDescription,
          mediaExtras,
          videoProvider,
          refRows,
          scientificRefsDescription,
          refExtras,
          contentTitle: title.trim(),
          toolkitSectionTitulo,
          toolkitItens,
          toolkitExtras,
          exerciseFormUrl,
          exerciseDescription,
          exerciseDisplayMode,
        });
      } catch (e) {
        throw e instanceof Error ? e : new Error("Invalid payload.");
      }
      if (!title.trim()) throw new Error("Informe o título.");
      if (kind === "video" && videoProvider === "youtube" && !mediaUrl.trim()) {
        throw new Error("Informe a URL do YouTube.");
      }
      if (kind === "video" && videoProvider === "mux" && !mediaUrl.trim()) {
        throw new Error("Envie um ficheiro de vídeo e aguarde o processamento do Mux.");
      }
      if ((kind === "audio" || kind === "pdf") && !mediaUrl.trim()) {
        throw new Error("Informe uma URL externa ou envie um ficheiro.");
      }
      if (kind === "article" && articleFormat === "html" && !articleHtmlUrl.trim()) {
        throw new Error("Informe uma URL externa ou envie um ficheiro HTML.");
      }
      if (kind === "exercise" && !exerciseFormUrl.trim()) {
        throw new Error("Informe a URL HTTPS do formulário externo.");
      }
      const publishedAt = published ? new Date().toISOString() : null;
      if (id) {
        await updateWaveContent(id, {
          kind,
          title: title.trim(),
          payload,
          isNew: isNewFlag,
          publishedAt,
        });
      } else {
        await createWaveContent(ondaId!, moduloId!, {
          kind,
          title: title.trim(),
          payload,
          isNew: isNewFlag,
          publishedAt,
        });
      }
    },
    onSuccess: () => {
      toast(id ? "Conteúdo atualizado." : "Conteúdo criado.");
      void qc.invalidateQueries({ queryKey: ["wave-contents", ondaId, moduloId] });
      void qc.invalidateQueries({ queryKey: ["wave-content"] });
      navigate(`/ondas/${ondaId}/modulos/${moduloId}/conteudos`);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao salvar."),
  });

  function updateRefRow(i: number, patch: Partial<RefFormRow>) {
    setRefRows((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function onWaveMediaFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || (kind !== "video" && kind !== "audio" && kind !== "pdf")) return;
    setMediaUploading(true);
    try {
      if (kind === "video") {
        if (videoProvider !== "mux") return;
        setMediaUrl("");
        setMediaExtras((prev) => ({ ...prev, provider: "mux", muxStatus: "creating_upload" }));
        const { uploadId, uploadUrl } = await createMuxDirectUpload();
        setMediaExtras((prev) => ({ ...prev, provider: "mux", muxUploadId: uploadId, muxStatus: "uploading" }));
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
        if (!uploadResponse.ok) {
          throw new Error(`Upload para o Mux falhou (${uploadResponse.status}).`);
        }
        setMediaExtras((prev) => ({ ...prev, provider: "mux", muxUploadId: uploadId, muxStatus: "processing" }));
        toast("Vídeo enviado ao Mux. Aguardando processamento…");

        for (let attempt = 0; attempt < MUX_MAX_POLL_ATTEMPTS; attempt++) {
          const status = await fetchMuxUploadStatus(uploadId);
          setMediaExtras((prev) => ({
            ...prev,
            provider: "mux",
            muxUploadId: uploadId,
            muxStatus: status.status,
            ...(status.assetId ? { muxAssetId: status.assetId } : {}),
            ...(status.playbackId ? { muxPlaybackId: status.playbackId } : {}),
            ...(status.duration !== null ? { muxDuration: status.duration } : {}),
            ...(status.aspectRatio ? { muxAspectRatio: status.aspectRatio } : {}),
            ...(status.playbackId ? { muxThumbnailUrl: `https://image.mux.com/${status.playbackId}/thumbnail.jpg` } : {}),
          }));
          if (status.status === "ready" && status.videoUrl && status.playbackId) {
            setMediaUrl(status.videoUrl);
            toast("Vídeo pronto no Mux. O endereço foi preenchido automaticamente.");
            return;
          }
          if (status.status === "errored" || status.status === "cancelled" || status.status === "timed_out") {
            throw new Error(status.error ?? "O Mux não conseguiu processar este vídeo.");
          }
          await delay(MUX_POLL_INTERVAL_MS);
        }
        throw new Error("O vídeo foi enviado, mas o processamento do Mux ainda não terminou. Tente consultar novamente mais tarde.");
      }

      const { url } = await uploadEditorialMediaAsset(file, { context: "wave", kind });
      setMediaUrl(url);
      toast("Ficheiro enviado. O endereço foi preenchido automaticamente.");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Falha ao enviar o ficheiro.");
    } finally {
      setMediaUploading(false);
    }
  }

  async function onArticleHtmlFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || kind !== "article" || articleFormat !== "html") return;
    setArticleHtmlUploading(true);
    try {
      const { url } = await uploadEditorialMediaAsset(file, { context: "wave", kind: "html" });
      setArticleHtmlUrl(url);
      toast("Ficheiro HTML enviado. O endereço foi preenchido automaticamente.");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Falha ao enviar o ficheiro HTML.");
    } finally {
      setArticleHtmlUploading(false);
    }
  }

  if (!ondaId || !moduloId || (!isNew && !conteudoId)) return null;

  const mediaLabel =
    kind === "video" && videoProvider === "mux"
      ? "Mux Player URL"
      : kind === "video"
        ? "YouTube URL"
        : kind === "audio"
          ? "Audio URL"
          : kind === "pdf"
            ? "PDF URL"
            : "URL";

  return (
    <div className="space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Trilha</Eyebrow>
        <WaveHierarchyBreadcrumb items={breadcrumbs} />
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">{isNew ? "Novo conteúdo" : "Editar conteúdo"}</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
          Artigos: Editor (TinyMCE) ou HTML embutido por URL/envio. Exercício: URL HTTPS do formulário (Typeform, Tally, etc.). Vídeo: YouTube ou Mux. Áudio/PDF: URL ou envio; referências: tabela; toolkit: lista de itens (campos{" "}
          <code className="text-[11px]">kind</code>, <code className="text-[11px]">titulo</code>, <code className="text-[11px]">toolkit</code>
          ).
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
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {kind === "article" && (
              <div className="space-y-4" data-article-editor={articleFormat}>
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
                  <Label className="font-ui text-bloom-aubergine/80">Formato</Label>
                  <select
                    className={inputCls}
                    value={articleFormat}
                    onChange={(e) => {
                      const nextFormat = e.target.value as ArticleFormat;
                      setArticleFormat(nextFormat);
                      if (nextFormat === "html") {
                        setArticleExtras(articleExtrasForHtmlFormat);
                      }
                    }}
                  >
                    <option value="editor">Editor</option>
                    <option value="html">HTML</option>
                  </select>
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    <strong className="font-medium text-bloom-aubergine/75">Editor</strong> mantém o artigo editável aqui.{" "}
                    <strong className="font-medium text-bloom-aubergine/75">HTML</strong> usa um ficheiro ou URL externa embutida no app.
                  </p>
                </div>
                {articleFormat === "editor" && (
                  <>
                    <div className="space-y-2">
                      <Label className="font-ui text-bloom-aubergine/80">Especialista (autor do artigo)</Label>
                      <select
                        className={inputCls}
                        value={typeof articleExtras.expertId === "string" ? articleExtras.expertId : ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setArticleExtras((prev) => {
                            const next = { ...prev };
                            if (!v) delete next.expertId;
                            else next.expertId = v;
                            return next;
                          });
                        }}
                      >
                        <option value="">Nenhum</option>
                        {(expertsForArticles?.items ?? []).map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.name} — {ex.specialty}
                          </option>
                        ))}
                      </select>
                      <p className="font-ui text-xs text-bloom-aubergine/55">
                        Gravado como <code className="text-[11px]">expertId</code> no payload.{" "}
                        <Link to="/especialistas" className="text-bloom-garnet hover:underline">
                          Gerir especialistas
                        </Link>
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-ui text-bloom-aubergine/80">Citação em destaque (opcional)</Label>
                        <textarea
                          className={`${inputCls} min-h-[72px] resize-y`}
                          value={typeof articleExtras.quote === "string" ? articleExtras.quote : ""}
                          onChange={(e) =>
                            setArticleExtras((prev) => ({ ...prev, quote: e.target.value }))
                          }
                          placeholder="Texto curto da citação"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-ui text-bloom-aubergine/80">Autor da citação (opcional)</Label>
                        <input
                          className={inputCls}
                          value={typeof articleExtras.author === "string" ? articleExtras.author : ""}
                          onChange={(e) =>
                            setArticleExtras((prev) => ({ ...prev, author: e.target.value }))
                          }
                          placeholder="Nome ou fonte"
                        />
                      </div>
                    </div>
                    <p className="font-ui text-xs text-bloom-aubergine/55 -mt-2">
                      Gravados como <code className="text-[11px]">quote</code> e <code className="text-[11px]">author</code> no payload. Se{" "}
                      <code className="text-[11px]">author</code> estiver vazio, o app usa o especialista do artigo como &quot;Nome,
                      Especialidade&quot;. Não é possível ter <code className="text-[11px]">author</code> sem <code className="text-[11px]">quote</code>.
                    </p>
                  </>
                )}
                {articleFormat === "editor" ? (
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
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-ui text-bloom-aubergine/80">HTML URL</Label>
                      <input
                        className={inputCls}
                        value={articleHtmlUrl}
                        onChange={(e) => setArticleHtmlUrl(e.target.value)}
                        placeholder="https://… (URL externa) ou use o envio abaixo"
                        disabled={articleHtmlUploading}
                      />
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <input
                          ref={articleHtmlFileInputRef}
                          type="file"
                          className="sr-only"
                          accept="text/html,.html,.htm"
                          aria-hidden
                          tabIndex={-1}
                          onChange={onArticleHtmlFileSelected}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full"
                          disabled={save.isPending || articleHtmlUploading}
                          onClick={() => articleHtmlFileInputRef.current?.click()}
                        >
                          {articleHtmlUploading ? "A enviar…" : "Enviar ficheiro HTML"}
                        </Button>
                        <p className="font-ui text-xs text-bloom-aubergine/55">
                          Após o envio, o campo acima é preenchido com o endereço público do ficheiro (
                          <code className="text-[11px]">htmlUrl</code>).
                        </p>
                      </div>
                    </div>
                    <p className="font-ui text-xs text-bloom-aubergine/55">
                      Gravado como <code className="text-[11px]">articleFormat=html</code>,{" "}
                      <code className="text-[11px]">htmlUrl</code> e exibido sempre embutido no app.
                    </p>
                  </div>
                )}
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
                  {kind === "video" && (
                    <div className="space-y-2 pb-2">
                      <Label className="font-ui text-bloom-aubergine/80">Origem do vídeo</Label>
                      <select
                        className={inputCls}
                        value={videoProvider}
                        onChange={(e) => {
                          const next = e.target.value as VideoProvider;
                          setVideoProvider(next);
                          setMediaUrl("");
                          setMediaExtras(next === "mux" ? { provider: "mux" } : { provider: "youtube" });
                        }}
                        disabled={mediaUploading}
                      >
                        <option value="youtube">YouTube</option>
                        <option value="mux">Mux</option>
                      </select>
                    </div>
                  )}
                  <Label className="font-ui text-bloom-aubergine/80">{mediaLabel}</Label>
                  <input
                    className={inputCls}
                    value={mediaUrl}
                    onChange={(e) => {
                      setMediaUrl(e.target.value);
                      if (kind === "video") {
                        setMediaExtras((prev) => ({ ...prev, provider: videoProvider }));
                      }
                    }}
                    placeholder={
                      kind === "video" && videoProvider === "youtube"
                        ? "https://www.youtube.com/embed/…"
                        : kind === "video"
                          ? "Preenchido automaticamente após o processamento do Mux"
                        : "https://… (URL externa) ou use o envio abaixo"
                    }
                    disabled={mediaUploading || (kind === "video" && videoProvider === "mux")}
                  />
                  {((kind === "video" && videoProvider === "mux") || kind === "audio" || kind === "pdf") && (
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <input
                        ref={mediaFileInputRef}
                        type="file"
                        className="sr-only"
                        accept={
                          kind === "video"
                            ? "video/*,.mp4,.mov,.m4v,.webm,.mkv"
                            : kind === "audio"
                            ? "audio/*,.mp3,.m4a,.wav,.webm,.ogg"
                            : "application/pdf,.pdf"
                        }
                        aria-hidden
                        tabIndex={-1}
                        onChange={onWaveMediaFileSelected}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        disabled={save.isPending || mediaUploading}
                        onClick={() => mediaFileInputRef.current?.click()}
                      >
                        {mediaUploading
                          ? kind === "video"
                            ? "A enviar/processar…"
                            : "A enviar…"
                          : kind === "video"
                            ? "Selecionar vídeo local"
                            : "Enviar ficheiro"}
                      </Button>
                      <p className="font-ui text-xs text-bloom-aubergine/55">
                        {kind === "video"
                          ? "O ficheiro é enviado diretamente ao Mux. Quando o processamento terminar, o campo acima recebe a URL do player."
                          : (
                            <>
                              Após o envio, o campo acima é preenchido com o endereço público do ficheiro (
                              <code className="text-[11px]">{mediaUrlKeyForKind(kind)}</code>).
                            </>
                          )}
                      </p>
                    </div>
                  )}
                  {kind === "video" && videoProvider === "mux" && typeof mediaExtras.muxStatus === "string" && (
                    <p className="font-ui text-xs text-bloom-aubergine/55">
                      Status Mux: <code className="text-[11px]">{mediaExtras.muxStatus}</code>
                      {typeof mediaExtras.muxPlaybackId === "string" ? (
                        <>
                          {" "}· playbackId: <code className="text-[11px]">{mediaExtras.muxPlaybackId}</code>
                        </>
                      ) : null}
                    </p>
                  )}
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    Campo <code className="text-[11px]">{mediaUrlKeyForKind(kind)}</code> no payload.{" "}
                    {kind === "video" ? "A origem é salva como provider." : "Outros metadados do item são preservados ao editar."}
                  </p>
                </div>
              </div>
            )}

            {kind === "scientificReferences" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Descrição</Label>
                  <textarea
                    className={`${inputCls} min-h-[88px] resize-y`}
                    value={scientificRefsDescription}
                    onChange={(e) => setScientificRefsDescription(e.target.value)}
                    placeholder="Optional intro shown under the title (payload.description, same level as referencias)."
                    rows={3}
                  />
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    Stored as <code className="text-[11px]">description</code> on the payload root (not inside each reference object).
                  </p>
                </div>
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
              <div className="space-y-4">
                <p className="font-ui text-xs text-bloom-aubergine/55">
                  O campo <strong className="font-medium text-bloom-aubergine/75">Título</strong> acima é gravado no registo e repetido em{" "}
                  <code className="text-[11px]">payload.titulo</code> (cartão na trilha). O bloco abaixo preenche{" "}
                  <code className="text-[11px]">payload.toolkit</code>.
                </p>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Toolkit — título do bloco</Label>
                  <input
                    className={inputCls}
                    value={toolkitSectionTitulo}
                    onChange={(e) => setToolkitSectionTitulo(e.target.value)}
                    placeholder="Ex.: Linha de cuidado — líder"
                  />
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    Gravado como <code className="text-[11px]">toolkit.titulo</code>. Se ficar vazio, usa o mesmo texto do título do conteúdo.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Itens</Label>
                  <p className="font-ui text-xs text-bloom-aubergine/55">Um campo por linha da lista (gravado como <code className="text-[11px]">toolkit.itens</code>).</p>
                  <div className="space-y-3">
                    {toolkitItens.map((line, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <input
                          className={inputCls}
                          value={line}
                          onChange={(e) =>
                            setToolkitItens((rows) => rows.map((r, j) => (j === i ? e.target.value : r)))
                          }
                          placeholder="Texto do item"
                        />
                        {toolkitItens.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-11 w-11 text-bloom-aubergine/60 hover:text-bloom-garnet"
                            aria-label="Remove item"
                            onClick={() => setToolkitItens((rows) => rows.filter((_, j) => j !== i))}
                          >
                            <Trash size={18} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full gap-2"
                    onClick={() => setToolkitItens((rows) => [...rows, ""])}
                  >
                    <Plus size={18} weight="bold" />
                    Adicionar item
                  </Button>
                </div>
              </div>
            )}

            {kind === "exercise" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">URL do formulário (HTTPS)</Label>
                  <input
                    className={inputCls}
                    value={exerciseFormUrl}
                    onChange={(e) => setExerciseFormUrl(e.target.value)}
                    placeholder="https://form.typeform.com/to/…"
                  />
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    Gravado como <code className="text-[11px]">externalFormUrl</code>. Use o link de compartilhamento do Typeform ou equivalente.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Descrição (opcional)</Label>
                  <textarea
                    className={`${inputCls} min-h-[88px] resize-y`}
                    value={exerciseDescription}
                    onChange={(e) => setExerciseDescription(e.target.value)}
                    placeholder="Contexto curto antes do formulário no app."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Exibição</Label>
                  <select
                    className={inputCls}
                    value={exerciseDisplayMode}
                    onChange={(e) => setExerciseDisplayMode(e.target.value as "iframe" | "new_tab")}
                  >
                    <option value="iframe">Embutido (iframe)</option>
                    <option value="new_tab">Abrir em nova aba</option>
                  </select>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-bloom-aubergine/12 bg-bloom-cream-deep/30 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <Label className="font-ui text-bloom-aubergine/80">Pré-visualização</Label>
                <p className="font-ui text-xs text-bloom-aubergine/55">
                  Abre o mesmo modal usado na trilha do app.
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
              isNew={isNewFlag}
              published={published}
              articleExperts={expertsForArticles?.items}
            />

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
              <PillButton type="submit" disabled={save.isPending || mediaUploading}>
                {save.isPending ? "Salvando…" : mediaUploading ? "Processando…" : "Salvar"}
              </PillButton>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate(`/ondas/${ondaId}/modulos/${moduloId}/conteudos`)}>
                Cancelar
              </Button>
            </div>
          </form>
        </FadeIn>
      )}
    </div>
  );
}
