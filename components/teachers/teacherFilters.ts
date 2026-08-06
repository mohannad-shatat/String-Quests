/**
 * Teacher filters, search adapter and seeded-record derivation.
 *
 * Same semantics as the students module: within a field values OR, across
 * fields they AND, and facet counts exclude their own field so multi-select
 * feels right.
 */

import { CAMPUSES, EXTENDED_TEACHERS } from '../../data/mockAttendanceData';
import { GRADES } from '../../data/adminData';
import {
  buildSearchIndex as buildGenericIndex,
  didYouMean as genericDidYouMean,
  pushField,
  searchEntries,
  type IndexedField,
  type SearchEntry,
} from '../directory/directorySearch';
import { generateTeacherStringId } from '../../utils/teacherStorage';
import { emptyTeacher, type EmploymentType, type TeacherRecord } from './teacherTypes';
import type { Locale } from './teachersI18n';
import { getTeachersString } from './teachersI18n';

/* ─── Seeded records ──────────────────────────────────────────────────── */

function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

const EMPLOYMENT_CYCLE: EmploymentType[] = ['full-time', 'full-time', 'full-time', 'part-time', 'visiting'];

/**
 * `EXTENDED_TEACHERS` carries only name/subject/campus/grades/spaces, but the
 * form requires gender, a login and a password. Rather than leave seeded
 * records permanently unsaveable — the bug that bit the students page — the
 * rest is derived deterministically from the id.
 */
export function fromSeedTeacher(t: (typeof EXTENDED_TEACHERS)[number]): TeacherRecord {
  const h = idHash(t.id);
  const sections = Array.from(new Set(t.spaces.map((s) => s.split('-')[1]?.replace(/^\d+/, '')))).filter(
    Boolean,
  ) as string[];

  return {
    ...emptyTeacher(),
    id: t.id,
    // Ids are `tch-N`; the STF prefix keeps staff distinguishable from a
    // student's STU when someone reads one aloud.
    stringId: `STF${t.id.replace(/^tch-/, '')}`.toUpperCase(),
    name: t.name,
    nameEn: t.nameEn,
    // Campus type is the only gender signal in the mock data; camp-3 is mixed.
    gender: t.campusId === 'camp-1' ? 'male' : t.campusId === 'camp-2' ? 'female' : h % 2 === 0 ? 'male' : 'female',
    subject: t.subject,
    grades: [...t.grades],
    campusId: t.campusId,
    sections,
    employeeId: `EMP${t.id.replace(/^tch-/, '')}`.toUpperCase(),
    hireDate: `${2015 + (h % 9)}-${String((h % 12) + 1).padStart(2, '0')}-01`,
    employmentType: EMPLOYMENT_CYCLE[h % EMPLOYMENT_CYCLE.length],
    yearsOfExperience: String(2 + (h % 18)),
    loginEmail: `${t.id}@staff.school.edu`,
    isLocal: false,
  };
}

export const SUBJECTS = Array.from(new Set(EXTENDED_TEACHERS.map((t) => t.subject)));
export const SUBJECTS_EN = new Map(EXTENDED_TEACHERS.map((t) => [t.subject, t.subjectEn]));

/* ─── Filters ─────────────────────────────────────────────────────────── */

export type TeacherFilterField = 'subject' | 'grades' | 'campus' | 'employment' | 'gender';

export type TeacherFilterState = Partial<Record<TeacherFilterField, string[]>>;

export interface FilterOption {
  value: string;
  label: string;
}

export const TEACHER_FILTER_FIELDS: TeacherFilterField[] = [
  'subject',
  'grades',
  'campus',
  'employment',
  'gender',
];

export function teacherFieldLabelKey(field: TeacherFilterField): string {
  switch (field) {
    case 'subject': return 'filter.subject';
    case 'grades': return 'filter.grades';
    case 'campus': return 'f.campus';
    case 'employment': return 'filter.employment';
    case 'gender': return 'f.gender';
  }
}

export function teacherFieldOptions(field: TeacherFilterField, locale: Locale): FilterOption[] {
  const t = (k: string) => getTeachersString(locale, k);
  switch (field) {
    case 'subject':
      return SUBJECTS.map((s) => ({
        value: s,
        label: locale === 'ar' ? s : SUBJECTS_EN.get(s) ?? s,
      }));
    case 'grades':
      return GRADES.map((g) => ({
        value: String(g),
        label: locale === 'ar' ? `الصف ${g}` : `Grade ${g}`,
      }));
    case 'campus':
      return CAMPUSES.map((c) => ({ value: c.id, label: locale === 'ar' ? c.name : c.nameEn }));
    case 'employment':
      return (['full-time', 'part-time', 'visiting'] as const).map((v) => ({
        value: v,
        label: t(`emp.${v}`),
      }));
    case 'gender':
      return [
        { value: 'male', label: locale === 'ar' ? 'ذكر' : 'Male' },
        { value: 'female', label: locale === 'ar' ? 'أنثى' : 'Female' },
      ];
  }
}

