// src/common/utils/slugify.util.ts

/** Converts arbitrary text into a lowercase, hyphen-separated, URL-safe slug. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents (e.g. "café" -> "cafe")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
