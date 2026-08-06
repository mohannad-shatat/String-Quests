/**
 * The "other members" record — one shape covering Lead Teacher, Supervisor,
 * Campus Owner, Topic Manager and IT Manager.
 *
 * One record type rather than five: they differ only in *scope* (which
 * campuses, subjects or grades they cover), and five near-identical files
 * would drift. `type` selects which scope fields the form asks for; see
 * SCOPE_FIELDS below.
 *
 * Parents are NOT here. They're derived from student guardians — see
 * parentDirectory.ts — because a parent record with no student is meaningless.
 *
 * Nothing in this file grants or checks permissions. It's labelling and dates.
 */

import type { Gender } from '../students/studentTypes';
import type { MemberTypeId } from '../people/memberTypes';

/** The five types that get an authored record. */
export type AuthoredMemberTypeId = Exclude<
  MemberTypeId,
  'student' | 'teacher' | 'parent'
>;

export type EmploymentType = 'full-time' | 'part-time' | 'visiting' | '';

export interface MemberRecord {
  id: string;
  /** Permanent, system-issued. Same rules as a student's String ID. */
  stringId: string;
  type: AuthoredMemberTypeId;

  // ─── Identity ───
  name: string;
  nameEn: string;
  photoDataUrl: string;
  gender: Gender;
  nationality: string;
  nationalId: string;

  // ─── Role & Scope ───
  /**
   * Lead Teacher only: the teacher being promoted. Identity and contact are
   * read from that teacher rather than retyped, so one person isn't entered
   * twice under two names.
   */
  sourceTeacherId: string;
  /** Campuses this member's authority covers. Campus Owner takes exactly one. */
  campusIds: string[];
  subjects: string[];
  grades: number[];
  /**
   * Lead Teacher only, and required. The grant is temporary by definition, so
   * an open-ended one shouldn't be expressible.
   */
  termStart: string;
  termEnd: string;

  // ─── Employment & About ───
  employeeId: string;
  hireDate: string;
  employmentType: EmploymentType;
  yearsOfExperience: string;
  bio: string;

  // ─── Contact ───
  email: string;
  phone: string;
  address: string;

  // ─── Login ───
  loginEmail: string;
  password: string;

  // ─── Meta ───
  createdAt: number;
  updatedAt: number;
  isLocal: boolean;
}

export function emptyMember(type: AuthoredMemberTypeId = 'supervisor'): MemberRecord {
  return {
    id: '',
    stringId: '',
    type,
    name: '',
    nameEn: '',
    photoDataUrl: '',
    gender: '',
    nationality: 'JO',
    nationalId: '',
    sourceTeacherId: '',
    campusIds: [],
    subjects: [],
    grades: [],
    termStart: '',
    termEnd: '',
    employeeId: '',
    hireDate: '',
    employmentType: '',
    yearsOfExperience: '',
    bio: '',
    email: '',
    phone: '',
    address: '',
    loginEmail: '',
    password: '',
    createdAt: 0,
    updatedAt: 0,
    isLocal: true,
  };
}

/* ─── Per-type scope ──────────────────────────────────────────────────── */

export interface ScopeSpec {
  /** Lead Teacher is a promotion — it starts from an existing teacher. */
  sourceTeacher: boolean;
  campuses: 'one' | 'many' | 'none';
  subjects: boolean;
  grades: boolean;
  term: boolean;
}

export const SCOPE_FIELDS: Record<AuthoredMemberTypeId, ScopeSpec> = {
  lead_teacher: { sourceTeacher: true, campuses: 'one', subjects: false, grades: false, term: true },
  supervisor: { sourceTeacher: false, campuses: 'many', subjects: true, grades: false, term: false },
  campus_owner: { sourceTeacher: false, campuses: 'one', subjects: false, grades: false, term: false },
  topic_manager: { sourceTeacher: false, campuses: 'none', subjects: true, grades: true, term: false },
  // Deliberately empty: an IT manager's authority isn't scoped to a campus or
  // a subject. The form says so rather than leaving a blank the user has to
  // interpret.
  it_manager: { sourceTeacher: false, campuses: 'none', subjects: false, grades: false, term: false },
};

export function scopeOf(type: AuthoredMemberTypeId): ScopeSpec {
  return SCOPE_FIELDS[type];
}

/* ─── Term ────────────────────────────────────────────────────────────── */

/**
 * Days until the grant lapses. Negative once it has. `null` for types that
 * don't carry a term.
 *
 * `today` is injected so callers can pass one stable value per render rather
 * than each row minting its own Date.
 */
export function daysRemaining(record: MemberRecord, today: Date): number | null {
  if (!scopeOf(record.type).term || !record.termEnd) return null;
  const end = new Date(`${record.termEnd}T23:59:59`);
  if (Number.isNaN(end.getTime())) return null;
  return Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
}

export function isExpired(record: MemberRecord, today: Date): boolean {
  const d = daysRemaining(record, today);
  return d !== null && d < 0;
}

/* ─── Sections ────────────────────────────────────────────────────────── */

export type MemberSectionId =
  | 'mem-section-identity'
  | 'mem-section-scope'
  | 'mem-section-employment'
  | 'mem-section-contact'
  | 'mem-section-credentials';

export const MEMBER_SECTION_IDS: MemberSectionId[] = [
  'mem-section-identity',
  'mem-section-scope',
  'mem-section-employment',
  'mem-section-contact',
  'mem-section-credentials',
];

/* ─── Validation ──────────────────────────────────────────────────────── */

