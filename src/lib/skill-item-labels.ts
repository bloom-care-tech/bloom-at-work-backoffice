export type SkillItemTypeApi = "audio" | "youtube" | "book" | "movie" | "text" | "exercise" | "references" | "pdf";

export const SKILL_ITEM_TYPE_OPTIONS: { value: SkillItemTypeApi; label: string }[] = [
  { value: "text", label: "Artigo" },
  { value: "exercise", label: "Exercício" },
  { value: "references", label: "Referências" },
  { value: "audio", label: "Áudio" },
  { value: "pdf", label: "PDF" },
  { value: "youtube", label: "Vídeo" },
  { value: "book", label: "Livro" },
  { value: "movie", label: "Filme" },
];

export function skillItemTypeLabel(type: string): string {
  return SKILL_ITEM_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
