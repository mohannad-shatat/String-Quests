/**
 * One index across every kind of person, so /people is genuinely global — a
 * name, a String ID, a subject, an employee number or a *guardian's* phone all
 * resolve from the same box, and the same rows can be sorted, filtered and
 * acted on in bulk.
 *
 * Built on the shared engine in components/directory/directorySearch.ts, the
 * same one the student and teacher rosters use. Ranking, typo tolerance and
 * Arabic normalisation come for free; this file only says what exists for each
 * type and what it's worth.
 *
 * Records are read from the same sources the rosters write to, so a student
 * created on /students shows up here without a refresh path of its own.
 */

import { CAMPUSES } from '../../data/mockAttendanceData';
import { GRADES } from '../../data/adminData';
import { SEED_MEMBERS } from '../../data/seedMembers';
import { loadStudents } from '../../utils/studentStorage';
import { loadTeachers } from '../../utils/teacherStorage';
import { loadMembers } from '../../utils/memberStorage';
import { seededStudents } from '../students/seedStudents';
import { fromSeedTeacher, SUBJECTS, subjectLabel } from '../teachers/teacherFilters';
import { EXTENDED_TEACHERS } from '../../data/mockAttendanceData';
import { buildParents } from '../members/parentDirectory';
import { scopeOf, type MemberRecord } from '../members/memberRecordTypes';
import {
  buildSearchIndex,
  didYouMean as genericDidYouMean,
  pushField,
  searchEntries,
  type IndexedField,
  type SearchEntry,
} from '../directory/directorySearch';
import { MEMBER_TYPES, typeLabelKey, type MemberTypeId } from './memberTypes';
import { joinList, type Locale } from '../directory/directoryI18n';

export interface DirectoryEntry {
  id: string;
  type: MemberTypeId;
  name: string;
  nameEn: string;
  stringId: string;
  campusId: string;
  /** Students; parents inherit their children's. */
  grade: number | null;
  section: string;
  /** Teachers, supervisors, topic managers. */
  subject: string;
  gender: string;
  nationality: string;
  employment: string;
  loginEmail: string;
  phone: string;
  password: string;
  photoDataUrl: string;
  /** The type-specific column: subject, section, scope, or children. */
  detail: string;
  /** Where opening this person goes. */
  route: string;
  /** False for demo records — they can't be deleted or given a new password. */
  isLocal: boolean;
  /** Parents: computed from a student, so not editable here. */
  derived: boolean;
  /** Extra searchable text (guardians, children, employee id). */
  aliases: { field: string; value: string; weight: number; digits?: boolean }[];
  /** Grades across a parent's children, so "grade 5" finds their parent too. */
  grades: number[];
}

/* ─── Build ───────────────────────────────────────────────────────────── */

function memberDetail(m: MemberRecord, locale: Locale): string {
  const scope = scopeOf(m.type);
  const parts: string[] = [];
  if (scope.campuses !== 'none') {
    parts.push(joinList(m.campusIds.map((id) => campusName(id, locale)), locale));
  }
  if (scope.subjects) parts.push(joinList(m.subjects.map((s) => subjectLabel(s, locale)), locale));
  if (scope.grades && m.grades.length) parts.push(`${m.grades[0]}–${m.grades[m.grades.length - 1]}`);
  return parts.filter(Boolean).join(' · ');
}

/**
 * Merges seeded demo data with locally-created records, local winning on id
 * collision — the same rule each roster page applies.
 */
function gradeLabel(grade: number | null, locale: Locale): string {
  if (grade === null) return '';
  return locale === 'ar' ? `الصف ${grade}` : `Grade ${grade}`;
}

