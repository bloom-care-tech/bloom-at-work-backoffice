import { useEffect, useMemo, useRef, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import {
  createSkillItem,
  fetchSkillById,
  fetchSkillItemById,
  updateSkillItem,
  uploadEditorialMediaAsset,
} from "@/lib/admin-api";
import { SKILL_ITEM_TYPE_OPTIONS, type SkillItemTypeApi } from "@/lib/skill-item-labels";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

function numOrUndef(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function buildPayload(
  type: SkillItemTypeApi,
  f: {
    textBody: string;
    youtubeUrl: string;
    youtubeDuration: string;
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
  },
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const base = existing ? { ...existing } : {};
  switch (type) {
    case "text":
      return { ...base, body: f.textBody.trim() };
    case "youtube": {
      const out: Record<string, unknown> = { ...base, youtubeUrl: f.youtubeUrl.trim() };
      const d = numOrUndef(f.youtubeDuration);
      if (d !== undefined) out.durationSeconds = d;
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

  const { data: skillMeta } = useQuery({
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
  const [textBody, setTextBody] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeDuration, setYoutubeDuration] = useState("");
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
  const [mediaUploading, setMediaUploading] = useState(false);

  useEffect(() => {
    if (!isNew) return;
    setType("text");
    setTitle("");
    setTextBody("");
    setYoutubeUrl("");
    setYoutubeDuration("");
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
  }, [isNew, skillId]);

  useEffect(() => {
    if (!data) return;
    setType(data.type as SkillItemTypeApi);
    setTitle(data.title);
    const p = data.payload ?? {};
    setTextBody("");
    setYoutubeUrl("");
    setYoutubeDuration("");
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

    switch (data.type) {
      case "text":
        setTextBody(typeof p.body === "string" ? p.body : "");
        break;
      case "youtube":
        setYoutubeUrl(typeof p.youtubeUrl === "string" ? p.youtubeUrl : "");
        setYoutubeDuration(typeof p.durationSeconds === "number" ? String(p.durationSeconds) : "");
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
      default:
        break;
    }
  }, [data]);

  const fields = useMemo(
    () => ({
      textBody,
      youtubeUrl,
      youtubeDuration,
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
    }),
    [
      textBody,
      youtubeUrl,
      youtubeDuration,
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
    ],
  );

  async function onSkillMediaFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || (type !== "audio" && type !== "pdf")) return;
    setMediaUploading(true);
    try {
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

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Informe o título.");
      if (type === "text" && !textBody.trim()) {
        throw new Error("Informe o corpo do texto.");
      }
      if (type === "youtube" && !youtubeUrl.trim()) {
        throw new Error("Informe a URL do YouTube.");
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
      const existing = data?.payload as Record<string, unknown> | undefined;
      const payload = buildPayload(type, fields, existing);
      if (id) {
        await updateSkillItem(id, { title: title.trim(), payload });
      } else {
        await createSkillItem(skillId!, { type, title: title.trim(), payload });
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

  if (!skillId || (!isNew && !itemId)) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Catálogo</Eyebrow>
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

            {type === "text" && (
              <div className="space-y-2">
                <Label className="font-ui text-bloom-aubergine/80">Corpo (texto)</Label>
                <textarea className={`${inputCls} min-h-[160px]`} value={textBody} onChange={(e) => setTextBody(e.target.value)} />
              </div>
            )}

            {type === "youtube" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">URL do YouTube</Label>
                  <input className={inputCls} value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="font-ui text-bloom-aubergine/80">Duração (segundos, opcional)</Label>
                  <input className={inputCls} value={youtubeDuration} onChange={(e) => setYoutubeDuration(e.target.value)} inputMode="numeric" />
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
              <PillButton type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : "Salvar"}
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
