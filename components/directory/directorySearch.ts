/**
 * Directory search — ranked, typo-tolerant, Arabic-aware. Generic over any
 * record with an `id`, so students, teachers and parents share one engine.
 *
 * A plain `includes()` ranks "محمد أحمد" above "أحمد السالم" for the query
 * "أحمد", which is the wrong answer to the question the user asked. So matches
 * are scored by *where* they hit, and only fall back to edit distance when the
 * exact pass comes up short.
 *
 * Arabic normalisation is shared with sibling detection — see
 * `normalizeArabic` in components/students/studentMatching.ts.
 */

import { normalizeArabic, normalizeDigits } from '../students/studentMatching';

/** Below this length, fuzzy matching is off — "ali" would match half the school. */
const MIN_FUZZY_QUERY = 3;
/** Only pay for the fuzzy pass when the exact pass looks thin. */
const FUZZY_THRESHOLD = 5;
const MAX_EDIT_DISTANCE = 2;

export interface HasId {
  id: string;
}

/** A field worth searching, contributed by the caller's extractor. */
export interface IndexedField {
  /** Caller-defined key, e.g. 'name' | 'guardianPhone'. Drives the hint. */
  field: string;
  /** Normalised, for matching. */
  value: string;
  /** Original, for highlighting. */
  raw: string;
  /** Higher wins ties — a name hit should beat a guardian-phone hit. */
  weight: number;
  /** Digit-normalised (phones, national IDs) rather than text-normalised. */
  digits?: boolean;
  /** Excluded from fuzzy matching — a typo'd phone number isn't a near-miss. */
  exactOnly?: boolean;
  /** Considered by `didYouMean` — usually just the name fields. */
  suggestable?: boolean;
}

export interface SearchEntry<T> {
  item: T;
  fields: IndexedField[];
}

export type FieldExtractor<T> = (item: T) => IndexedField[];

/** Helper for extractors: skips blanks and normalises consistently. */
export function pushField(
  out: IndexedField[],
  field: string,
  raw: string | undefined,
  opts: { weight: number; digits?: boolean; exactOnly?: boolean; suggestable?: boolean },
): void {
  const trimmed = raw?.trim();
  if (!trimmed) return;
  out.push({
    field,
    value: opts.digits ? normalizeDigits(trimmed) : normalizeArabic(trimmed),
    raw: trimmed,
    weight: opts.weight,
    digits: opts.digits,
    exactOnly: opts.exactOnly,
    suggestable: opts.suggestable,
  });
}

/**
 * Builds the search index. Call once per roster change (useMemo), not per
 * keystroke — normalising thousands of records on every character is the
 * difference between instant and laggy.
 */
export function buildSearchIndex<T extends HasId>(
  items: T[],
  extract: FieldExtractor<T>,
): SearchEntry<T>[] {
  return items.map((item) => ({ item, fields: extract(item) }));
}

/* ─── Edit distance ───────────────────────────────────────────────────── */

/**
 * Levenshtein with early exit past `max`. Bounded so a long non-match costs
 * O(n·max) rather than O(n·m) — the whole point of capping at 2.
 */
export function boundedEditDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    // Every path through this row already exceeds the budget.
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

/* ─── Scoring ─────────────────────────────────────────────────────────── */

const SCORE_EXACT = 1000;
const SCORE_PREFIX = 800;
const SCORE_WORD_PREFIX = 600;
const SCORE_CONTAINS = 400;
const SCORE_FUZZY_BASE = 200;

export interface SearchHit<T> {
  item: T;
  score: number;
  /** Which field produced the best score — drives the "matched on…" hint. */
  matchedField: string;
  fuzzy: boolean;
}

function scoreField(f: IndexedField, q: string): Omit<SearchHit<never>, 'item'> | null {
  if (f.value === q) {
    return { score: SCORE_EXACT + f.weight, matchedField: f.field, fuzzy: false };
  }

  const idx = f.value.indexOf(q);
  if (idx === 0) {
    return { score: SCORE_PREFIX + f.weight, matchedField: f.field, fuzzy: false };
  }
  if (idx > 0) {
    // A hit right after a space is a word start — "السالم" in "أحمد السالم".
    const wordStart = f.value[idx - 1] === ' ';
    return {
      score: (wordStart ? SCORE_WORD_PREFIX : SCORE_CONTAINS) + f.weight,
      matchedField: f.field,
      fuzzy: false,
    };
  }

  return null;
}

function scoreFieldFuzzy(f: IndexedField, q: string): Omit<SearchHit<never>, 'item'> | null {
  // Compare per word, so a typo in a surname still matches the full name.
  let best = MAX_EDIT_DISTANCE + 1;
  for (const word of f.value.split(' ')) {
    if (!word) continue;
    const d = boundedEditDistance(word, q, MAX_EDIT_DISTANCE);
    if (d < best) best = d;
  }
  if (best > MAX_EDIT_DISTANCE) return null;

  return {
    score: SCORE_FUZZY_BASE - best * 20 + f.weight,
    matchedField: f.field,
    fuzzy: true,
  };
}