export function buildDirectory(locale: Locale): DirectoryEntry[] {
  const localStudents = loadStudents();
  const localTeachers = loadTeachers();
  const localMembers = loadMembers();

  const localStudentIds = new Set(localStudents.map((s) => s.id));
  const localTeacherIds = new Set(localTeachers.map((s) => s.id));
  const localMemberIds = new Set(localMembers.map((s) => s.id));

  const students = [
    ...localStudents,
    ...seededStudents().filter((s) => !localStudentIds.has(s.id)),
  ];
  const teachers = [
    ...localTeachers,
    ...EXTENDED_TEACHERS.map(fromSeedTeacher).filter((t) => !localTeacherIds.has(t.id)),
  ];
  const members = [
    ...localMembers,
    ...SEED_MEMBERS.filter((m) => !localMemberIds.has(m.id)),
  ];

  const out: DirectoryEntry[] = [];

  for (const s of students) {
    const guardians = s.guardians ?? [];
    out.push({
      id: s.id,
      type: 'student',
      name: s.name,
      nameEn: s.nameEn,
      stringId: s.studentId,
      campusId: s.campusId,
      grade: s.grade,
      section: s.section,
      subject: '',
      gender: s.gender,
      nationality: s.nationality,
      employment: '',
      loginEmail: s.loginEmail,
      phone: s.phone || guardians[0]?.phone || '',
      password: s.password,
      photoDataUrl: s.photoDataUrl,
      detail: [gradeLabel(s.grade, locale), s.section].filter(Boolean).join(' · '),
      route: `/students?student=${s.id}`,
      isLocal: s.isLocal,
      derived: false,
      // A guardian's name or number is often all staff have to go on.
      aliases: [
        { field: 'nationalId', value: s.nationalId, weight: 3, digits: true },
        ...guardians.flatMap((g) => [
          { field: 'guardianName', value: g.name, weight: 7 },
          { field: 'guardianPhone', value: g.phone, weight: 2, digits: true },
        ]),
      ],
      grades: s.grade !== null ? [s.grade] : [],
    });
  }

  for (const t of teachers) {
    out.push({
      id: t.id,
      type: 'teacher',
      name: t.name,
      nameEn: t.nameEn,
      stringId: t.stringId,
      campusId: t.campusId,
      grade: null,
      section: t.sections[0] ?? '',
      subject: t.subject,
      gender: t.gender,
      nationality: t.nationality,
      employment: t.employmentType,
      loginEmail: t.loginEmail,
      phone: t.phone,
      password: t.password,
      photoDataUrl: t.photoDataUrl,
      detail: subjectLabel(t.subject, locale),
      route: `/teachers?teacher=${t.id}`,
      isLocal: t.isLocal,
      derived: false,
      aliases: [
        { field: 'employeeId', value: t.employeeId, weight: 4 },
        { field: 'nationalId', value: t.nationalId, weight: 3, digits: true },
      ],
      grades: t.grades,
    });
  }

  for (const m of members) {
    out.push({
      id: m.id,
      type: m.type,
      name: m.name,
      nameEn: m.nameEn,
      stringId: m.stringId,
      campusId: m.campusIds[0] ?? '',
      grade: null,
      section: '',
      subject: m.subjects[0] ?? '',
      gender: m.gender,
      nationality: m.nationality,
      employment: m.employmentType,
      loginEmail: m.loginEmail,
      phone: m.phone,
      password: m.password,
      photoDataUrl: m.photoDataUrl,
      detail: memberDetail(m, locale),
      route: `/members?member=${m.id}`,
      isLocal: m.isLocal,
      derived: false,
      aliases: [
        { field: 'employeeId', value: m.employeeId, weight: 4 },
        { field: 'nationalId', value: m.nationalId, weight: 3, digits: true },
      ],
      grades: m.grades,
    });
  }

  // Parents come last: they're folded out of the students above, so they can't
  // be built until every student is known.
  for (const p of buildParents(students)) {
    const first = p.children[0];
    out.push({
      id: p.id,
      type: 'parent',
      name: p.name,
      nameEn: p.name,
      stringId: '',
      campusId: p.campusId,
      grade: first?.grade ?? null,
      section: first?.section ?? '',
      subject: '',
      // Guardians carry no gender field, but the relation says it outright.
      gender: p.relation === 'father' ? 'male' : p.relation === 'mother' ? 'female' : '',
      nationality: '',
      employment: '',
      loginEmail: p.email,
      phone: p.phone,
      password: '',
      photoDataUrl: '',
      detail:
        joinList(
          p.children.slice(0, 2).map((c) => (locale === 'ar' ? c.name : c.nameEn || c.name)),
          locale,
        ) + (p.children.length > 2 ? ` +${p.children.length - 2}` : ''),
      // Editing a parent means editing the student's Family section.
      route: `/students?student=${p.primaryStudentId}`,
      isLocal: false,
      derived: true,
      aliases: [
        { field: 'nationalId', value: p.nationalId, weight: 3, digits: true },
        ...p.children.map((c) => ({ field: 'childName', value: c.name, weight: 6 })),
      ],
      grades: p.children.map((c) => c.grade).filter((g): g is number => g !== null),
    });
  }

  return out;
}

/* ─── Search ──────────────────────────────────────────────────────────── */

