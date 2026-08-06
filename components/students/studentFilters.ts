/**
 * Roster filters — model, predicates, facet counts, URL round-trip.
 *
 * Semantics, stated once and surfaced in the UI so results are never
 * surprising: **within a field, values OR together; across fields, they AND**.
 * Grade 3 or 4, AND section A.
 *
 * Facet counts are computed against the *other* active filters, so a value
 * showing "0" is genuinely unreachable and one showing "12" really yields 12.
 * That's what stops the "the filter is broken" complaint.
 */

import { EXTENDED_TEACHERS } from '../../data/mockAttendanceData';
import { CAMPUS_OPTIONS, GENDER_OPTIONS, NATIONALITY_OPTIONS, SECTION_OPTIONS, STUDY_FOCUS_OPTIONS, STUDY_SYSTEM_OPTIONS, GRADE_OPTIONS, label as optLabel } from './studentOptions';
import type { Locale } from './studentsI18n';
import type { StudentRecord } from './studentTypes';

export type FilterField =
  | 'grade'
  | 'section'
  | 'campus'
  | 'gender'
  | 'teacher'
  | 'nationality'
  | 'studySystem'
  | 'studyFocus'
  | 'guardian'
  | 'source';

/** Active filters: field → selected values. Absent or empty = inactive. */
export type FilterState = Partial<Record<FilterField, string[]>>;

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterFieldDef {
  field: FilterField;
  /** i18n key for the field's display name. */
  labelKey: string;
  /** Values available for this field, already localized. */
  options: (locale: Locale) => FilterOption[];
  /** Does this student match the given selected values? */
  matches: (student: StudentRecord, values: string[]) => boolean;
}

/* ─── Teacher join ────────────────────────────────────────────────────── */

/**
 * Teachers aren't stored on students. The join that *does* hold in the mock
 * data is campus + grade: a teacher's `spaces` span every section of their
 * campus for the grades they teach.
 *
 * Note this is campus+grade precision, not per-section. A space-id join would
 * look more precise but silently match nothing — teacher spaces are built as
 * `space-${grade}${section}-${subject}` while student spaces are
 * `space-c1-${grade}${section}-${subject}`, so the strings never line up.
 */
export function teacherTeachesStudent(
  teacher: (typeof EXTENDED_TEACHERS)[number],
  student: StudentRecord,
): boolean {
  if (student.grade === null) return false;
  return teacher.campusId === student.campusId && teacher.grades.includes(student.grade);
}

/* ─── Field definitions ───────────────────────────────────────────────── */

const toOptions = (opts: { value: string; labelAr: string; labelEn: string }[], locale: Locale) =>
  opts.map((o) => ({ value: o.value, label: optLabel(o, locale) }));

export const FILTER_FIELDS: FilterFieldDef[] = [
  {
    field: 'grade',
    labelKey: 'f.grade',
    options: (locale) => toOptions(GRADE_OPTIONS, locale),
    matches: (s, v) => s.grade !== null && v.includes(String(s.grade)),
  },
  {
    field: 'section',
    labelKey: 'f.section',
    options: (locale) => toOptions(SECTION_OPTIONS, locale),
    matches: (s, v) => v.includes(s.section),
  },
  {
    field: 'campus',
    labelKey: 'f.campus',
    options: (locale) => toOptions(CAMPUS_OPTIONS, locale),
    matches: (s, v) => v.includes(s.campusId),
  },
  {
    field: 'gender',
    labelKey: 'f.gender',
    options: (locale) => toOptions(GENDER_OPTIONS, locale),
    matches: (s, v) => v.includes(s.gender),
  },
  {
    field: 'teacher',
    labelKey: 'filter.teacher',
    options: (locale) =>
      EXTENDED_TEACHERS.map((t) => ({
        value: t.id,
        label: `${locale === 'ar' ? t.name : t.nameEn} · ${locale === 'ar' ? t.subject : t.subjectEn}`,
      })),
    matches: (s, v) =>
      v.some((id) => {
        const teacher = EXTENDED_TEACHERS.find((t) => t.id === id);
        return teacher ? teacherTeachesStudent(teacher, s) : false;
      }),
  },
  {
    field: 'nationality',
    labelKey: 'f.nationality',
    options: (locale) => toOptions(NATIONALITY_OPTIONS, locale),
    matches: (s, v) => v.includes(s.nationality),
  },
  {
    field: 'studySystem',
    labelKey: 'f.studySystem',
    options: (locale) => toOptions(STUDY_SYSTEM_OPTIONS, locale),
    matches: (s, v) => v.includes(s.studySystem),
  },
  {
    field: 'studyFocus',
    labelKey: 'f.studyFocus',
    options: (locale) => toOptions(STUDY_FOCUS_OPTIONS, locale),
    matches: (s, v) => v.includes(s.studyFocus),
  },
  {
    // Derived, not stored — "who still needs a guardian on file?" is the
    // question staff actually ask, and it drives the roster health strip.
    field: 'guardian',
    labelKey: 'filter.guardian',
    options: () => [],
    matches: (s, v) => {
      const has = s.guardians.some((g) => g.name.trim() || g.phone.trim());
      return v.includes(has ? 'has' : 'missing');
    },
  },
  {
    field: 'source',
    labelKey: 'filter.source',
    options: () => [],
    matches: (s, v) => v.includes(s.isLocal ? 'local' : 'seeded'),
  },
];

