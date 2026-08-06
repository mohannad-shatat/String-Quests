/**
 * Student Manager — option lists for the form's selects.
 *
 * Grades and campuses are reused from the existing admin data so the roster
 * and the form agree. Sections deliberately run A–F (not `CLASS_SECTIONS`
 * from data/adminData.ts, which stops at D) to match the wider range the
 * teacher-profile surface already offers.
 *
 * Gender, study system and study focus have no prior source in the repo —
 * they are authored here.
 */

import { GRADES } from '../../data/adminData';
import { CAMPUSES } from '../../data/mockAttendanceData';
import { COUNTRIES } from '../parent-onboarding/countries';
import type { Locale } from './studentsI18n';

export interface Option {
  value: string;
  labelAr: string;
  labelEn: string;
}

export function label(opt: Option, locale: Locale): string {
  return locale === 'ar' ? opt.labelAr : opt.labelEn;
}

/** Turns an Option[] into the {value,label} shape a <select> renderer wants. */
export function localized(opts: Option[], locale: Locale): { value: string; label: string }[] {
  return opts.map((o) => ({ value: o.value, label: label(o, locale) }));
}

export const GENDER_OPTIONS: Option[] = [
  { value: 'male', labelAr: 'ذكر', labelEn: 'Male' },
  { value: 'female', labelAr: 'أنثى', labelEn: 'Female' },
];

export const SECTION_OPTIONS: Option[] = ['A', 'B', 'C', 'D', 'E', 'F'].map((s) => ({
  value: s,
  labelAr: s,
  labelEn: s,
}));

export const GRADE_OPTIONS: Option[] = GRADES.map((g) => ({
  value: String(g),
  labelAr: `الصف ${g}`,
  labelEn: `Grade ${g}`,
}));

export const CAMPUS_OPTIONS: Option[] = CAMPUSES.map((c) => ({
  value: c.id,
  labelAr: c.name,
  labelEn: c.nameEn,
}));

export const STUDY_SYSTEM_OPTIONS: Option[] = [
  { value: 'national', labelAr: 'الوطني', labelEn: 'National' },
  { value: 'british', labelAr: 'البريطاني', labelEn: 'British' },
  { value: 'american', labelAr: 'الأمريكي', labelEn: 'American' },
  { value: 'ib', labelAr: 'البكالوريا الدولية', labelEn: 'IB' },
];

export const STUDY_FOCUS_OPTIONS: Option[] = [
  { value: 'science', labelAr: 'علمي', labelEn: 'Science' },
  { value: 'arts', labelAr: 'أدبي', labelEn: 'Arts' },
  { value: 'it', labelAr: 'تقنية المعلومات', labelEn: 'Information Technology' },
  { value: 'business', labelAr: 'إدارة أعمال', labelEn: 'Business' },
];

/** Nationality reuses the shared country dataset — the repo's only one. */
export const NATIONALITY_OPTIONS: Option[] = COUNTRIES.map((c) => ({
  value: c.code,
  labelAr: `${c.flag} ${c.nameAr}`,
  labelEn: `${c.flag} ${c.nameEn}`,
}));

/** Dial code for a country code, for the phone field prefix. */
export function dialCodeFor(countryCode: string): string {
  return COUNTRIES.find((c) => c.code === countryCode)?.dialCode ?? '+962';
}
