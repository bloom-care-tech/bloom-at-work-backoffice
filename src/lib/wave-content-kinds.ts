/** Prisma / Nest `WaveContentKind` — JSON body must use these values (not DB @map labels). */
export const WAVE_CONTENT_KIND_OPTIONS = [
  { value: "video", label: "Vídeo" },
  { value: "audio", label: "Áudio" },
  { value: "pdf", label: "PDF" },
  { value: "article", label: "Artigo" },
  { value: "toolkit", label: "Toolkit" },
  { value: "scientificReferences", label: "Referências científicas" },
] as const;

export type WaveContentKindApi = (typeof WAVE_CONTENT_KIND_OPTIONS)[number]["value"];

export function normalizeWaveContentKindToApi(kind: string): WaveContentKindApi {
  const k = kind.trim().toLowerCase();
  const map: Record<string, WaveContentKindApi> = {
    video: "video",
    vídeo: "video",
    audio: "audio",
    áudio: "audio",
    pdf: "pdf",
    article: "article",
    artigo: "article",
    exercise: "article",
    exercício: "article",
    exercicio: "article",
    toolkit: "toolkit",
    scientificreferences: "scientificReferences",
    "referências_científicas": "scientificReferences",
    referencias_cientificas: "scientificReferences",
  };
  return map[k] ?? "article";
}

export function waveContentKindLabel(kind: string): string {
  const api = normalizeWaveContentKindToApi(kind);
  const opt = WAVE_CONTENT_KIND_OPTIONS.find((o) => o.value === api);
  return opt?.label ?? kind;
}