/** Derived fields whose option labels need i18n at call time. */
export function derivedOptions(field: FilterField, t: (k: string) => string): FilterOption[] {
  if (field === 'guardian') {
    return [
      { value: 'has', label: t('filter.guardian.has') },
      { value: 'missing', label: t('filter.guardian.missing') },
    ];
  }
  if (field === 'source') {
    return [
      { value: 'local', label: t('filter.source.local') },
      { value: 'seeded', label: t('filter.source.seeded') },
    ];
  }
  return [];
}

export function fieldDef(field: FilterField): FilterFieldDef {
  const def = FILTER_FIELDS.find((f) => f.field === field);
  if (!def) throw new Error(`Unknown filter field: ${field}`);
  return def;
}

/* ─── Applying ────────────────────────────────────────────────────────── */

export function activeFields(filters: FilterState): FilterField[] {
  return (Object.keys(filters) as FilterField[]).filter((f) => (filters[f]?.length ?? 0) > 0);
}

export function countActive(filters: FilterState): number {
  return activeFields(filters).reduce((n, f) => n + (filters[f]?.length ?? 0), 0);
}

/** Applies every active filter. Excluding one field powers facet counting. */
export function applyFilters(
  students: StudentRecord[],
  filters: FilterState,
  exclude?: FilterField,
): StudentRecord[] {
  const fields = activeFields(filters).filter((f) => f !== exclude);
  if (fields.length === 0) return students;

  return students.filter((s) =>
    fields.every((f) => fieldDef(f).matches(s, filters[f] as string[])),
  );
}

/**
 * How many students each value of `field` would yield, given the other active
 * filters. Excluding the field itself is what makes multi-select feel right —
 * picking "Grade 3" shouldn't drop the counts for Grade 4 to zero.
 */
export function facetCounts(
  students: StudentRecord[],
  filters: FilterState,
  field: FilterField,
): Record<string, number> {
  const base = applyFilters(students, filters, field);
  const def = fieldDef(field);
  const counts: Record<string, number> = {};

  for (const s of base) {
    let key: string | null = null;
    switch (field) {
      case 'grade': key = s.grade === null ? null : String(s.grade); break;
      case 'section': key = s.section || null; break;
      case 'campus': key = s.campusId || null; break;
      case 'gender': key = s.gender || null; break;
      case 'nationality': key = s.nationality || null; break;
      case 'studySystem': key = s.studySystem || null; break;
      case 'studyFocus': key = s.studyFocus || null; break;
      case 'guardian':
        key = s.guardians.some((g) => g.name.trim() || g.phone.trim()) ? 'has' : 'missing';
        break;
      case 'source': key = s.isLocal ? 'local' : 'seeded'; break;
      case 'teacher': {
        // One student maps to many teachers, so this counts per teacher.
        for (const t of EXTENDED_TEACHERS) {
          if (teacherTeachesStudent(t, s)) counts[t.id] = (counts[t.id] ?? 0) + 1;
        }
        continue;
      }
    }
    if (key !== null) counts[key] = (counts[key] ?? 0) + 1;
  }

  void def;
  return counts;
}

export function toggleValue(filters: FilterState, field: FilterField, value: string): FilterState {
  const current = filters[field] ?? [];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  const out = { ...filters };
  if (next.length === 0) delete out[field];
  else out[field] = next;
  return out;
}

export function clearField(filters: FilterState, field: FilterField): FilterState {
  const out = { ...filters };
  delete out[field];
  return out;
}

/* ─── URL round-trip ──────────────────────────────────────────────────── */

/**
 * Filters live in the query string so a filtered roster is a shareable link
 * and survives a refresh. Values are comma-joined; commas don't occur in any
 * of our option values (ids, codes, single letters, numbers).
 */
export function filtersToParams(filters: FilterState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of activeFields(filters)) {
    out[field] = (filters[field] as string[]).join(',');
  }
  return out;
}

export function filtersFromParams(params: URLSearchParams): FilterState {
  const out: FilterState = {};
  for (const def of FILTER_FIELDS) {
    const raw = params.get(def.field);
    if (!raw) continue;
    const values = raw.split(',').map((v) => v.trim()).filter(Boolean);
    if (values.length > 0) out[def.field] = values;
  }
  return out;
}

/* ─── Saved views ─────────────────────────────────────────────────────── */

const VIEWS_KEY = 'string-quests-student-views';

export interface SavedView {
  id: string;
  name: string;
  filters: FilterState;
  sortKey: string;
  sortDir: 'asc' | 'desc';
}

export function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveView(view: SavedView): SavedView[] {
  const views = loadViews().filter((v) => v.id !== view.id);
  views.push(view);
  try {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  } catch {
    /* quota — views are a convenience */
  }
  return views;
}

export function deleteView(id: string): SavedView[] {
  const views = loadViews().filter((v) => v.id !== id);
  try {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  } catch {
    /* ignore */
  }
  return views;
}
