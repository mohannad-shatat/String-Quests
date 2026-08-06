/**
 * Duplicate and sibling detection.
 *
 * Both are *suggestions*, never gates. A school genuinely can enrol two
 * students with the same name, and a shared surname is not proof of a family.
 * Everything here returns candidates for a human to confirm or dismiss; the
 * only hard block is on the national ID, which is unique by definition.
 */

import type { StudentRecord } from './studentTypes';

/* ─── Normalisation ───────────────────────────────────────────────────── */

/**
 * Folds the orthographic variation that makes naive Arabic string comparison
 * useless: alef forms (أ إ آ → ا), taa marbuta (ة → ه), alef maqsura (ى → ي),
 * tatweel, diacritics, and runs of whitespace.
 */
export function normalizeArabic(input: string): string {
  return input
    .trim()
    .replace(/[ً-ْٰ]/g, '') // harakat
    .replace(/ـ/g, '') // tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Digits only — phone numbers are written with spaces, dashes and +. */
export function normalizeDigits(input: string): string {
  return input.replace(/\D+/g, '');
}

/**
 * Compares the last 9 digits, so `+962790000000`, `0790000000` and
 * `790000000` all match — the same number written three ways.
 */
function phoneKey(input: string): string {
  const d = normalizeDigits(input);
  return d.length >= 9 ? d.slice(-9) : d;
}

/** Family name = last token of the Arabic name, e.g. "أحمد السالم" → "السالم". */
export function familyName(fullName: string): string {
  const parts = normalizeArabic(fullName).split(' ').filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/* ─── Duplicate detection ─────────────────────────────────────────────── */

export type DuplicateReason = 'name' | 'nationalId';

export interface DuplicateMatch {
  student: StudentRecord;
  reasons: DuplicateReason[];
  /** A national-ID collision is a hard error; a name clash is a warning. */
  blocking: boolean;
}

/**
 * Finds existing students that look like the one being entered.
 * Name matches are advisory. A national-ID match is blocking — that number
 * identifies exactly one person, so a collision is either a typo or a genuine
 * re-entry of someone already enrolled.
 */
export function findDuplicates(
  record: StudentRecord,
  existing: StudentRecord[],
): DuplicateMatch[] {
  const name = normalizeArabic(record.name);
  const nameEn = normalizeArabic(record.nameEn);
  const nid = normalizeDigits(record.nationalId);

  const out: DuplicateMatch[] = [];

  for (const other of existing) {
    if (other.id === record.id) continue;

    const reasons: DuplicateReason[] = [];

    if (name) {
      const otherAr = normalizeArabic(other.name);
      const otherEn = normalizeArabic(other.nameEn);
      if (otherAr === name || (nameEn && otherEn === nameEn) || otherEn === name || otherAr === nameEn) {
        reasons.push('name');
      }
    }

    if (nid && normalizeDigits(other.nationalId) === nid) {
      reasons.push('nationalId');
    }

    if (reasons.length > 0) {
      out.push({ student: other, reasons, blocking: reasons.includes('nationalId') });
    }
  }

  // Blocking matches first — that's the one the user must act on.
  return out.sort((a, b) => Number(b.blocking) - Number(a.blocking)).slice(0, 5);
}

/* ─── Sibling detection ───────────────────────────────────────────────── */

export type SiblingReason = 'guardianNationalId' | 'guardianPhone' | 'familyName';

export interface SiblingMatch {
  student: StudentRecord;
  reasons: SiblingReason[];
  /** Higher = more trustworthy. Drives ordering and the confidence label. */
  score: number;
}

const REASON_SCORE: Record<SiblingReason, number> = {
  // A guardian's national ID identifies one adult — near-certain.
  guardianNationalId: 100,
  // Strong: households share a number, though numbers do get reassigned.
  guardianPhone: 60,
  // Weak on its own: الغامدي is thousands of unrelated people.
  familyName: 20,
};

export type SiblingConfidence = 'high' | 'medium' | 'low';

export function siblingConfidence(score: number): SiblingConfidence {
  if (score >= 100) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

/**
 * Finds students who may belong to the same family.
 *
 * Already-confirmed family members (same `familyId`) are returned first with a
 * perfect score so the UI can show the family as established rather than
 * re-asking about it.
 */
export function findSiblings(record: StudentRecord, existing: StudentRecord[]): SiblingMatch[] {
  // Any guardian matching any of theirs counts — a father recorded on one
  // child and a mother on the other still means the same household.
  const nids = new Set(
    record.guardians.map((g) => normalizeDigits(g.nationalId)).filter((v) => v.length > 0),
  );
  const phones = new Set(
    record.guardians.map((g) => phoneKey(g.phone)).filter((v) => v.length >= 9),
  );
  const fam = familyName(record.name);
  const confirmedFamily = record.familyId;

  const out: SiblingMatch[] = [];

  for (const other of existing) {
    if (other.id === record.id) continue;

    if (confirmedFamily && other.familyId === confirmedFamily) {
      out.push({ student: other, reasons: ['guardianNationalId'], score: 999 });
      continue;
    }

    const reasons: SiblingReason[] = [];

    if (nids.size && other.guardians.some((g) => nids.has(normalizeDigits(g.nationalId)))) {
      reasons.push('guardianNationalId');
    }
    if (phones.size && other.guardians.some((g) => phones.has(phoneKey(g.phone)))) {
      reasons.push('guardianPhone');
    }
    if (fam && familyName(other.name) === fam) {
      reasons.push('familyName');
    }

    if (reasons.length === 0) continue;

    const score = reasons.reduce((sum, r) => sum + REASON_SCORE[r], 0);
    out.push({ student: other, reasons, score });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 8);
}

/** True when this record is already part of a confirmed family. */
export function hasConfirmedFamily(record: StudentRecord): boolean {
  return !!record.familyId;
}

export function generateFamilyId(): string {
  return `fam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
