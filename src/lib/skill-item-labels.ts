export type SkillItemTypeApi = "audio" | "youtube" | "book" | "movie" | "text" | "pdf";

export const SKILL_ITEM_TYPE_OPTIONS: { value: SkillItemTypeApi; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "audio", label: "Áudio" },
  { value: "pdf", label: "PDF" },
  { value: "youtube", label: "YouTube" },
  { value: "book", label: "Livro" },
  { value: "movie", label: "Filme" },
];

export function skillItemTypeLabel(type: string): string {
  return SKILL_ITEM_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
