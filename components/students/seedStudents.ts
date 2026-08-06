/**
 * Seeded students, adapted from the mock dataset into the full record shape.
 *
 * Extracted from StudentsPage so the People hub and the parents directory read
 * the same records the roster does, rather than each re-deriving them and
 * drifting.
 *
 * Everything here is derived deterministically from the student id or name —
 * no RNG — so a reload never reshuffles the roster.
 */

import { EXTENDED_STUDENTS } from '../../data/mockAttendanceData';
import { emptyGuardian, emptyStudent, type Guardian, type StudentRecord } from './studentTypes';

type SeedStudent = (typeof EXTENDED_STUDENTS)[number];

/** Stable small integer from a string, for deriving demo values without RNG. */
export function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * The male half of the international campus's first-name pool
 * (data/mockAttendanceData.ts `INTL_FIRST_NAMES`, which alternates
 * male/female by index). Camp-3 is mixed-gender, so unlike the other two
 * campuses its gender has to come from the name — hashing the id would label
 * "Muath" female half the time.
 */
const INTL_MALE_FIRST_NAMES = new Set([
  'Adam', 'Omar', 'Yousef', 'Khalid', 'Bandar', 'Tariq', 'Faisal', 'Walid',
  'Saleh', 'Abdulaziz', 'Zain', 'Hamza', 'Rayan', 'Sami', 'Majed', 'Ibrahim',
  'Hassan', 'Sultan', 'Nawaf', 'Turki', 'Fahd', 'Nasser', 'Saad', 'Badr',
  'Mishary', 'Ali', 'Hamad', 'Dawood', 'Basem', 'Jaber', 'Raed', 'Muath',
]);

/**
 * The mock roster carries no gender or date of birth, but both are required —
 * so a seeded student would fail validation the moment staff pressed Save.
 * Campus type already encodes boys/girls, and grade implies age, so both are
 * derived rather than left blank.
 */
export function seedGender(s: SeedStudent): 'male' | 'female' {
  if (s.campusId === 'camp-1') return 'male';
  if (s.campusId === 'camp-2') return 'female';
  const first = s.name.trim().split(/\s+/)[0];
  return INTL_MALE_FIRST_NAMES.has(first) ? 'male' : 'female';
}

/**
 * Nationality, derived. Every seeded record would otherwise inherit `JO` from
 * `emptyStudent()`, leaving the nationality filter with exactly one value and
 * looking broken. Weighted heavily toward JO so the roster still reads as a
 * Jordanian school with an international minority.
 */
const SEED_NATIONALITIES = [
  'JO', 'JO', 'JO', 'JO', 'JO', 'JO', 'JO', 'JO', 'JO', 'JO', 'JO', 'JO',
  'PS', 'PS', 'PS', 'SA', 'SA', 'EG', 'EG', 'SY', 'SY', 'IQ', 'LB', 'AE', 'KW',
];

export function seedNationality(s: SeedStudent): string {
  return SEED_NATIONALITIES[idHash(s.id) % SEED_NATIONALITIES.length];
}

