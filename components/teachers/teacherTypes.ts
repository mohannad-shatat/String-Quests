/**
 * Teacher record — identity, subjects, employment, contact, login.
 *
 * The Employment & About half deliberately mirrors `ProfileData` in
 * components/schedule/profileTypes.ts (yearsOfExperience kept as a string so
 * a number input clears cleanly, photoDataUrl '' for none), so the two can be
 * reconciled later without a migration.
 *
 * No guardians and no sibling matching — those are student concepts.
 */

import type { Gender } from '../students/studentTypes';

export type EmploymentType = 'full-time' | 'part-time' | 'visiting' | '';

export interface TeacherRecord {
  id: string;
  /** Permanent, system-issued. Same rules as a student's String ID. */
  stringId: string;

  // ─── Identity ───
  name: string;
  nameEn: string;
  photoDataUrl: string;
  gender: Gender;
  dateOfBirth: string;
  nationality: string;
  nationalId: string;

  // ─── Subjects & Classes ───
  subject: string;
  /** Grades taught, as numbers. */
  grades: number[];
  campusId: string;
  sections: string[];

  // ─── Employment & About ───
  employeeId: string;
  hireDate: string;
  employmentType: EmploymentType;
  /** String, not number — so the input can be emptied. */
  yearsOfExperience: string;
  university: string;
  major: string;
  bio: string;
  certifications: string[];

  // ─── Contact ───
  email: string;
  phone: string;
  officeHours: string;
  address: string;

  // ─── Login ───
  loginEmail: string;
  password: string;

  // ─── Meta ───
  createdAt: number;
  updatedAt: number;
  isLocal: boolean;
}

export function emptyTeacher(): TeacherRecord {
  return {
    id: '',
    stringId: '',
    name: '',
    nameEn: '',
    photoDataUrl: '',
    gender: '',
    dateOfBirth: '',
    nationality: 'JO',
    nationalId: '',
    subject: '',
    grades: [],
    campusId: '',
    sections: [],
    employeeId: '',
    hireDate: '',
    employmentType: '',
    yearsOfExperience: '',
    university: '',
    major: '',
    bio: '',
    certifications: [],
    email: '',
    phone: '',
    officeHours: '',
    address: '',
    loginEmail: '',
    password: '',
    createdAt: 0,
    updatedAt: 0,
    isLocal: true,
  };
}

/* ─── Sections ────────────────────────────────────────────────────────── */

export type TeacherSectionId =
  | 'tea-section-identity'
  | 'tea-section-subjects'
  | 'tea-section-employment'
  | 'tea-section-contact'
  | 'tea-section-credentials';

export const TEACHER_SECTION_IDS: TeacherSectionId[] = [
  'tea-section-identity',
  'tea-section-subjects',
  'tea-section-employment',
  'tea-section-contact',
  'tea-section-credentials',
];

/* ─── Validation ──────────────────────────────────────────────────────── */

export type TeacherErrorKey =
  | 'name'
  | 'gender'
  | 'subject'
  | 'campusId'
  | 'email'
  | 'phone'
  | 'loginEmail'
  | 'password';

export type TeacherErrors = Partial<Record<TeacherErrorKey, string>>;

export const TEACHER_FIELD_SECTION: Record<TeacherErrorKey, TeacherSectionId> = {
  name: 'tea-section-identity',
  gender: 'tea-section-identity',
  subject: 'tea-section-subjects',
  campusId: 'tea-section-subjects',
  email: 'tea-section-contact',
  phone: 'tea-section-contact',
  loginEmail: 'tea-section-credentials',
  password: 'tea-section-credentials',
};

export const TEACHER_ERROR_ORDER: TeacherErrorKey[] = [
  'name', 'gender', 'subject', 'campusId', 'email', 'phone', 'loginEmail', 'password',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function digitsOnly(input: string): string {
  return input.replace(/\D+/g, '');
}

export function validateTeacher(t: TeacherRecord, isAr: boolean): TeacherErrors {
  const e: TeacherErrors = {};
  const req = isAr ? 'هذا الحقل مطلوب' : 'This field is required';

  if (!t.name.trim()) e.name = req;
  if (!t.gender) e.gender = req;
  if (!t.subject.trim()) e.subject = req;
  if (!t.campusId) e.campusId = req;

  if (t.email.trim() && !EMAIL_RE.test(t.email.trim())) {
    e.email = isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email address';
  }
  if (t.phone.trim() && digitsOnly(t.phone).length < 7) {
    e.phone = isAr ? 'رقم هاتف غير صالح' : 'Invalid phone number';
  }

  if (!t.loginEmail.trim()) {
    e.loginEmail = req;
  } else if (!EMAIL_RE.test(t.loginEmail.trim())) {
    e.loginEmail = isAr ? 'بريد إلكتروني غير صالح' : 'Invalid email address';
  }

  if (!t.password) {
    e.password = req;
  } else if (t.password.length < 8) {
    e.password = isAr ? '٨ أحرف على الأقل' : 'At least 8 characters';
  }

  return e;
}

export type SectionStatus = boolean | 'optional';

export function teacherSectionCompletion(
  t: TeacherRecord,
): Record<TeacherSectionId, SectionStatus> {
  const employmentTouched = !!(
    t.employeeId.trim() || t.hireDate || t.employmentType ||
    t.yearsOfExperience.trim() || t.university.trim() || t.major.trim() || t.bio.trim()
  );
  const contactTouched = !!(
    t.email.trim() || t.phone.trim() || t.officeHours.trim() || t.address.trim()
  );

  return {
    'tea-section-identity': !!(t.name.trim() && t.gender),
    'tea-section-subjects': !!(t.subject.trim() && t.campusId && t.grades.length > 0),
    'tea-section-employment': employmentTouched ? true : 'optional',
    'tea-section-contact': contactTouched ? true : 'optional',
    'tea-section-credentials': !!(t.loginEmail.trim() && t.password.length >= 8),
  };
}

function requiredChecks(t: TeacherRecord): boolean[] {
  return [
    !!t.name.trim(),
    !!t.gender,
    !!t.subject.trim(),
    !!t.campusId,
    !!t.loginEmail.trim(),
    t.password.length >= 8,
  ];
}

export function teacherProgress(t: TeacherRecord): { done: number; total: number } {
  const checks = requiredChecks(t);
  return { done: checks.filter(Boolean).length, total: checks.length };
}

/** The String ID is issued only once the record is a real employment record. */
export function teacherReadyForId(t: TeacherRecord): boolean {
  return requiredChecks(t).every(Boolean);
}

export function isTeacherDirty(a: TeacherRecord, b: TeacherRecord): boolean {
  const keys = Object.keys(emptyTeacher()) as (keyof TeacherRecord)[];
  return keys.some((k) => {
    if (k === 'createdAt' || k === 'updatedAt') return false;
    // Arrays compare by value, or editing then undoing leaves it "dirty".
    if (k === 'grades' || k === 'sections' || k === 'certifications') {
      return JSON.stringify(a[k]) !== JSON.stringify(b[k]);
    }
    return a[k] !== b[k];
  });
}
