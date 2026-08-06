/**
 * Student Manager persistence — localStorage, no backend.
 *
 * Mirrors the module-level shape of utils/skillMapStorage.ts: a private
 * STORAGE_KEY, try/catch-wrapped readers that degrade to empty, and writers
 * that read-modify-write the whole list. The dataset is small (manually added
 * students only — the ~2.3k seeded roster rows are never written here), so
 * rewriting the array on each save is fine.
 */

import { emptyGuardian, type Guardian, type StudentRecord } from '../components/students/studentTypes';

const STORAGE_KEY = 'string-quests-students';
const DRAFT_KEY = 'string-quests-student-draft';

/** The pre-list guardian shape, kept only so old records can be read. */
interface LegacyGuardianFields {
  guardianName?: string;
  motherName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianNationalId?: string;
}

/**
 * Folds the old flat guardian/mother fields into the `guardians` list.
 * Records written before guardians became a list would otherwise arrive with
 * `guardians === undefined` and crash every `.map` that touches them.
 */
function migrate(raw: StudentRecord & LegacyGuardianFields): StudentRecord {
  if (Array.isArray(raw.guardians)) return raw;

  const guardians: Guardian[] = [];
  if (raw.guardianName?.trim() || raw.guardianPhone?.trim() || raw.guardianEmail?.trim() || raw.guardianNationalId?.trim()) {
    guardians.push({
      ...emptyGuardian('father'),
      name: raw.guardianName ?? '',
      phone: raw.guardianPhone ?? '',
      email: raw.guardianEmail ?? '',
      nationalId: raw.guardianNationalId ?? '',
    });
  }
  if (raw.motherName?.trim()) {
    guardians.push({ ...emptyGuardian('mother'), name: raw.motherName });
  }

  const {
    guardianName: _a, motherName: _b, guardianPhone: _c,
    guardianEmail: _d, guardianNationalId: _e, ...rest
  } = raw;
  void _a; void _b; void _c; void _d; void _e;

  return { ...rest, guardians };
}

export function loadStudents(): StudentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(migrate) : [];
  } catch {
    return [];
  }
}

function writeAll(students: StudentRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  } catch (err) {
    console.warn('[studentStorage] save failed', err);
  }
}

/** Insert or update by `id`. Returns the full list after the write. */
export function saveStudent(record: StudentRecord): StudentRecord[] {
  const students = loadStudents();
  const now = Date.now();
  const idx = students.findIndex((s) => s.id === record.id);

  if (idx >= 0) {
    students[idx] = { ...record, updatedAt: now };
  } else {
    students.push({
      ...record,
      id: record.id || generateRecordId(),
      createdAt: record.createdAt || now,
      updatedAt: now,
    });
  }

  writeAll(students);
  return students;
}

export function deleteStudent(id: string): StudentRecord[] {
  const students = loadStudents().filter((s) => s.id !== id);
  writeAll(students);
  return students;
}

/**
 * Insert-or-update many records in one write.
 *
 * Calling `saveStudent` in a loop re-reads and re-serialises the whole list
 * per record — fine for one, quadratic for a 200-student bulk move.
 */
export function saveStudents(records: StudentRecord[]): StudentRecord[] {
  const students = loadStudents();
  const byId = new Map(students.map((s, i) => [s.id, i]));
  const now = Date.now();

  for (const record of records) {
    const id = record.id || generateRecordId();
    const idx = byId.get(id);
    const next = { ...record, id, updatedAt: now, createdAt: record.createdAt || now };
    if (idx === undefined) {
      byId.set(id, students.length);
      students.push(next);
    } else {
      students[idx] = next;
    }
  }

  writeAll(students);
  return students;
}

export function deleteStudents(ids: string[]): StudentRecord[] {
  const drop = new Set(ids);
  const students = loadStudents().filter((s) => !drop.has(s.id));
  writeAll(students);
  return students;
}

export function getStudent(id: string): StudentRecord | undefined {
  return loadStudents().find((s) => s.id === id);
}

export function clearStudents(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* ─── ID generation ───────────────────────────────────────────────────── */

/** Internal record id. Follows the repo's `${Date.now()}-${random}` idiom. */
export function generateRecordId(): string {
  return `stu-local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * School-facing student number, e.g. `STU4K9F2X1`. Time-prefixed so IDs sort
 * roughly by creation, with a random tail for collision resistance. Callers
 * should still check uniqueness against existing records.
 */
export function generateStudentId(): string {
  const stamp = Date.now().toString(36).slice(-5);
  const rand = Math.random().toString(36).slice(2, 6);
  return `STU${stamp}${rand}`.toUpperCase();
}

/**
 * Readable password — no 0/O/l/1/I, since staff read these aloud or copy them
 * onto paper when handing credentials to a student.
 */
export function generatePassword(length = 10): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/* ─── Draft autosave ──────────────────────────────────────────────────── */

export interface StudentDraft {
  record: StudentRecord;
  savedAt: number;
}

export function loadDraft(): StudentDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as StudentDraft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(record: StudentRecord): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ record, savedAt: Date.now() }));
  } catch {
    /* quota — drafts are best-effort */
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
