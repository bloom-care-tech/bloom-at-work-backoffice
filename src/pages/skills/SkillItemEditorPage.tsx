import { useEffect, useMemo, useRef, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { WaveHierarchyBreadcrumb } from "@/components/waves/WaveHierarchyBreadcrumb";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import {
  createMuxDirectUpload,
  createSkillItem,
  fetchMuxUploadStatus,
  fetchSkillById,
  fetchSkillItemById,
  updateSkillItem,
  uploadEditorialMediaAsset,
} from "@/lib/admin-api";
import { SKILL_ITEM_TYPE_OPTIONS, type SkillItemTypeApi } from "@/lib/skill-item-labels";
import { WaveArticleTinyMceEditor } from "@/pages/wave-contents/WaveArticleTinyMceEditor";
import {
  articleFormatFromPayload,
  articleHtmlUrlFromPayload,
  extractArticleEditorHtml,
  mediaDescriptionFromPayload,
  type ArticleFormat,
} from "@/pages/wave-contents/wave-content-editor-payload";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

type VideoProvider = "youtube" | "mux";

const MUX_POLL_INTERVAL_MS = 3000;
const MUX_MAX_POLL_ATTEMPTS = 80;

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function numOrUndef(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function skillArticleExtrasFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const next = { ...payload };
  for (const key of [
    "body",
    "bodyHtml",
    "htmlUrl",
    "articleFormat",
    "format",
    "displayMode",
    "description",
    "descricao",
    "expertId",
    "quote",
    "author",
  ]) {
    delete next[key];
  }
  return next;
}

function isRichTextSkillItemType(type: SkillItemTypeApi): boolean {
  return type === "text" || type === "exercise";
}

function isReferencesSkillItemType(type: SkillItemTypeApi): boolean {
  return type === "references";
}

type SkillReferenceFormRow = {
  autores: string;
  ano: string;
  titulo: string;
  fonte: string;
};

function emptySkillReferenceRow(): SkillReferenceFormRow {
  return { autores: "", ano: "", titulo: "", fonte: "" };
}

function skillReferencesFromPayload(payload: Record<string, unknown>): SkillReferenceFormRow[] {
  const raw = payload.referencias;
  if (!Array.isArray(raw) || raw.length === 0) return [emptySkillReferenceRow()];
  const rows: SkillReferenceFormRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const year = o.ano;
    rows.push({
      autores: typeof o.autores === "string" ? o.autores : "",
      ano: typeof year === "number" && Number.isFinite(year) ? String(year) : typeof year === "string" ? year : "",
      titulo: typeof o.titulo === "string" ? o.titulo : "",
      fonte: typeof o.fonte === "string" ? o.fonte : "",
    });
  }
  return rows.length ? rows : [emptySkillReferenceRow()];
}

function skillReferencesExtrasFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const next = { ...payload };
  delete next.referencias;
  delete next.description;
  delete next.descricao;
  return next;
}

function buildSkillReferencesForApi(rows: SkillReferenceFormRow[]): Record<string, unknown>[] {
  return rows
    .filter((r) => r.autores.trim() && r.ano.trim() && r.titulo.trim() && r.fonte.trim())
    .map((r) => ({
      autores: r.autores.trim(),
      ano: r.ano.trim(),
      titulo: r.titulo.trim(),
      fonte: r.fonte.trim(),
    }));
}