function extractFields(e: DirectoryEntry): IndexedField[] {
  const out: IndexedField[] = [];
  // Parents rank a shade below everyone else on an equally good name match.
  // Weight only breaks ties *within* a match tier — an exact-prefix parent
  // still beats a mid-word student — but when two people match the same way,
  // the one staff came here to find is almost never the parent.
  const nameWeight = e.type === 'parent' ? 8 : 10;
  pushField(out, 'name', e.name, { weight: nameWeight, suggestable: true });
  pushField(out, 'nameEn', e.nameEn, { weight: nameWeight - 1, suggestable: true });
  pushField(out, 'stringId', e.stringId, { weight: 8 });
  pushField(out, 'subject', e.subject, { weight: 6 });
  pushField(out, 'loginEmail', e.loginEmail, { weight: 5 });
  pushField(out, 'section', e.section, { weight: 4 });
  pushField(out, 'phone', e.phone, { weight: 2, digits: true, exactOnly: true });
  for (const a of e.aliases) {
    pushField(out, a.field, a.value, {
      weight: a.weight,
      digits: a.digits,
      // A typo'd number isn't a near-miss; a typo'd name is.
      exactOnly: a.digits,
    });
  }
  return out;
}

export type DirectoryIndex = SearchEntry<DirectoryEntry>[];

export function buildDirectoryIndex(entries: DirectoryEntry[]): DirectoryIndex {
  return buildSearchIndex(entries, extractFields);
}

export function searchDirectory(index: DirectoryIndex, query: string) {
  return searchEntries(index, query);
}

export function directoryDidYouMean(index: DirectoryIndex, query: string, limit = 3) {
  return genericDidYouMean(index, query, limit);
}

/* ─── Filters ─────────────────────────────────────────────────────────── */

export type HubFilterField =
  | 'type'
  | 'campus'
  | 'grade'
  | 'section'
  | 'subject'
  | 'gender'
  | 'nationality'
  | 'employment';

export type HubFilterState = Partial<Record<HubFilterField, string[]>>;

export const HUB_FILTER_FIELDS: HubFilterField[] = [
  'type', 'campus', 'grade', 'section', 'subject', 'gender', 'nationality', 'employment',
];

/**
 * Which kinds of person a field can describe at all. Selecting "Grade 5"
 * therefore scopes the roster to students and their parents — not because it
 * silently drops teachers, but because a teacher has no grade. The pill says
 * so; see `filterScopeNote`.
 */
export const FIELD_APPLIES_TO: Record<HubFilterField, MemberTypeId[]> = {
  type: MEMBER_TYPES.map((m) => m.id),
  campus: ['student', 'teacher', 'lead_teacher', 'supervisor', 'campus_owner', 'parent'],
  grade: ['student', 'teacher', 'topic_manager', 'parent'],
  section: ['student', 'teacher', 'parent'],
  subject: ['teacher', 'supervisor', 'topic_manager'],
  gender: ['student', 'teacher', 'lead_teacher', 'supervisor', 'campus_owner', 'topic_manager', 'it_manager', 'parent'],
  nationality: ['student', 'teacher', 'lead_teacher', 'supervisor', 'campus_owner', 'topic_manager', 'it_manager'],
  employment: ['teacher', 'lead_teacher', 'supervisor', 'campus_owner', 'topic_manager', 'it_manager'],
};

export function hubFieldLabelKey(field: HubFilterField): string {
  return `filter.${field}`;
}

function matches(e: DirectoryEntry, field: HubFilterField, values: string[]): boolean {
  switch (field) {
    case 'type': return values.includes(e.type);
    case 'campus': return values.includes(e.campusId);
    // Many-to-many: a teacher teaching grade 5, a parent with a child in it.
    case 'grade': return e.grades.some((g) => values.includes(String(g)));
    case 'section': return !!e.section && values.includes(e.section);
    case 'subject': return !!e.subject && values.includes(e.subject);
    case 'gender': return !!e.gender && values.includes(e.gender);
    case 'nationality': return !!e.nationality && values.includes(e.nationality);
    case 'employment': return !!e.employment && values.includes(e.employment);
  }
}

export function activeHubFields(filters: HubFilterState): HubFilterField[] {
  return HUB_FILTER_FIELDS.filter((f) => (filters[f]?.length ?? 0) > 0);
}

export function countActiveHubFilters(filters: HubFilterState): number {
  return activeHubFields(filters).reduce((n, f) => n + (filters[f]?.length ?? 0), 0);
}

export function applyHubFilters(
  entries: DirectoryEntry[],
  filters: HubFilterState,
  exclude?: HubFilterField,
): DirectoryEntry[] {
  const fields = activeHubFields(filters).filter((f) => f !== exclude);
  if (fields.length === 0) return entries;
  return entries.filter((e) => fields.every((f) => matches(e, f, filters[f] as string[])));
}