export function seedDob(s: SeedStudent, today: Date): string {
  const h = idHash(s.id);
  const year = today.getFullYear() - ((s.grade ?? 1) + 6);
  const month = (h % 12) + 1;
  const day = ((h >> 4) % 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/* ─── Guardians ───────────────────────────────────────────────────────── */

/**
 * The mock dataset's `parentName` is a per-student placeholder — literally
 * "ولي أمر <student name>" — so a parent directory built from it would be
 * 2,300 rows of one-child parents with no shared families. Instead a guardian
 * is synthesised per family: students sharing a surname on the same campus are
 * grouped in threes and given one father between them, with a phone and a
 * national ID derived from the group key.
 *
 * That makes siblings, duplicate detection and the parents screen all
 * demonstrable on seeded data, which none of them were before.
 */
// Wide enough that no single given name dominates the parent directory —
// a short pool over ~1,500 guardians makes every search for a common name
// return nothing but parents.
const AR_FATHER_NAMES = [
  'خالد', 'محمد', 'عبدالله', 'أحمد', 'سامي', 'ماهر', 'زياد', 'نبيل',
  'فادي', 'رامي', 'وليد', 'عماد', 'طارق', 'هاني', 'باسم', 'جمال',
  'إياد', 'مازن', 'نضال', 'سليم', 'عصام', 'رائد', 'غسان', 'أنور',
  'حاتم', 'شادي', 'محمود', 'يوسف', 'إبراهيم', 'صالح', 'مروان', 'فراس',
];
const EN_FATHER_NAMES = [
  'Khalid', 'Mohammed', 'Abdullah', 'Ahmed', 'Sami', 'Maher', 'Ziad', 'Nabil',
  'Fadi', 'Rami', 'Waleed', 'Emad', 'Tariq', 'Hani', 'Basem', 'Jamal',
  'Iyad', 'Mazen', 'Nidal', 'Saleem', 'Issam', 'Raed', 'Ghassan', 'Anwar',
  'Hatem', 'Shadi', 'Mahmoud', 'Yousef', 'Ibrahim', 'Saleh', 'Marwan', 'Firas',
];

/** Digits only, JO mobile shape, stable per family. */
function seedPhone(h: number): string {
  return `+9627${String(h % 90000000 + 10000000).padStart(8, '0')}`;
}

function seedNationalId(h: number): string {
  return String(2000000000 + (h % 999999999));
}

function familyKeyFor(s: SeedStudent, ordinal: number): string {
  const tokens = s.name.trim().split(/\s+/);
  const surname = tokens.length > 1 ? tokens[tokens.length - 1] : tokens[0];
  // Family size varies 1–3 by surname. A fixed group size makes almost every
  // family the maximum, which reads as a school of triplets.
  const size = 1 + (idHash(`${surname}|${s.campusId}`) % 3);
  return `${surname}|${s.campusId}|${Math.floor(ordinal / size)}`;
}

function guardianFor(s: SeedStudent, key: string): Guardian {
  const h = idHash(key);
  const surname = key.split('|')[0];
  const pool = s.campusId === 'camp-3' ? EN_FATHER_NAMES : AR_FATHER_NAMES;
  return {
    ...emptyGuardian('father'),
    // Derived from the family key, not the student — siblings share one id,
    // which is what makes them fold into a single parent.
    id: `g-seed-${h.toString(36)}`,
    name: `${pool[h % pool.length]} ${surname}`,
    phone: seedPhone(h),
    nationalId: seedNationalId(h),
  };
}

/* ─── Build ───────────────────────────────────────────────────────────── */

/** Adapts a seeded ExtendedStudent into the fuller record shape. */
function fromSeed(s: SeedStudent, today: Date, guardian: Guardian): StudentRecord {
  return {
    ...emptyStudent(),
    id: s.id,
    studentId: s.id.replace('stu-', 'STU').toUpperCase(),
    name: s.name,
    nameEn: s.nameEn,
    grade: s.grade,
    section: s.section,
    campusId: s.campusId,
    gender: seedGender(s),
    dateOfBirth: seedDob(s, today),
    nationality: seedNationality(s),
    guardians: [guardian],
    loginEmail: `${s.id}@student.school.edu`,
    isLocal: false,
  };
}

/**
 * Built once per module load. The whole set has to be derived together because
 * family grouping depends on how many students already share a surname.
 */
function buildAll(): StudentRecord[] {
  const today = new Date();
  const seen = new Map<string, number>();

  return EXTENDED_STUDENTS.map((s) => {
    const tokens = s.name.trim().split(/\s+/);
    const surname = tokens.length > 1 ? tokens[tokens.length - 1] : tokens[0];
    const bucket = `${surname}|${s.campusId}`;
    const ordinal = seen.get(bucket) ?? 0;
    seen.set(bucket, ordinal + 1);

    const key = familyKeyFor(s, ordinal);
    return fromSeed(s, today, guardianFor(s, key));
  });
}

let cache: StudentRecord[] | null = null;

export function seededStudents(): StudentRecord[] {
  if (!cache) cache = buildAll();
  return cache;
}
