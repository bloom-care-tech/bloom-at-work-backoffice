import type { WaveContentKindApi } from "@/lib/wave-content-kinds";

/** Coerce API `payload` to a plain object (handles JSON string, null, or non-objects). */
export function payloadRecordFromUnknown(raw: unknown): Record<string, unknown> {
  if (raw === null || raw === undefined) return {};
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return {};
    try {
      const v = JSON.parse(t) as unknown;
      if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
    } catch {
      return {};
    }
    return {};
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

export function omitKeys(obj: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj };
  for (const k of keys) delete out[k];
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainChunksToArticleHtml(text: string): string {
  const parts = text
    .split(/\n\n+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (!parts.length) return "<p></p>";
  return parts.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br />")}</p>`).join("");
}

function secoesArtigoToHtml(raw: unknown): string | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const parts: string[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const s = item as Record<string, unknown>;
    if (typeof s.titulo === "string" && s.titulo.trim()) {
      parts.push(`<h2>${escapeHtml(s.titulo.trim())}</h2>`);
    }
    const paras = s.paragrafos;
    if (Array.isArray(paras) && paras.every((x): x is string => typeof x === "string")) {
      for (const p of paras) {
        const t = p.trim();
        if (t) parts.push(`<p>${escapeHtml(t).replace(/\n/g, "<br />")}</p>`);
      }
    }
    const lista = s.lista;
    if (Array.isArray(lista) && lista.every((x): x is string => typeof x === "string")) {
      const lis = lista.map((it) => `<li><p>${escapeHtml(it)}</p></li>`).join("");
      if (lis) parts.push(`<ol>${lis}</ol>`);
    }
    if (typeof s.destaque === "string" && s.destaque.trim()) {
      parts.push(`<blockquote><p>${escapeHtml(s.destaque.trim())}</p></blockquote>`);
    }
  }
  const html = parts.join("");
  return html.trim() ? html : null;
}

export function extractArticleEditorHtml(payload: Record<string, unknown>): string {
  if (typeof payload.bodyHtml === "string" && payload.bodyHtml.trim()) {
    return payload.bodyHtml;
  }
  const fromSecoes = secoesArtigoToHtml(payload.secoesArtigo);
  if (fromSecoes) return fromSecoes;
  const raw = payload.paragrafos;
  if (Array.isArray(raw) && raw.length && raw.every((x): x is string => typeof x === "string")) {
    return plainChunksToArticleHtml(raw.join("\n\n"));
  }
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (body) return plainChunksToArticleHtml(body);
  return "<p></p>";
}

export type ArticleFormat = "editor" | "html";

export function articleFormatFromPayload(payload: Record<string, unknown>): ArticleFormat {
  if (payload.articleFormat === "html" || payload.format === "html") return "html";
  if (typeof payload.htmlUrl === "string" && payload.htmlUrl.trim()) return "html";
  return "editor";
}

export function articleHtmlUrlFromPayload(payload: Record<string, unknown>): string {
  return typeof payload.htmlUrl === "string" ? payload.htmlUrl : "";
}

const ARTICLE_STRIP_KEYS = [
  "bodyHtml",
  "paragrafos",
  "body",
  "description",
  "descricao",
  "secoesArtigo",
  "articleFormat",
  "format",
  "htmlUrl",
  "displayMode",
];

export function articleExtrasFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return omitKeys(payload, ARTICLE_STRIP_KEYS);
}

export type RefFormRow = { titulo: string; autores: string; fonte: string; doi: string; numero: string };

export function emptyRefRow(): RefFormRow {
  return { titulo: "", autores: "", fonte: "", doi: "", numero: "" };
}