export type MemberErrorKey =
  | 'name'
  | 'gender'
  | 'sourceTeacherId'
  | 'campusIds'
  | 'subjects'
  | 'termEnd'
  | 'email'
  | 'phone'
  | 'loginEmail'
  | 'password';

export type MemberErrors = Partial<Record<MemberErrorKey, string>>;

export const MEMBER_FIELD_SECTION: Record<MemberErrorKey, MemberSectionId> = {
  name: 'mem-section-identity',
  gender: 'mem-section-identity',
  sourceTeacherId: 'mem-section-scope',
  campusIds: 'mem-section-scope',
  subjects: 'mem-section-scope',
  termEnd: 'mem-section-scope',
  email: 'mem-section-contact',
  phone: 'mem-section-contact',
  loginEmail: 'mem-section-credentials',
  password: 'mem-section-credentials',
};

export const MEMBER_ERROR_ORDER: MemberErrorKey[] = [
  'name', 'gender', 'sourceTeacherId', 'campusIds', 'subjects', 'termEnd',
  'email', 'phone', 'loginEmail', 'password',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function digitsOnly(input: string): string {
  return input.replace(/\D+/g, '');
}

export function validateMember(m: MemberRecord, isAr: boolean): MemberErrors {
  const e: MemberErrors = {};
  const req = isAr ? 'هذا الحقل مطلوب' : 'This field is required';
  const scope = scopeOf(m.type);

  if (!m.name.trim()) e.name = req;
  if (!m.gender) e.gender = req;

  if (scope.sourceTeacher && !m.sourceTeacherId) e.sourceTeacherId = req;
  if (scope.campuses !== 'none' && m.campusIds.length === 0) e.campusIds = req;
  if (scope.subjects && m.subjects.length === 0) e.subjects = req;

  if (scope.term) {
    if (!m.termEnd) {
      e.termEnd = req;
    } else if (m.termStart && m.termEnd < m.termStart) {
      e.termEnd = isAr ? 'تاريخ الانتهاء قبل البداية' : 'End date is before the start';
    }
  }

  if (m.email.trim() && !EMAIL_RE.test(m.email.trim())) {
    e.email = isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email address';
  }
  if (m.phone.trim() && digitsOnly(m.phone).length < 7) {
    e.phone = isAr ? 'رقم هاتف غير صالح' : 'Invalid phone number';
  }

  if (!m.loginEmail.trim()) {
    e.loginEmail = req;
  } else if (!EMAIL_RE.test(m.loginEmail.trim())) {
    e.loginEmail = isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email address';
  }

  if (!m.password) {
    e.password = req;
  } else if (m.password.length < 8) {
    e.password = isAr ? '٨ أحرف على الأقل' : 'At least 8 characters';
  }

  return e;
}

export type SectionStatus = boolean | 'optional';

export function memberSectionCompletion(m: MemberRecord): Record<MemberSectionId, SectionStatus> {
  const scope = scopeOf(m.type);
  const employmentTouched = !!(
    m.employeeId.trim() || m.hireDate || m.employmentType || m.yearsOfExperience.trim() || m.bio.trim()
  );
  const contactTouched = !!(m.email.trim() || m.phone.trim() || m.address.trim());

  // An IT manager has no scope to fill in, so the section is complete on
  // arrival rather than permanently half-empty.
  const scopeDone =
    (!scope.sourceTeacher || !!m.sourceTeacherId) &&
    (scope.campuses === 'none' || m.campusIds.length > 0) &&
    (!scope.subjects || m.subjects.length > 0) &&
    (!scope.term || !!m.termEnd);

  return {
    'mem-section-identity': !!(m.name.trim() && m.gender),
    'mem-section-scope': scopeDone,
    'mem-section-employment': employmentTouched ? true : 'optional',
    'mem-section-contact': contactTouched ? true : 'optional',
    'mem-section-credentials': !!(m.loginEmail.trim() && m.password.length >= 8),
  };
}

function requiredChecks(m: MemberRecord): boolean[] {
  const scope = scopeOf(m.type);
  const checks = [
    !!m.name.trim(),
    !!m.gender,
    !!m.loginEmail.trim(),
    m.password.length >= 8,
  ];
  if (scope.sourceTeacher) checks.push(!!m.sourceTeacherId);
  if (scope.campuses !== 'none') checks.push(m.campusIds.length > 0);
  if (scope.subjects) checks.push(m.subjects.length > 0);
  if (scope.term) checks.push(!!m.termEnd);
  return checks;
}

export function memberProgress(m: MemberRecord): { done: number; total: number } {
  const checks = requiredChecks(m);
  return { done: checks.filter(Boolean).length, total: checks.length };
}

/** The String ID is issued only once the record is a real one. */
export function memberReadyForId(m: MemberRecord): boolean {
  return requiredChecks(m).every(Boolean);
}

const ARRAY_KEYS: (keyof MemberRecord)[] = ['campusIds', 'subjects', 'grades'];

export function isMemberDirty(a: MemberRecord, b: MemberRecord): boolean {
  const keys = Object.keys(emptyMember()) as (keyof MemberRecord)[];
  return keys.some((k) => {
    if (k === 'createdAt' || k === 'updatedAt') return false;
    // Arrays compare by value, or editing then undoing leaves it "dirty".
    if (ARRAY_KEYS.includes(k)) return JSON.stringify(a[k]) !== JSON.stringify(b[k]);
    return a[k] !== b[k];
  });
}
