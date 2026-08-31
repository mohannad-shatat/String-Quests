import type { Bilingual } from './spaces';

/** Cycles in this order on each tap, then wraps back to present. */
export type AttendanceStatus = 'present' | 'absent' | 'late';

export const CYCLE: AttendanceStatus[] = ['present', 'absent', 'late'];

export const nextStatus = (current: AttendanceStatus): AttendanceStatus =>
  CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];

export const STATUS_STYLE: Record<AttendanceStatus, { tint: string; soft: string }> = {
  present: { tint: '#10b981', soft: '#e3f8f0' },
  absent: { tint: '#f43f5e', soft: '#ffe9ed' },
  late: { tint: '#f59e0b', soft: '#fef4e2' },
};

export interface Student {
  id: string;
  name: Bilingual;
  /** Roll number within the section. */
  no: number;
  /** Desk position: row 1 is nearest the board. */
  row: number;
  col: number;
}

/** Placeholder roster, reused for every space until the real one is wired in. */
export const ROSTER: Student[] = [
  { id: 's1', no: 1, name: { en: 'Ahmad Al-Masri', ar: 'أحمد المصري' } , row: 1, col: 1 },
  { id: 's2', no: 2, name: { en: 'Aya Haddadin', ar: 'آية حدادين' } , row: 1, col: 2 },
  { id: 's3', no: 3, name: { en: 'Bilal Nsour', ar: 'بلال النسور' } , row: 1, col: 3 },
  { id: 's4', no: 4, name: { en: 'Dana Khoury', ar: 'دانا خوري' } , row: 1, col: 4 },
  { id: 's5', no: 5, name: { en: 'Faris Zaghloul', ar: 'فارس زغلول' } , row: 2, col: 1 },
  { id: 's6', no: 6, name: { en: 'Hala Tarawneh', ar: 'هالة الطراونة' } , row: 2, col: 2 },
  { id: 's7', no: 7, name: { en: 'Karim Abu Zaid', ar: 'كريم أبو زيد' } , row: 2, col: 3 },
  { id: 's8', no: 8, name: { en: 'Layan Sweiss', ar: 'ليان السويس' } , row: 2, col: 4 },
  { id: 's9', no: 9, name: { en: 'Mahmoud Rifai', ar: 'محمود الرفاعي' } , row: 3, col: 1 },
  { id: 's10', no: 10, name: { en: 'Nour Barghouti', ar: 'نور البرغوثي' } , row: 3, col: 2 },
  { id: 's11', no: 11, name: { en: 'Omar Shboul', ar: 'عمر الشبول' } , row: 3, col: 3 },
  { id: 's12', no: 12, name: { en: 'Rand Qudah', ar: 'رند القضاة' } , row: 3, col: 4 },
  { id: 's13', no: 13, name: { en: 'Saif Obeidat', ar: 'سيف العبيدات' } , row: 4, col: 2 },
  { id: 's14', no: 14, name: { en: 'Yara Masadeh', ar: 'يارا المساعدة' } , row: 4, col: 3 },
];

/** Initials for the avatar chip, taken from the English form. */
export const initials = (student: Student): string =>
  student.name.en
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