export function refsFromPayload(payload: Record<string, unknown>): RefFormRow[] {
  const raw = payload.referencias;
  if (!Array.isArray(raw) || raw.length === 0) return [emptyRefRow()];
  const rows: RefFormRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const n = o.numero;
    const numeroStr =
      typeof n === "number" && Number.isFinite(n) ? String(n) : typeof n === "string" ? n : "";
    rows.push({
      titulo: typeof o.titulo === "string" ? o.titulo : "",
      autores: typeof o.autores === "string" ? o.autores : "",
      fonte: typeof o.fonte === "string" ? o.fonte : "",
      doi: typeof o.doi === "string" ? o.doi : "",
      numero: numeroStr,
    });
  }
  return rows.length ? rows : [emptyRefRow()];
}

/** Strips fields edited explicitly in the scientific-references editor (payload root). */
export function scientificRefsExtrasFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return omitKeys(payload, ["referencias", "description", "descricao"]);
}

export function buildReferenciasForApi(rows: RefFormRow[]): Record<string, unknown>[] {
  const filled = rows.filter((r) => r.titulo.trim() && r.autores.trim() && r.fonte.trim() && r.doi.trim());
  return filled.map((r, idx) => {
    const o: Record<string, unknown> = {
      titulo: r.titulo.trim(),
      autores: r.autores.trim(),
      fonte: r.fonte.trim(),
      doi: r.doi.trim(),
    };
    const n = r.numero.trim();
    if (n) {
      const parsed = parseInt(n, 10);
      o.numero = !Number.isNaN(parsed) && String(parsed) === n ? parsed : n;
    } else {
      o.numero = idx + 1;
    }
    return o;
  });
}

export function mediaUrlKeyForKind(kind: WaveContentKindApi): "videoUrl" | "audioUrl" | "pdfUrl" {
  if (kind === "video") return "videoUrl";
  if (kind === "audio") return "audioUrl";
  return "pdfUrl";
}

export function mediaExtrasFromPayload(payload: Record<string, unknown>, kind: WaveContentKindApi): Record<string, unknown> {
  const k = mediaUrlKeyForKind(kind);
  return omitKeys(payload, [k, "description", "descricao"]);
}

/** Maps to app subtitle via wave-content-mapper (`description` or legacy `descricao` on payload). */
export function mediaDescriptionFromPayload(payload: Record<string, unknown>): string {
  if (typeof payload.description === "string") return payload.description;
  if (typeof payload.descricao === "string") return payload.descricao;
  return "";
}

const LEGACY_TOOLKIT_PAYLOAD_STRIP_KEYS = ["kind", "titulo", "toolkit"] as const;

export function toolkitSectionTituloFromPayload(payload: Record<string, unknown>): string {
  const tk = payload.toolkit;
  if (tk && typeof tk === "object" && !Array.isArray(tk)) {
    const t = (tk as Record<string, unknown>).titulo;
    return typeof t === "string" ? t : "";
  }
  return "";
}

export function toolkitItensFromPayload(payload: Record<string, unknown>): string[] {
  const tk = payload.toolkit;
  if (tk && typeof tk === "object" && !Array.isArray(tk)) {
    const raw = (tk as Record<string, unknown>).itens;
    if (Array.isArray(raw) && raw.every((x): x is string => typeof x === "string")) {
      const lines = raw.map((s) => s.trim()).filter(Boolean);
      return lines.length ? lines : [""];
    }
  }
  return [""];
}

/** Converts legacy `payload.toolkit.itens` into editor HTML when opening old records. */
export function legacyToolkitListHtmlFromPayload(payload: Record<string, unknown>): string | null {
  const itens = toolkitItensFromPayload(payload)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!itens.length) return null;
  const sectionTitulo = toolkitSectionTituloFromPayload(payload).trim();
  const parts: string[] = [];
  if (sectionTitulo) parts.push(`<h2>${escapeHtml(sectionTitulo)}</h2>`);
  const lis = itens.map((it) => `<li><p>${escapeHtml(it)}</p></li>`).join("");
  parts.push(`<ul>${lis}</ul>`);
  return parts.join("");
}
