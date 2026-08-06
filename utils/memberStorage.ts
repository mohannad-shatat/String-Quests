/**
 * Other-member persistence — localStorage, no backend. Mirrors
 * utils/teacherStorage.ts.
 */

import type { MemberRecord } from '../components/members/memberRecordTypes';

const STORAGE_KEY = 'string-quests-members';

export function loadMembers(): MemberRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: MemberRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('[memberStorage] save failed', err);
  }
}

/** Insert-or-update many in one write. */
export function saveMembers(records: MemberRecord[]): MemberRecord[] {
  const all = loadMembers();
  const byId = new Map(all.map((m, i) => [m.id, i]));
  const now = Date.now();

  for (const record of records) {
    const id = record.id || generateMemberRecordId();
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

export function saveMember(record: MemberRecord): MemberRecord[] {
  return saveMembers([record]);
}

export function deleteMembers(ids: string[]): MemberRecord[] {
  const drop = new Set(ids);
  const all = loadMembers().filter((m) => !drop.has(m.id));
  writeAll(all);
  return all;
}

export function generateMemberRecordId(): string {
  return `mem-local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * `MBR` keeps these distinguishable from a student's `STU` and a teacher's
 * `STF` when someone reads one aloud.
 */
export function generateMemberStringId(): string {
  const stamp = Date.now().toString(36).slice(-5);
  const rand = Math.random().toString(36).slice(2, 6);
  return `MBR${stamp}${rand}`.toUpperCase();
}
