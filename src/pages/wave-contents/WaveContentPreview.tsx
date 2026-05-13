import DOMPurify from "dompurify";
import {
  BookOpen,
  FilePdf,
  Flask,
  Headphones,
  Toolbox,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AudioPlayer } from "@bloom-at-work/components/trilha/AudioPlayer";
import { WAVE_ARTICLE_BODY_PROSE_CLASS } from "@/lib/wave-article-body-class";
import { waveContentKindLabel, type WaveContentKindApi } from "@/lib/wave-content-kinds";

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
    default:
      return BookOpen;
  }
}

function shouldShowDialogDescription(kind: WaveContentKindApi, payload: Record<string, unknown> | null): boolean {
  if (!payload) return false;
  const desc = payloadDescription(payload).trim();
  if (!desc) return false;
  if (kind === "video" || kind === "audio" || kind === "pdf" || kind === "toolkit" || kind === "scientificReferences") {
    return false;
  }
  if (kind === "article") {
    const html = typeof payload.bodyHtml === "string" ? payload.bodyHtml : "";
    return !htmlHasVisibleText(html);
  }
  return true;
}

export type WaveContentPreviewProps = {
  kind: WaveContentKindApi;
  title: string;
  payload: Record<string, unknown> | null;
  error: string | null;
  isExercise: boolean;
  isNew: boolean;
  published: boolean;
};

export type WaveContentPreviewDialogProps = WaveContentPreviewProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function PreviewBody({
  kind,
  title,
  payload,
  error,
}: Pick<WaveContentPreviewProps, "kind" | "title" | "payload" | "error">) {
  return (
    <>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 font-ui text-sm text-red-800 mb-4">{error}</div>
      )}

      {!payload && !error && <p className="font-ui text-sm text-bloom-aubergine/55">Nada a pré-visualizar.</p>}

      {payload && kind === "article" && (
        <div className="space-y-3">
          {payloadDescription(payload).trim() && htmlHasVisibleText(typeof payload.bodyHtml === "string" ? payload.bodyHtml : "") && (
            <p className="font-ui text-sm text-bloom-aubergine/75 leading-relaxed">{payloadDescription(payload)}</p>
          )}
          {typeof payload.bodyHtml === "string" && htmlHasVisibleText(payload.bodyHtml) ? (
            <div
              className={WAVE_ARTICLE_BODY_PROSE_CLASS}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(payload.bodyHtml, PURIFY_OPTS) }}
            />
          ) : (
            <p className="font-ui text-sm text-bloom-aubergine/50 italic">Corpo vazio ou sem texto visível no HTML.</p>
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
          <AudioPlayer
            titulo={title.trim() || "(sem título)"}
            src={
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
            <a
              href={payload.pdfUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-ui text-sm bg-bloom-aubergine text-bloom-cream px-4 py-2.5 rounded-full hover:bg-bloom-garnet transition-colors"
            >
              Abrir PDF
            </a>
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

      {payload && kind === "toolkit" && (
        <pre className="font-mono text-[11px] leading-relaxed text-bloom-aubergine/90 bg-bloom-cream-deep/60 rounded-xl p-4 overflow-x-auto border border-bloom-aubergine/10">
          {JSON.stringify(payload, null, 2)}
        </pre>
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
  isExercise,
  isNew,
  published,
}: WaveContentPreviewDialogProps) {
  const kindLabel = waveContentKindLabel(kind);
  const Icon = kindMetaIcon(kind);
  const showDialogDesc = shouldShowDialogDescription(kind, payload);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border border-bloom-aubergine/15 bg-bloom-cream sm:max-w-2xl gap-0 p-6 md:p-8">
        <DialogHeader className="pr-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-bloom-cream-deep shrink-0">
              <Icon size={14} weight="duotone" className="text-bloom-aubergine" />
            </span>
            <span className="font-ui text-[10px] uppercase tracking-[0.2em] text-bloom-aubergine/60">
              {kindLabel}
              {isNew && <span className="ml-2 text-bloom-garnet">• NOVO</span>}
              {!published && <span className="ml-2 text-bloom-aubergine/50">• RASCUNHO</span>}
              {isExercise && <span className="ml-2 text-bloom-garnet">• EXERCÍCIO</span>}
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
        <div className="mt-4">
          <PreviewBody kind={kind} title={title} payload={payload} error={error} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Same as {@link WaveContentPreviewDialog}; kept for imports that still expect this name. */
export const WaveContentPreview = WaveContentPreviewDialog;
