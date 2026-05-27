import DOMPurify from "dompurify";
import {
  BookOpen,
  FilePdf,
  Flask,
  Headphones,
  Lightning,
  Quotes,
  Toolbox,
  User,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AudioPlayer } from "@/components/trilha/AudioPlayer";
import { useHostedMediaUrl } from "@/hooks/use-hosted-media-url";
import { WAVE_ARTICLE_BODY_PROSE_CLASS } from "@/lib/wave-article-body-class";
import { waveContentKindLabel, type WaveContentKindApi } from "@/lib/wave-content-kinds";

function PreviewAudioPlayer({ titulo, rawSrc }: { titulo: string; rawSrc?: string }) {
  const { src, loading, error } = useHostedMediaUrl(rawSrc);
  if (loading) {
    return <p className="font-ui text-sm text-bloom-aubergine/55 italic">A preparar áudio…</p>;
  }
  if (error) {
    return <p className="font-ui text-sm text-bloom-aubergine/55">Áudio indisponível.</p>;
  }
  return <AudioPlayer titulo={titulo} src={src} />;
}

function PreviewPdfLink({ rawHref }: { rawHref: string }) {
  const { src, loading, error } = useHostedMediaUrl(rawHref);
  if (loading) {
    return <p className="font-ui text-sm text-bloom-aubergine/55 italic">A preparar PDF…</p>;
  }
  if (error || !src) {
    return <p className="font-ui text-sm text-bloom-aubergine/55">PDF indisponível.</p>;
  }
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 font-ui text-sm bg-bloom-aubergine text-bloom-cream px-4 py-2.5 rounded-full hover:bg-bloom-garnet transition-colors"
    >
      Abrir PDF
    </a>
  );
}

function PreviewArticleHtmlEmbed({ title, rawSrc, displayMode }: { title: string; rawSrc: string; displayMode: unknown }) {
  const { src, loading, error } = useHostedMediaUrl(rawSrc);
  const openInNewTab = displayMode === "new_tab";
  if (loading) {
    return <p className="font-ui text-sm text-bloom-aubergine/55 italic">A preparar HTML…</p>;
  }
  if (error || !src) {
    return <p className="font-ui text-sm text-bloom-aubergine/55">HTML indisponível.</p>;
  }
  if (openInNewTab) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 font-ui text-sm bg-bloom-aubergine text-bloom-cream px-4 py-2.5 rounded-full hover:bg-bloom-garnet transition-colors"
      >
        Abrir HTML
      </a>
    );
  }
  return (
    <div className="aspect-[4/5] md:aspect-[16/10] w-full overflow-hidden rounded-lg bg-bloom-aubergine/5 border border-bloom-aubergine/10">
      <iframe
        src={src}
        title={title}
        className="w-full h-full min-h-[420px] border-0"
        sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts"
      />
    </div>
  );
}

const PURIFY_OPTS: DOMPurify.Config = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ["target", "rel", "data-type", "data-checked", "colspan", "rowspan", "colwidth", "class"],
};

function payloadDescription(p: Record<string, unknown>): string {
  if (typeof p.description === "string") return p.description;
  if (typeof p.descricao === "string") return p.descricao;
  return "";
}

function htmlHasVisibleText(html: string): boolean {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, "").trim().length > 0;
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Boolean(doc.body.textContent?.trim());
}

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function kindMetaIcon(kind: WaveContentKindApi) {
  switch (kind) {
    case "video":
      return YoutubeLogo;
    case "audio":
      return Headphones;
    case "pdf":
      return FilePdf;
    case "toolkit":
      return Toolbox;
    case "scientificReferences":
      return Flask;
    case "exercise":
      return Lightning;
    default:
      return BookOpen;
  }
}

/** Mirrors `Trilha` content dialog: description in header only for plain media payloads (no article body, lists, etc.). */
function hasTrilhaStyleDialogDescription(payload: Record<string, unknown>): boolean {
  const desc = payloadDescription(payload).trim();
  if (!desc) return false;

  const bodyHtml = typeof payload.bodyHtml === "string" ? payload.bodyHtml.trim() : "";
  if (bodyHtml) return false;

  if (Array.isArray(payload.secoesArtigo) && payload.secoesArtigo.length > 0) return false;
  if (Array.isArray(payload.checklistSecoes) && payload.checklistSecoes.length > 0) return false;
  if (Array.isArray(payload.perguntas) && payload.perguntas.length > 0) return false;
  if (Array.isArray(payload.referencias) && payload.referencias.length > 0) return false;

  return true;
}

