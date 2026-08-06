/**
 * Filters, search adapter and row model for /members.
 *
 * The screen holds two different things: authored `MemberRecord`s for the five
 * staff roles, and parents derived from student guardians. They share a table,
 * so they're unified into one `MemberRow` here rather than the table branching
 * on type in six places.
 *
 * Same filter semantics as the other rosters: within a field values OR, across
 * fields they AND, and facet counts exclude their own field.
 */

import { CAMPUSES } from '../../data/mockAttendanceData';
import { SEED_MEMBERS } from '../../data/seedMembers';
import { loadMembers } from '../../utils/memberStorage';
import { seededStudents } from '../students/seedStudents';
import { loadStudents } from '../../utils/studentStorage';
import { SUBJECTS, subjectLabel } from '../teachers/teacherFilters';
import {
  buildSearchIndex,
  didYouMean as genericDidYouMean,
  pushField,
  searchEntries,
  type IndexedField,
  type SearchEntry,
} from '../directory/directorySearch';
import { AUTHORED_OTHER_TYPE_IDS, OTHER_MEMBER_TYPES } from '../people/memberTypes';
import type { MemberTypeId } from '../people/memberTypes';
import { roleLabel } from './membersI18n';
import { buildParents, type ParentEntry } from './parentDirectory';
import { daysRemaining, isExpired, scopeOf, type MemberRecord } from './memberRecordTypes';
import { joinList, type Locale } from '../directory/directoryI18n';

/* ─── Rows ────────────────────────────────────────────────────────────── */

export interface MemberRow {
  id: string;
  type: MemberTypeId;
  name: string;
  nameEn: string;
  stringId: string;
  /** The scope column: campuses, subjects, or a parent's children. */
  scope: string;
  campusIds: string[];
  subjects: string[];
  grades: number[];
  gender: string;
  employment: string;
  phone: string;
  email: string;
  photoDataUrl: string;
  isLocal: boolean;
  /** Parents — computed, so not editable here. */
  derived: boolean;
  /** Lead Teacher only: days until the grant lapses, negative once it has. */
  termDays: number | null;
  expired: boolean;
  /** Present on authored rows; parents carry `parent` instead. */
  record?: MemberRecord;
  parent?: ParentEntry;
}

function scopeText(m: MemberRecord, locale: Locale): string {
  const scope = scopeOf(m.type);
  const parts: string[] = [];
  if (scope.campuses !== 'none' && m.campusIds.length) {
    parts.push(joinList(m.campusIds.map((id) => campusLabel(id, locale)), locale));
  }
  if (scope.subjects && m.subjects.length) {
    parts.push(joinList(m.subjects.map((s) => subjectLabel(s, locale)), locale));
  }
  if (scope.grades && m.grades.length) {
    parts.push(`${m.grades[0]}–${m.grades[m.grades.length - 1]}`);
  }
  return parts.join(' · ');
}

export function rowFromRecord(m: MemberRecord, locale: Locale, today: Date): MemberRow {
  return {
    id: m.id,
    type: m.type,
    name: m.name,
    nameEn: m.nameEn,
    stringId: m.stringId,
    scope: scopeText(m, locale),
    campusIds: m.campusIds,
    subjects: m.subjects,
    grades: m.grades,
    gender: m.gender,
    employment: m.employmentType,
    phone: m.phone,
    email: m.email || m.loginEmail,
    photoDataUrl: m.photoDataUrl,
    isLocal: m.isLocal,
    derived: false,
    termDays: daysRemaining(m, today),
    expired: isExpired(m, today),
    record: m,
  };
}

export function rowFromParent(p: ParentEntry, locale: Locale): MemberRow {
  const names = p.children.map((c) => (locale === 'ar' ? c.name : c.nameEn || c.name));
  return {
    id: p.id,
    type: 'parent',
    name: p.name,
    nameEn: p.name,
    stringId: '',
    scope: joinList(names.slice(0, 2), locale) + (names.length > 2 ? ` +${names.length - 2}` : ''),
    campusIds: Array.from(new Set(p.children.map((c) => c.campusId))),
    subjects: [],
    grades: p.children.map((c) => c.grade).filter((g): g is number => g !== null),
    // Guardians carry no gender field, but the relation says it outright.
    gender: p.relation === 'father' ? 'male' : p.relation === 'mother' ? 'female' : '',
    employment: '',
    phone: p.phone,
    email: p.email,
    photoDataUrl: '',
    isLocal: false,
    derived: true,
    termDays: null,
    expired: false,
    parent: p,
  };
}

/** Local records win over a seeded record with the same id. */
export function loadMemberRecords(): MemberRecord[] {
  const local = loadMembers();
  const localIds = new Set(local.map((m) => m.id));
  return [...local, ...SEED_MEMBERS.filter((m) => !localIds.has(m.id))];
}

export function buildMemberRows(locale: Locale, today: Date): MemberRow[] {
  const localStudents = loadStudents();
  const localIds = new Set(localStudents.map((s) => s.id));
  const students = [...localStudents, ...seededStudents().filter((s) => !localIds.has(s.id))];

  return [
    ...loadMemberRecords().map((m) => rowFromRecord(m, locale, today)),
    ...buildParents(students).map((p) => rowFromParent(p, locale)),
  ];
}

/* ─── Filters ─────────────────────────────────────────────────────────── */

export type MemberFilterField = 'type' | 'campus' | 'subject' | 'gender' | 'employment' | 'term';

export type MemberFilterState = Partial<Record<MemberFilterField, string[]>>;

export const MEMBER_FILTER_FIELDS: MemberFilterField[] = [
  'type', 'campus', 'subject', 'gender', 'employment', 'term',
];

export interface FilterOption {
  value: string;
  label: string;
}

