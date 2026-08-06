/**
 * Teacher persistence — localStorage, no backend. Mirrors utils/studentStorage.ts.
 */

import type { TeacherRecord } from '../components/teachers/teacherTypes';

const STORAGE_KEY = 'string-quests-teachers';

export function loadTeachers(): TeacherRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: TeacherRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('[teacherStorage] save failed', err);
  }
}

/** Insert-or-update many in one write — a bulk reassign shouldn't be O(n²). */
export function saveTeachers(records: TeacherRecord[]): TeacherRecord[] {
  const all = loadTeachers();
  const byId = new Map(all.map((t, i) => [t.id, i]));
  const now = Date.now();

  for (const record of records) {
    const id = record.id || generateTeacherRecordId();
    const idx = byId.get(id);
    const next = { ...record, id, updatedAt: now, createdAt: record.createdAt || now };
    if (idx === undefined) {
      byId.set(id, all.length);
      all.push(next);
    } else {
      all[idx] = next;
    }
  }

  writeAll(all);
  return all;
}

export function saveTeacher(record: TeacherRecord): TeacherRecord[] {
  return saveTeachers([record]);
}

export function deleteTeachers(ids: string[]): TeacherRecord[] {
  const drop = new Set(ids);
  const all = loadTeachers().filter((t) => !drop.has(t.id));
  writeAll(all);
  return all;
}

export function generateTeacherRecordId(): string {
  return `tea-local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Teacher String IDs are prefixed `STF` (staff) so they're distinguishable
 * from a student's `STU` at a glance — useful when someone reads one aloud.
 */
export function generateTeacherStringId(): string {
  const stamp = Date.now().toString(36).slice(-5);
  const rand = Math.random().toString(36).slice(2, 6);
  return `STF${stamp}${rand}`.toUpperCase();
}
