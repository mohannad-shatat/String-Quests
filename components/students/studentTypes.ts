/**
 * Student Manager — record shape, empty factory, validation, dirty check.
 *
 * `StudentRecord` is a superset of `ExtendedStudent` (types/admin.ts): the
 * roster reads both locally-created records and the seeded mock ones through
 * the same table, so the extra fields are all optional-at-rest and default to
 * empty strings rather than `undefined`. Empty string = "not provided", which
 * keeps controlled inputs controlled and JSON round-trips lossless.
 */

export type Gender = 'male' | 'female' | '';

export type ParentLinkMethod = 'manual' | 'qr';

export type GuardianRelation = 'mother' | 'father' | 'other';

/**
 * A guardian is a person, not a pair of fields. Modelling them as a list is
 * what lets a student have a mother *and* a father (and a grandmother, and a
 * legal guardian) instead of the old asymmetric guardianName/motherName pair.
 */
export interface Guardian {
  id: string;
  relation: GuardianRelation;
  /** Free text when relation === 'other' — e.g. uncle, grandmother. */
  relationLabel: string;
  name: string;
  phone: string;
  email: string;
  nationalId: string;
}

export function emptyGuardian(relation: GuardianRelation = 'father'): Guardian {
  return {
    id: `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    relation,
    relationLabel: '',
    name: '',
    phone: '',
    email: '',
    nationalId: '',
  };
}

/** True when a guardian entry carries no information at all. */
export function isGuardianEmpty(g: Guardian): boolean {
  return !(g.name.trim() || g.phone.trim() || g.email.trim() || g.nationalId.trim());
}

export interface StudentRecord {
  id: string;
  /** School-facing identifier, e.g. STU4K9F2X1. Distinct from `id`. */
  studentId: string;

  // ─── Identity ───
  name: string;        // Arabic full name (source of truth)
  nameEn: string;
  photoDataUrl: string; // '' = no photo
  gender: Gender;
  dateOfBirth: string;  // yyyy-mm-dd, the native <input type="date"> format
  nationality: string;  // ISO country code from countries.ts
  nationalId: string;

  // ─── Academic ───
  grade: number | null;
  section: string;
  campusId: string;
  studySystem: string;
  studyFocus: string;

  // ─── Contact ───
  email: string;
  phone: string;
  address: string;
  bio: string;

  // ─── Family ───
  guardians: Guardian[];
  /**
   * How the parent gets connected. 'manual' = staff typed the details;
   * 'qr' = the parent was handed the WhatsApp invite and will link
   * themselves, so the guardian fields stay empty by design.
   */
  parentLinkMethod: ParentLinkMethod;
  /** Shared across confirmed siblings. Empty until a family is confirmed. */
  familyId: string;

  // ─── Login credentials ───
  loginEmail: string;
  password: string;

  // ─── Meta ───
  createdAt: number;
  updatedAt: number;
  /** True for records created in this app (vs. seeded mock roster rows). */
  isLocal: boolean;
}

export function emptyStudent(): StudentRecord {
  return {
    id: '',
    studentId: '',
    name: '',
    nameEn: '',
    photoDataUrl: '',
    gender: '',
    dateOfBirth: '',
    nationality: 'JO',
    nationalId: '',
    grade: null,
    section: '',
    campusId: '',
    studySystem: '',
    studyFocus: '',
    email: '',
    phone: '',
    address: '',
    bio: '',
    guardians: [],
    parentLinkMethod: 'manual',
    familyId: '',
    loginEmail: '',
    password: '',
    createdAt: 0,
    updatedAt: 0,
    isLocal: true,
  };
}

/* ─── Sections ────────────────────────────────────────────────────────── */

export type SectionId =
  | 'stu-section-identity'
  | 'stu-section-academic'
  | 'stu-section-contact'
  | 'stu-section-family'
  | 'stu-section-credentials';

export const SECTION_IDS: SectionId[] = [
  'stu-section-identity',
  'stu-section-academic',
  'stu-section-contact',
  'stu-section-family',
  'stu-section-credentials',
];

/* ─── Validation ──────────────────────────────────────────────────────── */

/** Field keys that can carry a validation error. */
export type StudentErrorKey =
  | 'name'
  | 'gender'
  | 'dateOfBirth'
  | 'grade'
  | 'section'
  | 'email'
  | 'phone'
  | 'loginEmail'
  | 'password';

export type StudentErrors = Partial<Record<StudentErrorKey, string>>;

/** Which section each errorable field lives in — drives "jump to first error". */
export const FIELD_SECTION: Record<StudentErrorKey, SectionId> = {
  name: 'stu-section-identity',
  gender: 'stu-section-identity',
  dateOfBirth: 'stu-section-identity',
  grade: 'stu-section-academic',
  section: 'stu-section-academic',
  email: 'stu-section-contact',
  phone: 'stu-section-contact',
  loginEmail: 'stu-section-credentials',
  password: 'stu-section-credentials',
};

/** Order errors are reported in — matches visual top-to-bottom order. */
export const ERROR_ORDER: StudentErrorKey[] = [
  'name', 'gender', 'dateOfBirth',
  'grade', 'section',
  'email', 'phone',
  'loginEmail', 'password',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function digitsOnly(input: string): string {
  return input.replace(/\D+/g, '');
}

export interface ValidateOptions {
  /** Existing records, for the studentId-uniqueness check. */
  existing?: StudentRecord[];
  /** Record being edited — excluded from the uniqueness check. */
  selfId?: string;
}

export function validateStudent(
  s: StudentRecord,
  isAr: boolean,
  opts: ValidateOptions = {},
): StudentErrors {
  const e: StudentErrors = {};
  const req = isAr ? 'هذا الحقل مطلوب' : 'This field is required';

  if (!s.name.trim()) e.name = req;

  // No studentId rule: it is issued automatically once every other required
  // field is filled (see `readyForId`), so it is never the user's problem.

  if (!s.gender) e.gender = req;

  if (!s.dateOfBirth) {
    e.dateOfBirth = req;
  } else {
    // A DOB in the future is always a typo — the common one is picking the
    // current year in the native date picker.
    const dob = new Date(s.dateOfBirth);
    if (!Number.isNaN(dob.getTime()) && dob.getTime() > Date.now()) {
      e.dateOfBirth = isAr ? 'التاريخ في المستقبل' : 'Date is in the future';
    }
  }

  if (s.grade === null) e.grade = req;
  if (!s.section) e.section = req;

  if (s.email.trim() && !EMAIL_RE.test(s.email.trim())) {
    e.email = isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email address';
  }
  if (s.phone.trim() && digitsOnly(s.phone).length < 7) {
    e.phone = isAr ? 'رقم هاتف غير صالح' : 'Invalid phone number';
  }

  if (!s.loginEmail.trim()) {
    e.loginEmail = req;
  } else if (!EMAIL_RE.test(s.loginEmail.trim())) {
    e.loginEmail = isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email address';
  }

  if (!s.password) {
    e.password = req;
  } else if (s.password.length < 8) {
    e.password = isAr ? '٨ أحرف على الأقل' : 'At least 8 characters';
  }

  return e;
}

/**
 * Per-guardian validation. Kept separate from `validateStudent` because
 * guardians are a list — indexing them into the flat error map would mean
 * synthesising keys like `guardians[1].phone`, and every guardian field is
 * optional anyway, so these surface inline rather than blocking a save.
 */
export function validateGuardian(g: Guardian, isAr: boolean): { phone?: string; email?: string } {
  const out: { phone?: string; email?: string } = {};
  if (g.phone.trim() && digitsOnly(g.phone).length < 7) {
    out.phone = isAr ? 'رقم هاتف غير صالح' : 'Invalid phone number';
  }
  if (g.email.trim() && !EMAIL_RE.test(g.email.trim())) {
    out.email = isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email address';
  }
  return out;
}

/* ─── Section completion (drives the anchoring rail) ──────────────────── */

export type SectionStatus = boolean | 'optional';

/**
 * A section is `complete` once its required fields are filled; sections with
 * no required fields report 'optional' until touched, then true. The rail
 * renders these three states directly.
 */
export function sectionCompletion(s: StudentRecord): Record<SectionId, SectionStatus> {
  const contactTouched = !!(s.email.trim() || s.phone.trim() || s.address.trim() || s.bio.trim());
  // The QR route is a complete answer to "how does the parent get linked?",
  // so choosing it counts as done even with every guardian field empty.
  const familyTouched =
    s.parentLinkMethod === 'qr' ||
    !!s.familyId ||
    s.guardians.some((g) => !isGuardianEmpty(g));

  return {
    'stu-section-identity': !!(s.name.trim() && s.gender && s.dateOfBirth),
    'stu-section-academic': !!(s.grade !== null && s.section),
    'stu-section-contact': contactTouched ? true : 'optional',
    'stu-section-family': familyTouched ? true : 'optional',
    'stu-section-credentials': !!(s.loginEmail.trim() && s.password.length >= 8),
  };
}

/** The required fields, in one place — progress, the ID gate and save all agree. */
function requiredChecks(s: StudentRecord): boolean[] {
  return [
    !!s.name.trim(),
    !!s.gender,
    !!s.dateOfBirth,
    s.grade !== null,
    !!s.section,
    !!s.loginEmail.trim(),
    s.password.length >= 8,
  ];
}

/** Count of required fields satisfied, for the "5 of 7" progress readout. */
export function requiredProgress(s: StudentRecord): { done: number; total: number } {
  const checks = requiredChecks(s);
  return { done: checks.filter(Boolean).length, total: checks.length };
}

/**
 * True once every required field is filled. The academic number is issued at
 * this moment and not before — an ID minted against a half-filled form is a
 * number that may never belong to a real enrolment.
 */
export function readyForId(s: StudentRecord): boolean {
  return requiredChecks(s).every(Boolean);
}

/* ─── Dirty check ─────────────────────────────────────────────────────── */

/** Compares everything except the meta timestamps, which always differ. */
export function isDirty(a: StudentRecord, b: StudentRecord): boolean {
  const keys = Object.keys(emptyStudent()) as (keyof StudentRecord)[];
  return keys.some((k) => {
    if (k === 'createdAt' || k === 'updatedAt') return false;
    // `guardians` is an array — compare by value, or editing a field and
    // undoing it would leave the form permanently "unsaved".
    if (k === 'guardians') return JSON.stringify(a.guardians) !== JSON.stringify(b.guardians);
    return a[k] !== b[k];
  });
}