function shouldShowDialogDescription(kind: WaveContentKindApi, payload: Record<string, unknown> | null): boolean {
  if (!payload) return false;
  const desc = payloadDescription(payload).trim();
  if (!desc) return false;
  if (kind === "scientificReferences") return true;
  if (kind === "audio") {
    return hasTrilhaStyleDialogDescription(payload);
  }
  if (kind === "video" || kind === "pdf") {
    return false;
  }
  if (kind === "article" || kind === "toolkit") {
    if (typeof payload.htmlUrl === "string" && payload.htmlUrl.trim()) return false;
    const html = typeof payload.bodyHtml === "string" ? payload.bodyHtml : "";
    return !htmlHasVisibleText(html);
  }
  if (kind === "exercise") {
    return false;
  }
  return true;
}

export type ArticleExpertPreviewOption = {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  photoUrl: string | null;
};

type WaveContentPreviewBaseProps = {
  kind: WaveContentKindApi;
  title: string;
  payload: Record<string, unknown> | null;
  error: string | null;
  isNew: boolean;
  published: boolean;
  /** Active specialists for resolving `payload.expertId` in article preview. */
  articleExperts?: ArticleExpertPreviewOption[];
};

export type WaveContentPreviewProps = WaveContentPreviewBaseProps;

export type WaveContentPreviewDialogProps = WaveContentPreviewBaseProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function resolveArticleExpert(
  payload: Record<string, unknown>,
  articleExperts: ArticleExpertPreviewOption[] | undefined,
): ArticleExpertPreviewOption | undefined {
  const eid = typeof payload.expertId === "string" ? payload.expertId.trim() : "";
  return eid ? articleExperts?.find((x) => x.id === eid) : undefined;
}

/** Quote footer: payload `author`, else specialist as "Nome, Especialidade". */
function quoteAttributionFromPayload(
  payload: Record<string, unknown>,
  articleExperts: ArticleExpertPreviewOption[] | undefined,
): string {
  const explicit = typeof payload.author === "string" ? payload.author.trim() : "";
  if (explicit) return explicit;
  const expert = resolveArticleExpert(payload, articleExperts);
  if (!expert?.name?.trim()) return "";
  return expert.specialty?.trim()
    ? `${expert.name.trim()}, ${expert.specialty.trim()}`
    : expert.name.trim();
}