function matches(record: TeacherRecord, field: TeacherFilterField, values: string[]): boolean {
  switch (field) {
    case 'subject': return values.includes(record.subject);
    // Grades is many-to-many: a teacher matches if they teach ANY selected grade.
    case 'grades': return record.grades.some((g) => values.includes(String(g)));
    case 'campus': return values.includes(record.campusId);
    case 'employment': return values.includes(record.employmentType);
    case 'gender': return values.includes(record.gender);
  }
}

export function activeTeacherFields(filters: TeacherFilterState): TeacherFilterField[] {
  return TEACHER_FILTER_FIELDS.filter((f) => (filters[f]?.length ?? 0) > 0);
}

export function applyTeacherFilters(
  records: TeacherRecord[],
  filters: TeacherFilterState,
  exclude?: TeacherFilterField,
): TeacherRecord[] {
  const fields = activeTeacherFields(filters).filter((f) => f !== exclude);
  if (fields.length === 0) return records;
  return records.filter((r) => fields.every((f) => matches(r, f, filters[f] as string[])));
}

export function teacherFacetCounts(
  records: TeacherRecord[],
  filters: TeacherFilterState,
  field: TeacherFilterField,
): Record<string, number> {
  const base = applyTeacherFilters(records, filters, field);
  const counts: Record<string, number> = {};

  for (const r of base) {
    if (field === 'grades') {
      // One teacher contributes to every grade they teach.
      for (const g of r.grades) counts[String(g)] = (counts[String(g)] ?? 0) + 1;
      continue;
    }
    const key =
      field === 'subject' ? r.subject
        : field === 'campus' ? r.campusId
          : field === 'employment' ? r.employmentType
            : r.gender;
    if (key) counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

export function teacherFiltersToParams(filters: TeacherFilterState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of activeTeacherFields(filters)) out[f] = (filters[f] as string[]).join(',');
  return out;
}

export function teacherFiltersFromParams(params: URLSearchParams): TeacherFilterState {
  const out: TeacherFilterState = {};
  for (const f of TEACHER_FILTER_FIELDS) {
    const raw = params.get(f);
    if (!raw) continue;
    const values = raw.split(',').map((v) => v.trim()).filter(Boolean);
    if (values.length > 0) out[f] = values;
  }
  return out;
}

/* ─── Search ──────────────────────────────────────────────────────────── */

export type TeacherSearchEntry = SearchEntry<TeacherRecord>;

function extractTeacherFields(t: TeacherRecord): IndexedField[] {
  const out: IndexedField[] = [];
  pushField(out, 'name', t.name, { weight: 10, suggestable: true });
  pushField(out, 'nameEn', t.nameEn, { weight: 9, suggestable: true });
  pushField(out, 'stringId', t.stringId, { weight: 8 });
  pushField(out, 'subject', t.subject, { weight: 6 });
  pushField(out, 'loginEmail', t.loginEmail, { weight: 5 });
  pushField(out, 'phone', t.phone, { weight: 2, digits: true, exactOnly: true });
  return out;
}

export function buildTeacherIndex(records: TeacherRecord[]): TeacherSearchEntry[] {
  return buildGenericIndex(records, extractTeacherFields);
}

export function searchTeachers(index: TeacherSearchEntry[], query: string) {
  return searchEntries(index, query);
}

export function teacherDidYouMean(index: TeacherSearchEntry[], query: string, limit = 3) {
  return genericDidYouMean(index, query, limit);
}

/* ─── Misc ────────────────────────────────────────────────────────────── */

export function newTeacherStringId(): string {
  return generateTeacherStringId();
}

export function campusLabel(id: string, locale: Locale): string {
  const c = CAMPUSES.find((x) => x.id === id);
  return c ? (locale === 'ar' ? c.name : c.nameEn) : '—';
}

export function subjectLabel(subject: string, locale: Locale): string {
  return locale === 'ar' ? subject : SUBJECTS_EN.get(subject) ?? subject;
}