function buildPayload(
  type: SkillItemTypeApi,
  f: {
    textBody: string;
    textArticleFormat: ArticleFormat;
    textArticleHtmlUrl: string;
    textArticleExtras: Record<string, unknown>;
    youtubeUrl: string;
    youtubeDuration: string;
    youtubeDescription: string;
    youtubeProvider: VideoProvider;
    youtubeMuxExtras: Record<string, unknown>;
    audioUrl: string;
    audioDuration: string;
    mediaDescription: string;
    pdfUrl: string;
    bookTitle: string;
    bookAuthor: string;
    bookSynopsis: string;
    movieTitle: string;
    movieYear: string;
    movieDirector: string;
    refRows: SkillReferenceFormRow[];
    referencesDescription: string;
    referencesExtras: Record<string, unknown>;
  },
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const base = existing ? { ...existing } : {};
  switch (type) {
    case "text":
    case "exercise": {
      const extras = { ...skillArticleExtrasFromPayload(base), ...f.textArticleExtras };
      if (f.textArticleFormat === "html") {
        return {
          ...extras,
          articleFormat: "html",
          htmlUrl: f.textArticleHtmlUrl.trim(),
          displayMode: "iframe",
        };
      }
      return {
        ...extras,
        articleFormat: "editor",
        bodyHtml: f.textBody,
      };
    }
    case "youtube": {
      const out: Record<string, unknown> = {
        ...base,
        ...f.youtubeMuxExtras,
        provider: f.youtubeProvider,
        youtubeUrl: f.youtubeUrl.trim(),
      };
      if (f.youtubeProvider === "youtube") {
        delete out.muxUploadId;
        delete out.muxAssetId;
        delete out.muxPlaybackId;
        delete out.muxStatus;
        delete out.muxDuration;
        delete out.muxAspectRatio;
        delete out.muxThumbnailUrl;
      }
      const d = numOrUndef(f.youtubeDuration);
      if (d !== undefined) out.durationSeconds = d;
      const desc = f.youtubeDescription.trim();
      if (desc && desc !== "<p></p>") out.description = desc;
      return out;
    }
    case "audio": {
      const out: Record<string, unknown> = { ...base, audioUrl: f.audioUrl.trim() };
      const d = numOrUndef(f.audioDuration);
      if (d !== undefined) out.durationSeconds = d;
      const desc = f.mediaDescription.trim();
      if (desc) out.description = desc;
      return out;
    }
    case "pdf": {
      const out: Record<string, unknown> = { ...base, pdfUrl: f.pdfUrl.trim() };
      const desc = f.mediaDescription.trim();
      if (desc) out.description = desc;
      return out;
    }
    case "book": {
      const out: Record<string, unknown> = {
        ...base,
        bookTitle: f.bookTitle.trim(),
        author: f.bookAuthor.trim(),
      };
      const syn = f.bookSynopsis.trim();
      if (syn) out.synopsis = syn;
      return out;
    }
    case "movie": {
      const out: Record<string, unknown> = { ...base, title: f.movieTitle.trim() };
      const y = numOrUndef(f.movieYear);
      if (y !== undefined) out.year = y;
      const dir = f.movieDirector.trim();
      if (dir) out.director = dir;
      return out;
    }
    case "references": {
      const desc = f.referencesDescription.trim();
      return {
        ...f.referencesExtras,
        referencias: buildSkillReferencesForApi(f.refRows),
        ...(desc ? { description: desc } : {}),
      };
    }
    default:
      return base;
  }
}