export function memberFieldLabelKey(field: MemberFilterField): string {
  return `filter.${field}`;
}

export function memberFieldOptions(
  field: MemberFilterField,
  locale: Locale,
  t: (key: string) => string,
): FilterOption[] {
  switch (field) {
    case 'type':
      return OTHER_MEMBER_TYPES.map((m) => ({ value: m.id, label: roleLabel(m.id, locale) }));
    case 'campus':
      return CAMPUSES.map((c) => ({ value: c.id, label: locale === 'ar' ? c.name : c.nameEn }));
    case 'subject':
      return SUBJECTS.map((s) => ({ value: s, label: subjectLabel(s, locale) }));
    case 'gender':
      return [
        { value: 'male', label: locale === 'ar' ? 'ذكر' : 'Male' },
        { value: 'female', label: locale === 'ar' ? 'أنثى' : 'Female' },
      ];
    case 'employment':
      return (['full-time', 'part-time', 'visiting'] as const).map((v) => ({
        value: v,
        label: t(`emp.${v}`),
      }));
    case 'term':
      // Only Lead Teachers carry a term, so this doubles as "show me the
      // grants that need attention".
      return [
        { value: 'active', label: t('term.active') },
        { value: 'ending', label: t('term.ending') },
        { value: 'expired', label: t('term.expired') },
      ];
  }
}

/** A grant with fewer days than this left is "ending soon". */
export const TERM_ENDING_SOON_DAYS = 30;

function matches(row: MemberRow, field: MemberFilterField, values: string[]): boolean {
  switch (field) {
    case 'type': return values.includes(row.type);
    case 'campus': return row.campusIds.some((id) => values.includes(id));
    case 'subject': return row.subjects.some((s) => values.includes(s));
    case 'gender': return !!row.gender && values.includes(row.gender);
    case 'employment': return !!row.employment && values.includes(row.employment);
    case 'term': {
      if (row.termDays === null) return false;
      const state = row.expired ? 'expired' : row.termDays <= TERM_ENDING_SOON_DAYS ? 'ending' : 'active';
      return values.includes(state);
    }
  }
}

export function activeMemberFields(filters: MemberFilterState): MemberFilterField[] {
  return MEMBER_FILTER_FIELDS.filter((f) => (filters[f]?.length ?? 0) > 0);
}

export function applyMemberFilters(
  rows: MemberRow[],
  filters: MemberFilterState,
  exclude?: MemberFilterField,
): MemberRow[] {
  const fields = activeMemberFields(filters).filter((f) => f !== exclude);
  if (fields.length === 0) return rows;
  return rows.filter((r) => fields.every((f) => matches(r, f, filters[f] as string[])));
}

export function memberFacetCounts(
  rows: MemberRow[],
  filters: MemberFilterState,
  field: MemberFilterField,
): Record<string, number> {
  const base = applyMemberFilters(rows, filters, field);
  const counts: Record<string, number> = {};

  for (const r of base) {
    if (field === 'campus') {
      for (const id of r.campusIds) counts[id] = (counts[id] ?? 0) + 1;
      continue;
    }
    if (field === 'subject') {
      for (const s of r.subjects) counts[s] = (counts[s] ?? 0) + 1;
      continue;
    }
    if (field === 'term') {
      if (r.termDays === null) continue;
      const state = r.expired ? 'expired' : r.termDays <= TERM_ENDING_SOON_DAYS ? 'ending' : 'active';
      counts[state] = (counts[state] ?? 0) + 1;
      continue;
    }
    const key = field === 'type' ? r.type : field === 'gender' ? r.gender : r.employment;
    if (key) counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

export function memberFiltersToParams(filters: MemberFilterState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of activeMemberFields(filters)) out[f] = (filters[f] as string[]).join(',');
  return out;
}

export function memberFiltersFromParams(params: URLSearchParams): MemberFilterState {
  const out: MemberFilterState = {};
  for (const f of MEMBER_FILTER_FIELDS) {
    const raw = params.get(f);
    if (!raw) continue;
    const values = raw.split(',').map((v) => v.trim()).filter(Boolean);
    if (values.length > 0) out[f] = values;
  }
  return out;
}

/* ─── Search ──────────────────────────────────────────────────────────── */

function extractFields(r: MemberRow): IndexedField[] {
  const out: IndexedField[] = [];
  pushField(out, 'name', r.name, { weight: 10, suggestable: true });
  pushField(out, 'nameEn', r.nameEn, { weight: 9, suggestable: true });
  pushField(out, 'stringId', r.stringId, { weight: 8 });
  pushField(out, 'scope', r.scope, { weight: 5 });
  pushField(out, 'email', r.email, { weight: 5 });
  pushField(out, 'employeeId', r.record?.employeeId, { weight: 4 });
  pushField(out, 'nationalId', r.record?.nationalId ?? r.parent?.nationalId, {
    weight: 3, digits: true, exactOnly: true,
  });
  pushField(out, 'phone', r.phone, { weight: 2, digits: true, exactOnly: true });
  return out;
}

export type MemberSearchEntry = SearchEntry<MemberRow>;

export function buildMemberIndex(rows: MemberRow[]): MemberSearchEntry[] {
  return buildSearchIndex(rows, extractFields);
}

export function searchMembers(index: MemberSearchEntry[], query: string) {
  return searchEntries(index, query);
}

export function memberDidYouMean(index: MemberSearchEntry[], query: string, limit = 3) {
  return genericDidYouMean(index, query, limit);
}

/* ─── Labels ──────────────────────────────────────────────────────────── */

export function campusLabel(id: string, locale: Locale): string {
  const c = CAMPUSES.find((x) => x.id === id);
  return c ? (locale === 'ar' ? c.name : c.nameEn) : '—';
}

export { AUTHORED_OTHER_TYPE_IDS };
