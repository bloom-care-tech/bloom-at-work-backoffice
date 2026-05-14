/** Matches admin API rules (skills, waves, document categories). */
export const RESOURCE_SLUG_MAX_LENGTH = 80;

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Builds a URL-safe slug from a display string (title or manual slug input).
 * Strips diacritics, lowercases, maps non-alphanumeric runs to single hyphens, trims edges, caps length.
 */
export function slugFromTitle(raw: string): string {
  const base = raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base.slice(0, RESOURCE_SLUG_MAX_LENGTH);
}

export function isValidResourceSlug(s: string): boolean {
  const t = s.trim().toLowerCase();
  return Boolean(
    t && t.length <= RESOURCE_SLUG_MAX_LENGTH && SLUG_REGEX.test(t),
  );
}

export function resourceSlugValidationMessage(): string {
  return 'Slug inválido: use apenas letras minúsculas, números e hífens, até 80 caracteres.';
}
