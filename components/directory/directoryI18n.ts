/**
 * Shared i18n helpers for the directory surfaces (students, teachers, people).
 *
 * Each module keeps its own dictionary — this only holds what they all need,
 * so `fill` isn't redefined three times.
 */

export type Locale = 'ar' | 'en';

/** Fills `{name}` placeholders — the flat dictionaries have no interpolation. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : `{${k}}`,
  );
}

/** Translator signature every directory component takes. */
export type Translate = (key: string) => string;

/**
 * Joins a list for display. Arabic uses ARABIC COMMA (U+060C); a Latin comma
 * in Arabic text reads as a typo, and the reverse is just as wrong.
 */
export function joinList(items: string[], locale: Locale): string {
  return items.filter(Boolean).join(locale === 'ar' ? '، ' : ', ');
}
