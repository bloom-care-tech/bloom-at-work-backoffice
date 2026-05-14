import { describe, expect, it } from 'vitest';
import {
  RESOURCE_SLUG_MAX_LENGTH,
  isValidResourceSlug,
  slugFromTitle,
} from './slug';

describe('slugFromTitle', () => {
  it('normalizes accents and spaces', () => {
    expect(slugFromTitle('Escuta Ativa')).toBe('escuta-ativa');
    expect(slugFromTitle('Não fique')).toBe('nao-fique');
  });

  it('collapses separators and trims', () => {
    expect(slugFromTitle('  foo___bar  ')).toBe('foo-bar');
    expect(slugFromTitle('a--b')).toBe('a-b');
  });

  it('respects max length', () => {
    const long = 'a'.repeat(200);
    expect(slugFromTitle(long).length).toBe(RESOURCE_SLUG_MAX_LENGTH);
  });
});

describe('isValidResourceSlug', () => {
  it('accepts API-shaped slugs', () => {
    expect(isValidResourceSlug('escuta-ativa')).toBe(true);
    expect(isValidResourceSlug('wave1')).toBe(true);
  });

  it('rejects invalid shapes', () => {
    expect(isValidResourceSlug('')).toBe(false);
    expect(isValidResourceSlug('-a')).toBe(false);
    expect(isValidResourceSlug('a-')).toBe(false);
    expect(isValidResourceSlug('a--b')).toBe(false);
    expect(isValidResourceSlug('a b')).toBe(false);
    expect(isValidResourceSlug('a_b')).toBe(false);
  });
});