/** Counts for a field, computed against the *other* active filters. */
export function hubFacetCounts(
  entries: DirectoryEntry[],
  filters: HubFilterState,
  field: HubFilterField,
): Record<string, number> {
  const base = applyHubFilters(entries, filters, field);
  const counts: Record<string, number> = {};

  for (const e of base) {
    if (field === 'grade') {
      for (const g of e.grades) counts[String(g)] = (counts[String(g)] ?? 0) + 1;
      continue;
    }
    const key =
      field === 'type' ? e.type
        : field === 'campus' ? e.campusId
          : field === 'section' ? e.section
            : field === 'subject' ? e.subject
              : field === 'gender' ? e.gender
                : field === 'nationality' ? e.nationality
                  : e.employment;
    if (key) counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

/**
 * "Students, Teachers and Parents only" — shown for a filter whose field
 * describes just a few kinds of person, so nobody wonders where the rest went.
 *
 * Deliberately silent for fields that cover most types: saying campus applies
 * to six of eight is noise, and a note nobody reads is worse than none.
 */
export function filterScopeNote(
  field: HubFilterField,
  locale: Locale,
  t: (key: string) => string,
): string | null {
  const applies = FIELD_APPLIES_TO[field];
  if (applies.length * 2 > MEMBER_TYPES.length) return null;
  return joinList(applies.map((id) => t(typeLabelKey(id))), locale);
}

/* ─── Options ─────────────────────────────────────────────────────────── */

export interface FilterOption {
  value: string;
  label: string;
}

const NATIONALITY_LABELS: Record<Locale, Record<string, string>> = {
  ar: {
    JO: 'الأردن', PS: 'فلسطين', SA: 'السعودية', EG: 'مصر', SY: 'سوريا',
    IQ: 'العراق', LB: 'لبنان', AE: 'الإمارات', KW: 'الكويت',
  },
  en: {
    JO: 'Jordan', PS: 'Palestine', SA: 'Saudi Arabia', EG: 'Egypt', SY: 'Syria',
    IQ: 'Iraq', LB: 'Lebanon', AE: 'UAE', KW: 'Kuwait',
  },
};

/** Sections in use, derived rather than hardcoded — campuses differ. */
function sectionOptions(entries: DirectoryEntry[]): FilterOption[] {
  const set = new Set(entries.map((e) => e.section).filter(Boolean));
  return Array.from(set).sort().map((s) => ({ value: s, label: s }));
}

export function hubFieldOptions(
  field: HubFilterField,
  locale: Locale,
  t: (key: string) => string,
  entries: DirectoryEntry[],
): FilterOption[] {
  switch (field) {
    case 'type':
      return MEMBER_TYPES.map((m) => ({ value: m.id, label: t(typeLabelKey(m.id)) }));
    case 'campus':
      return CAMPUSES.map((c) => ({ value: c.id, label: locale === 'ar' ? c.name : c.nameEn }));
    case 'grade':
      return GRADES.map((g) => ({
        value: String(g),
        label: locale === 'ar' ? `الصف ${g}` : `Grade ${g}`,
      }));
    case 'section':
      return sectionOptions(entries);
    case 'subject':
      return SUBJECTS.map((s) => ({ value: s, label: subjectLabel(s, locale) }));
    case 'gender':
      return [
        { value: 'male', label: locale === 'ar' ? 'ذكر' : 'Male' },
        { value: 'female', label: locale === 'ar' ? 'أنثى' : 'Female' },
      ];
    case 'nationality':
      return Object.entries(NATIONALITY_LABELS[locale]).map(([value, label]) => ({ value, label }));
    case 'employment':
      return (['full-time', 'part-time', 'visiting'] as const).map((v) => ({
        value: v,
        label: t(`emp.${v}`),
      }));
  }
}

/* ─── URL ─────────────────────────────────────────────────────────────── */

export function hubFiltersToParams(filters: HubFilterState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of activeHubFields(filters)) out[f] = (filters[f] as string[]).join(',');
  return out;
}

export function hubFiltersFromParams(params: URLSearchParams): HubFilterState {
  const out: HubFilterState = {};
  for (const f of HUB_FILTER_FIELDS) {
    const raw = params.get(f);
    if (!raw) continue;
    const values = raw.split(',').map((v) => v.trim()).filter(Boolean);
    if (values.length > 0) out[f] = values;
  }
  return out;
}

/* ─── Labels ──────────────────────────────────────────────────────────── */

export function campusName(id: string, locale: Locale): string {
  const c = CAMPUSES.find((x) => x.id === id);
  return c ? (locale === 'ar' ? c.name : c.nameEn) : '—';
}

export function nationalityLabel(code: string, locale: Locale): string {
  return NATIONALITY_LABELS[locale][code] ?? code;
}