/**
 * Ranked search. Returns every hit, best first — callers paginate.
 * An empty query returns null so the caller can keep its own ordering
 * (sorting by column only makes sense when relevance isn't in play).
 */
export function searchEntries<T extends HasId>(
  index: SearchEntry<T>[],
  rawQuery: string,
): SearchHit<T>[] | null {
  const q = normalizeArabic(rawQuery);
  if (!q) return null;

  const qDigits = normalizeDigits(rawQuery);
  const hits: SearchHit<T>[] = [];

  for (const entry of index) {
    let best: Omit<SearchHit<never>, 'item'> | null = null;

    for (const f of entry.fields) {
      const needle = f.digits ? qDigits : q;
      if (!needle) continue;
      const scored = scoreField(f, needle);
      if (scored && (!best || scored.score > best.score)) best = scored;
    }

    if (best) hits.push({ item: entry.item, ...best });
  }

  // Fuzzy only when the literal pass came up thin — the common case never
  // pays for edit distance across the whole roster.
  if (hits.length < FUZZY_THRESHOLD && q.length >= MIN_FUZZY_QUERY) {
    const already = new Set(hits.map((h) => h.item.id));
    for (const entry of index) {
      if (already.has(entry.item.id)) continue;
      let best: Omit<SearchHit<never>, 'item'> | null = null;
      for (const f of entry.fields) {
        if (f.exactOnly) continue;
        const scored = scoreFieldFuzzy(f, q);
        if (scored && (!best || scored.score > best.score)) best = scored;
      }
      if (best) hits.push({ item: entry.item, ...best });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits;
}

/**
 * Closest records to a query that found nothing — the "did you mean" row.
 * Deliberately looser than search (distance 3) because the user has already
 * failed once and a near-miss beats an empty screen.
 */
export function didYouMean<T extends HasId>(
  index: SearchEntry<T>[],
  rawQuery: string,
  limit = 3,
): T[] {
  // Compare token-to-token. "Abdulazizz Qahtanii" is nowhere near any single
  // name word as one string, but each of its tokens is one edit from a real
  // one — which is exactly the mistake a "did you mean" should catch.
  const tokens = normalizeArabic(rawQuery)
    .split(' ')
    .filter((w) => w.length >= MIN_FUZZY_QUERY);
  if (tokens.length === 0) return [];

  const scored: { item: T; distance: number }[] = [];

  for (const entry of index) {
    let total = 0;
    let matched = 0;

    for (const token of tokens) {
      let best = 4;
      for (const f of entry.fields) {
        if (!f.suggestable) continue;
        for (const word of f.value.split(' ')) {
          if (!word) continue;
          // Compare with and without the article: transliterated surnames
          // carry "al-", so "qahtanii" would never reach "al-qahtani" within
          // the edit budget otherwise.
          const bare = word.replace(/^(al-|ال)/, '');
          const d = Math.min(
            boundedEditDistance(word, token, 3),
            bare === word ? 4 : boundedEditDistance(bare, token, 3),
          );
          if (d < best) best = d;
        }
      }
      if (best <= 3) {
        total += best;
        matched++;
      }
    }

    // Most tokens must land. Requiring all of them means one unrecognisable
    // word suppresses an otherwise obvious suggestion; requiring none would
    // suggest every Ahmed in the school.
    const needed = Math.ceil(tokens.length / 2);
    if (matched >= needed) {
      // Unmatched tokens count against the score, so fuller matches rank first.
      scored.push({
        item: entry.item,
        distance: (total + (tokens.length - matched) * 4) / tokens.length,
      });
    }
  }

  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, limit).map((s) => s.item);
}

/* ─── Highlighting ────────────────────────────────────────────────────── */

export interface HighlightSegment {
  text: string;
  hit: boolean;
}

/**
 * Splits `raw` around every occurrence of the query, for <mark>-style output.
 * Matching happens on the normalised form but slices the original, so Arabic
 * diacritics survive in the rendered text.
 */
export function highlight(raw: string, rawQuery: string): HighlightSegment[] {
  const q = normalizeArabic(rawQuery);
  if (!q || !raw) return [{ text: raw, hit: false }];

  const normalized = normalizeArabic(raw);
  // normalizeArabic only substitutes and collapses whitespace; for the common
  // case lengths line up, and when they don't we degrade to no highlight
  // rather than slicing at the wrong offsets.
  if (normalized.length !== raw.length) {
    return [{ text: raw, hit: false }];
  }

  const out: HighlightSegment[] = [];
  let cursor = 0;
  let idx = normalized.indexOf(q);

  while (idx !== -1) {
    if (idx > cursor) out.push({ text: raw.slice(cursor, idx), hit: false });
    out.push({ text: raw.slice(idx, idx + q.length), hit: true });
    cursor = idx + q.length;
    idx = normalized.indexOf(q, cursor);
  }

  if (cursor < raw.length) out.push({ text: raw.slice(cursor), hit: false });
  return out.length > 0 ? out : [{ text: raw, hit: false }];
}