export function SkillItemEditorPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const isNew = useMatch({ path: "/habilidades/:skillId/itens/novo", end: true }) != null;
  const { skillId, itemId } = useParams<{ skillId: string; itemId: string }>();
  const id = isNew ? undefined : itemId;

  const { data: skillMeta, isLoading: skillMetaLoading } = useQuery({
    queryKey: ["skill", skillId],
    queryFn: () => fetchSkillById(skillId!),
    enabled: Boolean(skillId),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["skill-item", id],
    queryFn: () => fetchSkillItemById(id!),
    enabled: Boolean(id),
  });

  const [type, setType] = useState<SkillItemTypeApi>("text");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [textArticleFormat, setTextArticleFormat] = useState<ArticleFormat>("editor");
  const [textArticleHtmlUrl, setTextArticleHtmlUrl] = useState("");
  const [textArticleExtras, setTextArticleExtras] = useState<Record<string, unknown>>({});
  const [textArticleEditorNonce, setTextArticleEditorNonce] = useState(0);
  const [textArticleHtmlUploading, setTextArticleHtmlUploading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeDuration, setYoutubeDuration] = useState("");
  const [youtubeDescription, setYoutubeDescription] = useState("<p></p>");
  const [youtubeDescriptionEditorNonce, setYoutubeDescriptionEditorNonce] = useState(0);
  const [youtubeProvider, setYoutubeProvider] = useState<VideoProvider>("youtube");
  const [youtubeMuxExtras, setYoutubeMuxExtras] = useState<Record<string, unknown>>({});
  const [audioUrl, setAudioUrl] = useState("");
  const [audioDuration, setAudioDuration] = useState("");
  const [mediaDescription, setMediaDescription] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookSynopsis, setBookSynopsis] = useState("");
  const [movieTitle, setMovieTitle] = useState("");
  const [movieYear, setMovieYear] = useState("");
  const [movieDirector, setMovieDirector] = useState("");
  const [refRows, setRefRows] = useState<SkillReferenceFormRow[]>([emptySkillReferenceRow()]);
  const [referencesDescription, setReferencesDescription] = useState("");
  const [referencesExtras, setReferencesExtras] = useState<Record<string, unknown>>({});
  const [mediaUploading, setMediaUploading] = useState(false);
  const articleHtmlFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isNew) return;
    setType("text");
    setTitle("");
    setSubtitle("");
    setTextBody("<p></p>");
    setTextArticleFormat("editor");
    setTextArticleHtmlUrl("");
    setTextArticleExtras({});
    setTextArticleEditorNonce((n) => n + 1);
    setYoutubeUrl("");
    setYoutubeDuration("");
    setYoutubeDescription("<p></p>");
    setYoutubeDescriptionEditorNonce((n) => n + 1);
    setYoutubeProvider("youtube");
    setYoutubeMuxExtras({});
    setAudioUrl("");
    setAudioDuration("");
    setMediaDescription("");
    setPdfUrl("");
    setBookTitle("");
    setBookAuthor("");
    setBookSynopsis("");
    setMovieTitle("");
    setMovieYear("");
    setMovieDirector("");
    setRefRows([emptySkillReferenceRow()]);
    setReferencesDescription("");
    setReferencesExtras({});
  }, [isNew, skillId]);

  useEffect(() => {
    if (!data) return;
    setType(data.type as SkillItemTypeApi);
    setTitle(data.title);
    setSubtitle(data.subtitle ?? "");
    const p = data.payload ?? {};
    setTextBody("<p></p>");
    setTextArticleFormat("editor");
    setTextArticleHtmlUrl("");
    setTextArticleExtras({});
    setTextArticleEditorNonce((n) => n + 1);
    setYoutubeUrl("");
    setYoutubeDuration("");
    setYoutubeDescription("<p></p>");
    setYoutubeDescriptionEditorNonce((n) => n + 1);
    setYoutubeProvider("youtube");
    setYoutubeMuxExtras({});
    setAudioUrl("");
    setAudioDuration("");
    setMediaDescription("");
    setPdfUrl("");
    setBookTitle("");
    setBookAuthor("");
    setBookSynopsis("");
    setMovieTitle("");
    setMovieYear("");
    setMovieDirector("");
    setRefRows([emptySkillReferenceRow()]);
    setReferencesDescription("");
    setReferencesExtras({});

    switch (data.type) {
      case "text":
      case "exercise":
        setTextArticleFormat(articleFormatFromPayload(p));
        setTextBody(extractArticleEditorHtml(p));
        setTextArticleHtmlUrl(articleHtmlUrlFromPayload(p));
        setTextArticleExtras(skillArticleExtrasFromPayload(p));
        setTextArticleEditorNonce((n) => n + 1);
        break;
      case "youtube":
        setYoutubeUrl(typeof p.youtubeUrl === "string" ? p.youtubeUrl : "");
        setYoutubeDuration(typeof p.durationSeconds === "number" ? String(p.durationSeconds) : "");
        setYoutubeDescription(typeof p.description === "string" && p.description.trim() ? p.description : "<p></p>");
        setYoutubeDescriptionEditorNonce((n) => n + 1);
        setYoutubeProvider(p.provider === "mux" ? "mux" : "youtube");
        setYoutubeMuxExtras({
          ...(typeof p.muxUploadId === "string" ? { muxUploadId: p.muxUploadId } : {}),
          ...(typeof p.muxAssetId === "string" ? { muxAssetId: p.muxAssetId } : {}),
          ...(typeof p.muxPlaybackId === "string" ? { muxPlaybackId: p.muxPlaybackId } : {}),
          ...(typeof p.muxStatus === "string" ? { muxStatus: p.muxStatus } : {}),
          ...(typeof p.muxDuration === "number" ? { muxDuration: p.muxDuration } : {}),
          ...(typeof p.muxAspectRatio === "string" ? { muxAspectRatio: p.muxAspectRatio } : {}),
          ...(typeof p.muxThumbnailUrl === "string" ? { muxThumbnailUrl: p.muxThumbnailUrl } : {}),
        });
        break;
      case "audio":
        setAudioUrl(typeof p.audioUrl === "string" ? p.audioUrl : "");
        setAudioDuration(typeof p.durationSeconds === "number" ? String(p.durationSeconds) : "");
        setMediaDescription(typeof p.description === "string" ? p.description : "");
        break;
      case "pdf":
        setPdfUrl(typeof p.pdfUrl === "string" ? p.pdfUrl : "");
        setMediaDescription(typeof p.description === "string" ? p.description : "");
        break;
      case "book":
        setBookTitle(typeof p.bookTitle === "string" ? p.bookTitle : "");
        setBookAuthor(typeof p.author === "string" ? p.author : "");
        setBookSynopsis(typeof p.synopsis === "string" ? p.synopsis : "");
        break;
      case "movie":
        setMovieTitle(typeof p.title === "string" ? p.title : "");
        setMovieYear(typeof p.year === "number" ? String(p.year) : "");
        setMovieDirector(typeof p.director === "string" ? p.director : "");
        break;
      case "references":
        setRefRows(skillReferencesFromPayload(p));
        setReferencesDescription(mediaDescriptionFromPayload(p));
        setReferencesExtras(skillReferencesExtrasFromPayload(p));
        break;
      default:
        break;
    }
  }, [data]);

  const fields = useMemo(
    () => ({
      textBody,
      textArticleFormat,
      textArticleHtmlUrl,
      textArticleExtras,
      youtubeUrl,
      youtubeDuration,
      youtubeDescription,
      youtubeProvider,
      youtubeMuxExtras,
      audioUrl,
      audioDuration,
      mediaDescription,
      pdfUrl,
      bookTitle,
      bookAuthor,
      bookSynopsis,
      movieTitle,
      movieYear,
      movieDirector,
      refRows,
      referencesDescription,
      referencesExtras,
    }),
    [
      textBody,
      textArticleFormat,
      textArticleHtmlUrl,
      textArticleExtras,
      youtubeUrl,
      youtubeDuration,
      youtubeDescription,
      youtubeProvider,
      youtubeMuxExtras,
      audioUrl,
      audioDuration,
      mediaDescription,
      pdfUrl,
      bookTitle,
      bookAuthor,
      bookSynopsis,
      movieTitle,
      movieYear,
      movieDirector,
      refRows,
      referencesDescription,
      referencesExtras,
    ],
  );

  async function onSkillMediaFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || (type !== "youtube" && type !== "audio" && type !== "pdf")) return;
    setMediaUploading(true);
    try {
      if (type === "youtube") {
        if (youtubeProvider !== "mux") return;
        setYoutubeUrl("");
        setYoutubeMuxExtras({ provider: "mux", muxStatus: "creating_upload" });
        const { uploadId, uploadUrl } = await createMuxDirectUpload();
        setYoutubeMuxExtras({ provider: "mux", muxUploadId: uploadId, muxStatus: "uploading" });
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
        if (!uploadResponse.ok) {
          throw new Error(`Upload para o Mux falhou (${uploadResponse.status}).`);
        }
        toast("Vídeo enviado ao Mux. Aguardando processamento…");
        setYoutubeMuxExtras({ provider: "mux", muxUploadId: uploadId, muxStatus: "processing" });

        for (let attempt = 0; attempt < MUX_MAX_POLL_ATTEMPTS; attempt++) {
          const status = await fetchMuxUploadStatus(uploadId);
          setYoutubeMuxExtras((prev) => ({
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
            setYoutubeUrl(status.videoUrl);
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

      const { url } = await uploadEditorialMediaAsset(file, { context: "skills", kind: type });
      if (type === "audio") setAudioUrl(url);
      else setPdfUrl(url);
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
    if (!file || !isRichTextSkillItemType(type) || textArticleFormat !== "html") return;
    setTextArticleHtmlUploading(true);
    try {
      const { url } = await uploadEditorialMediaAsset(file, { context: "skills", kind: "html" });
      setTextArticleHtmlUrl(url);
      toast("Ficheiro HTML enviado. O endereço foi preenchido automaticamente.");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Falha ao enviar o ficheiro HTML.");
    } finally {
      setTextArticleHtmlUploading(false);
    }
  }

  function updateRefRow(index: number, patch: Partial<SkillReferenceFormRow>) {
    setRefRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Informe o título.");
      if (isRichTextSkillItemType(type) && textArticleFormat === "editor" && !textBody.trim()) {
        throw new Error(type === "exercise" ? "Informe o corpo do exercício." : "Informe o corpo do artigo.");
      }
      if (isRichTextSkillItemType(type) && textArticleFormat === "html" && !textArticleHtmlUrl.trim()) {
        throw new Error("Informe uma URL externa ou envie um ficheiro HTML.");
      }
      if (type === "youtube" && !youtubeUrl.trim()) {
        throw new Error(youtubeProvider === "mux" ? "Envie um ficheiro de vídeo e aguarde o processamento do Mux." : "Informe a URL do YouTube.");
      }
      if (type === "audio" && !fields.audioUrl.trim()) {
        throw new Error("Informe a URL do áudio ou envie um ficheiro.");
      }
      if (type === "pdf" && !fields.pdfUrl.trim()) {
        throw new Error("Informe a URL do PDF ou envie um ficheiro.");
      }
      if (type === "book" && (!bookTitle.trim() || !bookAuthor.trim())) {
        throw new Error("Informe título e autor do livro.");
      }
      if (type === "movie" && !movieTitle.trim()) {
        throw new Error("Informe o título do filme.");
      }
      if (isReferencesSkillItemType(type) && buildSkillReferencesForApi(refRows).length === 0) {
        throw new Error("Informe ao menos uma referência com autor(es), ano, título e revista/editora/complemento.");
      }
      const existing = data?.payload as Record<string, unknown> | undefined;
      const payload = buildPayload(type, fields, existing);
      if (id) {
        await updateSkillItem(id, { title: title.trim(), subtitle: subtitle.trim() || null, payload });
      } else {
        await createSkillItem(skillId!, { type, title: title.trim(), subtitle: subtitle.trim() || null, payload });
      }
    },
    onSuccess: () => {
      toast(id ? "Item atualizado." : "Item criado.");
      void qc.invalidateQueries({ queryKey: ["skill", skillId] });
      void qc.invalidateQueries({ queryKey: ["skill-item"] });
      navigate(`/habilidades/${skillId}/itens`);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao salvar."),
  });

  const breadcrumbs = useMemo(() => {
    if (!skillId) return [];
    const skillLabel = skillMeta?.title ?? (skillMetaLoading ? "…" : "Habilidade");
    const itemsPath = `/habilidades/${skillId}/itens`;
    const leaf = isNew
      ? "Novo item"
      : title.trim() || data?.title || (isLoading ? "…" : "Item");
    return [
      { label: "Habilidades", to: "/habilidades" as const },
      { label: skillLabel, to: `/habilidades/${skillId}` as const },
      { label: "Itens", to: itemsPath },
      { label: leaf },
    ];
  }, [skillId, skillMeta?.title, skillMetaLoading, isNew, title, data?.title, isLoading]);

  if (!skillId || (!isNew && !itemId)) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Catálogo</Eyebrow>
        <WaveHierarchyBreadcrumb items={breadcrumbs} />
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">{isNew ? "Novo item" : "Editar item"}</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
          {skillMeta ? (
            <>
              Habilidade: <span className="font-medium text-bloom-aubergine">{skillMeta.title}</span>
            </>
          ) : (
            "Carregando contexto…"
          )}
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
                value={type}
                onChange={(e) => setType(e.target.value as SkillItemTypeApi)}
                disabled={!isNew}
              >
                {SKILL_ITEM_TYPE_OPTIONS.map((o) => (
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
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Subtítulo</Label>
              <input
                className={inputCls}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Linha exibida abaixo do título no app"
              />
            </div>

            {isRichTextSkillItemType(type) && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Formato</Label>
                  <select
                    className={inputCls}
                    value={textArticleFormat}
                    onChange={(e) => setTextArticleFormat(e.target.value as ArticleFormat)}
                  >
                    <option value="editor">Editor</option>
                    <option value="html">HTML</option>
                  </select>
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    <strong className="font-medium text-bloom-aubergine/75">Editor</strong> mantém o artigo editável aqui.{" "}
                    <strong className="font-medium text-bloom-aubergine/75">HTML</strong> usa um ficheiro ou URL externa embutida no app.
                  </p>
                </div>
                {textArticleFormat === "editor" ? (
                  <div className="space-y-2">
                    <Label className="font-ui text-bloom-aubergine/80">
                      {type === "exercise" ? "Corpo do exercício" : "Corpo do artigo"}
                    </Label>
                    <p className="font-ui text-xs text-bloom-aubergine/55">
                      Gravado como <code className="text-[11px]">bodyHtml</code>. Edição visual e código-fonte estão no editor.
                    </p>
                    <WaveArticleTinyMceEditor
                      editorKey={`skill-article-${id ?? "new"}-${textArticleEditorNonce}`}
                      value={textBody}
                      onChange={setTextBody}
                      disabled={save.isPending}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-ui text-bloom-aubergine/80">HTML URL</Label>
                      <input
                        className={inputCls}
                        value={textArticleHtmlUrl}
                        onChange={(e) => setTextArticleHtmlUrl(e.target.value)}
                        placeholder="https://… (URL externa) ou use o envio abaixo"
                        disabled={textArticleHtmlUploading}
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
                          disabled={save.isPending || textArticleHtmlUploading}
                          onClick={() => articleHtmlFileInputRef.current?.click()}
                        >
                          {textArticleHtmlUploading ? "A enviar…" : "Enviar ficheiro HTML"}
                        </Button>
                        <p className="font-ui text-xs text-bloom-aubergine/55">
                          Após o envio, o campo acima é preenchido com o endereço público do ficheiro.
                        </p>
                      </div>
                    </div>
                    <p className="font-ui text-xs text-bloom-aubergine/55">
                      Gravado como <code className="text-[11px]">articleFormat=html</code>,{" "}
                      <code className="text-[11px]">htmlUrl</code> e exibido embutido no app.
                    </p>
                  </div>
                )}
              </div>
            )}

            {type === "youtube" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Origem do vídeo</Label>
                  <select
                    className={inputCls}
                    value={youtubeProvider}
                    onChange={(e) => {
                      const next = e.target.value as VideoProvider;
                      setYoutubeProvider(next);
                      setYoutubeUrl("");
                      setYoutubeMuxExtras({});
                    }}
                    disabled={mediaUploading}
                  >
                    <option value="youtube">YouTube</option>
                    <option value="mux">Mux</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">{youtubeProvider === "mux" ? "Mux Player URL" : "URL do YouTube"}</Label>
                  <input
                    className={inputCls}
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder={youtubeProvider === "mux" ? "Preenchido automaticamente após o processamento do Mux" : "https://www.youtube.com/watch?v=…"}
                    disabled={mediaUploading || youtubeProvider === "mux"}
                  />
                  {youtubeProvider === "mux" && (
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <input
                        ref={mediaFileInputRef}
                        type="file"
                        className="sr-only"
                        accept="video/*,.mp4,.mov,.m4v,.webm,.mkv"
                        aria-hidden
                        tabIndex={-1}
                        onChange={onSkillMediaFileSelected}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        disabled={save.isPending || mediaUploading}
                        onClick={() => mediaFileInputRef.current?.click()}
                      >
                        {mediaUploading ? "A enviar/processar…" : "Selecionar vídeo local"}
                      </Button>
                      <p className="font-ui text-xs text-bloom-aubergine/55">
                        O ficheiro é enviado diretamente ao Mux. Quando o processamento terminar, o campo acima recebe a URL do player.
                      </p>
                    </div>
                  )}
                  {youtubeProvider === "mux" && typeof youtubeMuxExtras.muxStatus === "string" && (
                    <p className="font-ui text-xs text-bloom-aubergine/55">
                      Status Mux: <code className="text-[11px]">{youtubeMuxExtras.muxStatus}</code>
                      {typeof youtubeMuxExtras.muxPlaybackId === "string" ? (
                        <>
                          {" "}· playbackId: <code className="text-[11px]">{youtubeMuxExtras.muxPlaybackId}</code>
                        </>
                      ) : null}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Duração (segundos, opcional)</Label>
                  <input className={inputCls} value={youtubeDuration} onChange={(e) => setYoutubeDuration(e.target.value)} inputMode="numeric" />
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Descrição</Label>
                  <WaveArticleTinyMceEditor
                    editorKey={`skill-video-description-${id ?? "new"}-${youtubeDescriptionEditorNonce}`}
                    value={youtubeDescription}
                    onChange={setYoutubeDescription}
                    disabled={save.isPending || mediaUploading}
                  />
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    Esta descrição aparece abaixo do player de vídeo no app.
                  </p>
                </div>
              </div>
            )}

            {type === "audio" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Descrição</Label>
                  <textarea
                    className={`${inputCls} min-h-[88px] resize-y`}
                    value={mediaDescription}
                    onChange={(e) => setMediaDescription(e.target.value)}
                    placeholder="Ex.: Áudio breve para uma pausa intencional."
                    rows={3}
                  />
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    Salvo como <code className="text-[11px]">description</code> no payload (texto de apoio no app).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">URL do áudio</Label>
                  <input
                    className={inputCls}
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="https://… (URL externa) ou use o envio abaixo"
                    disabled={mediaUploading}
                  />
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <input
                      ref={mediaFileInputRef}
                      type="file"
                      className="sr-only"
                      accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg"
                      aria-hidden
                      tabIndex={-1}
                      onChange={onSkillMediaFileSelected}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      disabled={save.isPending || mediaUploading}
                      onClick={() => mediaFileInputRef.current?.click()}
                    >
                      {mediaUploading ? "A enviar…" : "Enviar ficheiro"}
                    </Button>
                    <p className="font-ui text-xs text-bloom-aubergine/55">
                      Após o envio, o campo acima é preenchido com o endereço público (<code className="text-[11px]">audioUrl</code>), igual ao conteúdo de onda.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Duração (segundos, opcional)</Label>
                  <input className={inputCls} value={audioDuration} onChange={(e) => setAudioDuration(e.target.value)} inputMode="numeric" />
                </div>
              </div>
            )}

            {type === "pdf" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Descrição</Label>
                  <textarea
                    className={`${inputCls} min-h-[88px] resize-y`}
                    value={mediaDescription}
                    onChange={(e) => setMediaDescription(e.target.value)}
                    placeholder="Ex.: Guia ou formulário em PDF."
                    rows={3}
                  />
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    Salvo como <code className="text-[11px]">description</code> no payload.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">URL do PDF</Label>
                  <input
                    className={inputCls}
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    placeholder="https://… (URL externa) ou use o envio abaixo"
                    disabled={mediaUploading}
                  />
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <input
                      ref={mediaFileInputRef}
                      type="file"
                      className="sr-only"
                      accept="application/pdf,.pdf"
                      aria-hidden
                      tabIndex={-1}
                      onChange={onSkillMediaFileSelected}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      disabled={save.isPending || mediaUploading}
                      onClick={() => mediaFileInputRef.current?.click()}
                    >
                      {mediaUploading ? "A enviar…" : "Enviar ficheiro"}
                    </Button>
                    <p className="font-ui text-xs text-bloom-aubergine/55">
                      Após o envio, o campo acima é preenchido com o endereço público (<code className="text-[11px]">pdfUrl</code>).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {type === "references" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Descrição</Label>
                  <textarea
                    className={`${inputCls} min-h-[88px] resize-y`}
                    value={referencesDescription}
                    onChange={(e) => setReferencesDescription(e.target.value)}
                    placeholder="Introdução opcional exibida junto às referências."
                    rows={3}
                  />
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    Salvo como <code className="text-[11px]">description</code> no payload.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Referências</Label>
                  <p className="font-ui text-xs text-bloom-aubergine/55">
                    Cada referência precisa de autor(es), ano, título e revista/editora/complemento.
                  </p>
                </div>

                <div className="space-y-4">
                  {refRows.map((row, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-bloom-aubergine/10 bg-bloom-cream-deep/25 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-ui text-xs uppercase tracking-[0.16em] text-bloom-aubergine/55">
                          Referência {i + 1}
                        </p>
                        {refRows.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 rounded-full px-3 text-xs text-bloom-aubergine/60 hover:text-bloom-garnet"
                            onClick={() => setRefRows((rows) => rows.filter((_, j) => j !== i))}
                          >
                            Remover
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs text-bloom-aubergine/70">Autor(es)</Label>
                          <input
                            className={inputCls}
                            value={row.autores}
                            onChange={(e) => updateRefRow(i, { autores: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-bloom-aubergine/70">Ano</Label>
                          <input
                            className={inputCls}
                            value={row.ano}
                            onChange={(e) => updateRefRow(i, { ano: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs text-bloom-aubergine/70">Título</Label>
                          <input
                            className={inputCls}
                            value={row.titulo}
                            onChange={(e) => updateRefRow(i, { titulo: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs text-bloom-aubergine/70">Revista/Editora/Complemento</Label>
                          <input
                            className={inputCls}
                            value={row.fonte}
                            onChange={(e) => updateRefRow(i, { fonte: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setRefRows((rows) => [...rows, emptySkillReferenceRow()])}
                >
                  Adicionar referência
                </Button>
              </div>
            )}

            {type === "book" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Título do livro</Label>
                  <input className={inputCls} value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Autor</Label>
                  <input className={inputCls} value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Sinopse (opcional)</Label>
                  <textarea className={`${inputCls} min-h-[88px]`} value={bookSynopsis} onChange={(e) => setBookSynopsis(e.target.value)} />
                </div>
              </div>
            )}

            {type === "movie" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Título do filme</Label>
                  <input className={inputCls} value={movieTitle} onChange={(e) => setMovieTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Ano (opcional)</Label>
                  <input className={inputCls} value={movieYear} onChange={(e) => setMovieYear(e.target.value)} inputMode="numeric" />
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Diretor (opcional)</Label>
                  <input className={inputCls} value={movieDirector} onChange={(e) => setMovieDirector(e.target.value)} />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <PillButton type="submit" disabled={save.isPending || mediaUploading || textArticleHtmlUploading}>
                {save.isPending ? "Salvando…" : mediaUploading || textArticleHtmlUploading ? "Processando…" : "Salvar"}
              </PillButton>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate(`/habilidades/${skillId}/itens`)}>
                Cancelar
              </Button>
            </div>
          </form>
        </FadeIn>
      )}
    </div>
  );
}
