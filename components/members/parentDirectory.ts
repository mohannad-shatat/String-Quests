/**
 * Parents, folded out of student guardians.
 *
 * Parents have no records of their own and shouldn't: a parent exists because
 * a student does, and the only place their details can be edited coherently is
 * the Family section of that student. So this module derives them, and every
 * parent row on /members is read-only and opens the student instead.
 *
 * The fold matches on national ID first, then phone, then normalised name —
 * the same precedence studentMatching.ts already uses to spot siblings. A
 * parent with three children is one row listing three children, not three
 * rows that happen to share a name.
 */

import {
  familyName,
  normalizeArabic,
  normalizeDigits,
} from '../students/studentMatching';
import type { Guardian, GuardianRelation, StudentRecord } from '../students/studentTypes';

export interface ParentChild {
  id: string;
  name: string;
  nameEn: string;
  grade: number | null;
  section: string;
  campusId: string;
}

export interface ParentEntry {
  /** Stable across reloads: derived from the fold key, not a counter. */
  id: string;
  name: string;
  relation: GuardianRelation;
  relationLabel: string;
  phone: string;
  email: string;
  nationalId: string;
  /** From the children — a parent has no campus of their own. */
  campusId: string;
  children: ParentChild[];
  /** Whose Family section owns this guardian, and so where editing happens. */
  primaryStudentId: string;
}

/**
 * Phone match uses the last 9 digits, so +962 7… and 07… are the same person —
 * the same rule findDuplicates applies.
 */
function phoneKey(phone: string): string {
  const digits = normalizeDigits(phone).replace(/\D+/g, '');
  return digits.length >= 9 ? digits.slice(-9) : '';
}

function foldKey(g: Guardian): string | null {
  const nid = g.nationalId.replace(/\s+/g, '');
  if (nid) return `nid:${nid}`;
  const phone = phoneKey(g.phone);
  if (phone) return `tel:${phone}`;
  const name = normalizeArabic(g.name);
  if (name) return `name:${name}`;
  // A guardian with no name, phone or ID isn't a person yet — it's an empty
  // row someone started and abandoned. Nothing to list.
  return null;
}

/** Short stable id from the fold key, so URLs survive a reload. */
function keyToId(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return `par-${h.toString(36)}`;
}

export function buildParents(students: StudentRecord[]): ParentEntry[] {
  const byKey = new Map<string, ParentEntry>();

  for (const s of students) {
    for (const g of s.guardians ?? []) {
      const key = foldKey(g);
      if (!key) continue;

      const child: ParentChild = {
        id: s.id,
        name: s.name,
        nameEn: s.nameEn,
        grade: s.grade,
        section: s.section,
        campusId: s.campusId,
      };

      const existing = byKey.get(key);
      if (existing) {
        existing.children.push(child);
        // Later records can fill in details an earlier one left blank —
        // never overwrite something already known.
        if (!existing.phone && g.phone) existing.phone = g.phone;
        if (!existing.email && g.email) existing.email = g.email;
        if (!existing.nationalId && g.nationalId) existing.nationalId = g.nationalId;
        continue;
      }

      byKey.set(key, {
        id: keyToId(key),
        name: g.name || familyName(s.name),
        relation: g.relation,
        relationLabel: g.relationLabel,
        phone: g.phone,
        email: g.email,
        nationalId: g.nationalId,
        campusId: s.campusId,
        children: [child],
        primaryStudentId: s.id,
      });
    }
  }

  return Array.from(byKey.values());
}

/** "Grade 5 · 2 children" — the line under a parent's name. */
export function parentSubtitle(
  p: ParentEntry,
  locale: 'ar' | 'en',
  childWord: (n: number) => string,
): string {
  const first = p.children[0];
  const parts: string[] = [];
  if (first) {
    parts.push(locale === 'ar' ? first.name : first.nameEn || first.name);
  }
  if (p.children.length > 1) parts.push(childWord(p.children.length));
  if (p.phone) parts.push(p.phone);
  return parts.filter(Boolean).join(' · ');
}