function PreviewBody({
  kind,
  title,
  payload,
  error,
  articleExperts,
}: Pick<WaveContentPreviewProps, "kind" | "title" | "payload" | "error" | "articleExperts">) {
  return (
    <>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 font-ui text-sm text-red-800 mb-4">{error}</div>
      )}

      {!payload && !error && <p className="font-ui text-sm text-bloom-aubergine/55">Nada a pré-visualizar.</p>}

      {payload && (kind === "article" || kind === "toolkit") && (
        <div className="space-y-3">
          {typeof payload.htmlUrl === "string" && payload.htmlUrl.trim() ? (
            <>
              {payloadDescription(payload).trim() && (
                <p className="font-ui text-sm text-bloom-aubergine/75 leading-relaxed">{payloadDescription(payload)}</p>
              )}
              <PreviewArticleHtmlEmbed title={title} rawSrc={payload.htmlUrl.trim()} displayMode={payload.displayMode} />
            </>
          ) : (
            <>
          {payloadDescription(payload).trim() && htmlHasVisibleText(typeof payload.bodyHtml === "string" ? payload.bodyHtml : "") && (
            <p className="font-ui text-sm text-bloom-aubergine/75 leading-relaxed">{payloadDescription(payload)}</p>
          )}
          {kind === "article" && (() => {
            const expert = resolveArticleExpert(payload, articleExperts);
            if (!expert) return null;
            const foto = expert.photoUrl?.trim();
            return (
              <div className="flex gap-4 items-start rounded-2xl border border-bloom-aubergine/15 bg-bloom-cream-deep/40 p-4">
                {foto ? (
                  <img src={foto} alt="" className="w-16 h-16 rounded-full object-cover shrink-0" />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full bg-bloom-aubergine/8 shrink-0 flex items-center justify-center text-bloom-aubergine/35"
                    aria-hidden
                  >
                    <User size={28} weight="duotone" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-serif-display text-base text-bloom-aubergine leading-tight">{expert.name}</p>
                  <p className="font-ui text-[10px] uppercase tracking-[0.18em] text-bloom-garnet mt-0.5">{expert.specialty}</p>
                  {expert.bio?.trim() ? (
                    <p className="font-ui text-[13px] text-bloom-aubergine/75 leading-relaxed mt-2">{expert.bio.trim()}</p>
                  ) : null}
                </div>
              </div>
            );
          })()}
          {typeof payload.bodyHtml === "string" && htmlHasVisibleText(payload.bodyHtml) ? (
            <div
              className={WAVE_ARTICLE_BODY_PROSE_CLASS}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(payload.bodyHtml, PURIFY_OPTS) }}
            />
          ) : (
            <p className="font-ui text-sm text-bloom-aubergine/50 italic">Corpo vazio ou sem texto visível no HTML.</p>
          )}
          {kind === "article" && typeof payload.quote === "string" && payload.quote.trim()
            ? (() => {
                const attribution = quoteAttributionFromPayload(payload, articleExperts);
                return (
                  <blockquote className="relative mt-4 rounded-2xl bg-bloom-aubergine text-bloom-cream px-6 py-5">
                    <Quotes size={22} weight="fill" className="text-bloom-cream/50 mb-2" />
                    <p className="font-serif-display italic text-lg leading-snug">{payload.quote.trim()}</p>
                    {attribution ? (
                      <footer className="mt-3 text-xs uppercase tracking-[0.18em] text-bloom-cream/60 font-ui">
                        — {attribution}
                      </footer>
                    ) : null}
                  </blockquote>
                );
              })()
            : null}
            </>
          )}
        </div>
      )}

      {payload && kind === "video" && (
        <div className="space-y-4">
          {payloadDescription(payload).trim() && (
            <p className="font-ui text-sm text-bloom-aubergine/75 leading-relaxed">{payloadDescription(payload)}</p>
          )}
          {typeof payload.videoUrl === "string" && payload.videoUrl.trim() ? (
            isHttpUrl(payload.videoUrl.trim()) ? (
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-bloom-aubergine/90">
                <iframe
                  src={payload.videoUrl.trim()}
                  title={title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <p className="font-ui text-xs text-bloom-aubergine/60 break-all">URL (não embed HTTP): {payload.videoUrl}</p>
            )
          ) : (
            <p className="font-ui text-sm text-bloom-aubergine/50 italic">Sem videoUrl.</p>
          )}
        </div>
      )}

      {payload && kind === "audio" && (
        <div className="space-y-3">
          {payloadDescription(payload).trim() && (
            <p className="font-ui text-sm text-bloom-aubergine/75 leading-relaxed">{payloadDescription(payload)}</p>
          )}
          <PreviewAudioPlayer
            titulo={title.trim() || "(sem título)"}
            rawSrc={
              typeof payload.audioUrl === "string" && payload.audioUrl.trim()
                ? payload.audioUrl.trim()
                : undefined
            }
          />
        </div>
      )}

      {payload && kind === "pdf" && (
        <div className="space-y-3">
          {payloadDescription(payload).trim() && (
            <p className="font-ui text-sm text-bloom-aubergine/75 leading-relaxed">{payloadDescription(payload)}</p>
          )}
          {typeof payload.pdfUrl === "string" && payload.pdfUrl.trim() ? (
            <PreviewPdfLink rawHref={payload.pdfUrl.trim()} />
          ) : (
            <p className="font-ui text-sm text-bloom-aubergine/50 italic">Sem pdfUrl.</p>
          )}
        </div>
      )}

      {payload && kind === "scientificReferences" && (
        <div className="space-y-4">
          {Array.isArray(payload.referencias) && payload.referencias.length > 0 ? (
            <ul className="space-y-3 list-none p-0 m-0">
              {payload.referencias.map((item, i) => {
                if (!item || typeof item !== "object" || Array.isArray(item)) return null;
                const o = item as Record<string, unknown>;
                const titulo = typeof o.titulo === "string" ? o.titulo : "";
                const autores = typeof o.autores === "string" ? o.autores : "";
                const fonte = typeof o.fonte === "string" ? o.fonte : "";
                const doi = typeof o.doi === "string" ? o.doi : "";
                const n = o.numero;
                const numLabel =
                  typeof n === "number" && Number.isFinite(n) ? String(n) : typeof n === "string" && n.trim() ? n : String(i + 1);
                return (
                  <li key={i} className="rounded-xl border border-bloom-aubergine/10 bg-white/70 p-4">
                    <p className="font-serif-display text-base text-bloom-aubergine">
                      <span className="text-bloom-garnet mr-2">{numLabel}.</span>
                      {titulo || "(sem título)"}
                    </p>
                    <p className="font-ui text-xs text-bloom-aubergine/70 mt-1">{autores}</p>
                    <p className="font-ui text-xs text-bloom-aubergine/60 mt-0.5">{fonte}</p>
                    {doi && (
                      <p className="font-ui text-[11px] text-bloom-garnet mt-2 break-all">
                        DOI:{" "}
                        {doi.startsWith("http") ? (
                          <a href={doi} className="underline" target="_blank" rel="noopener noreferrer">
                            {doi}
                          </a>
                        ) : (
                          doi
                        )}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="font-ui text-sm text-bloom-aubergine/50 italic">Sem referências válidas no payload.</p>
          )}
        </div>
      )}

      {payload && kind === "exercise" && (
        <div className="space-y-3">
          {payloadDescription(payload).trim() && (
            <p className="font-ui text-sm text-bloom-aubergine/75 leading-relaxed">{payloadDescription(payload)}</p>
          )}
          {typeof payload.externalFormUrl === "string" && payload.externalFormUrl.trim() ? (
            isHttpUrl(payload.externalFormUrl.trim()) ? (
              payload.displayMode === "new_tab" ? (
                <a
                  href={payload.externalFormUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-ui text-sm bg-bloom-aubergine text-bloom-cream px-4 py-2.5 rounded-full hover:bg-bloom-garnet transition-colors"
                >
                  Abrir formulário
                </a>
              ) : (
                <div className="aspect-[4/5] md:aspect-[16/10] w-full overflow-hidden rounded-lg bg-bloom-aubergine/5 border border-bloom-aubergine/10">
                  <iframe
                    src={payload.externalFormUrl.trim()}
                    title={title}
                    className="w-full h-full min-h-[320px] border-0"
                    allow="camera; microphone; autoplay; encrypted-media; fullscreen"
                  />
                </div>
              )
            ) : (
              <p className="font-ui text-xs text-bloom-aubergine/60 break-all">URL: {payload.externalFormUrl}</p>
            )
          ) : (
            <p className="font-ui text-sm text-bloom-aubergine/50 italic">Sem externalFormUrl.</p>
          )}
        </div>
      )}
    </>
  );
}

export function WaveContentPreviewDialog({
  open,
  onOpenChange,
  kind,
  title,
  payload,
  error,
  isNew,
  published,
  articleExperts,
}: WaveContentPreviewDialogProps) {
  const kindLabel = waveContentKindLabel(kind);
  const Icon = kindMetaIcon(kind);
  const showDialogDesc = shouldShowDialogDescription(kind, payload);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border border-bloom-aubergine/15 bg-bloom-cream p-6">
        <DialogHeader className="pr-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-bloom-cream-deep shrink-0">
              <Icon size={14} weight="duotone" className="text-bloom-aubergine" />
            </span>
            <span className="font-ui text-[10px] uppercase tracking-[0.2em] text-bloom-aubergine/60">
              {kindLabel}
              {isNew && <span className="ml-2 text-bloom-garnet">• NOVO</span>}
              {!published && <span className="ml-2 text-bloom-aubergine/50">• RASCUNHO</span>}
            </span>
          </div>
          <DialogTitle className="font-serif-display text-2xl md:text-3xl text-bloom-aubergine leading-tight text-left">
            {title.trim() || "(sem título)"}
          </DialogTitle>
          {showDialogDesc && payload && (
            <DialogDescription className="font-ui text-sm text-bloom-aubergine/70 leading-relaxed text-left pt-1">
              {payloadDescription(payload)}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="mt-2">
          <PreviewBody
            kind={kind}
            title={title}
            payload={payload}
            error={error}
            articleExperts={articleExperts}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Same as {@link WaveContentPreviewDialog}; kept for imports that still expect this name. */
export const WaveContentPreview = WaveContentPreviewDialog;
