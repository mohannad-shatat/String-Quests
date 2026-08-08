/**
 * Answers from the parent linking flow — localStorage, keyed by student.
 *
 * Only the preference answers live here. The guardian's name and relation are
 * written onto the student record itself (utils/studentStorage.ts), because
 * those belong to the school's records rather than to this one conversation.
 */

import type { InviteAnswers } from '../components/family-invite/inviteTypes';

const STORAGE_KEY = 'string-quests-family-invites';

type Store = Record<string, InviteAnswers>;

function readAll(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

export function loadInvite(studentId: string): InviteAnswers | null {
  return readAll()[studentId] ?? null;
}

export function saveInvite(answers: InviteAnswers): void {
  try {
    const all = readAll();
    all[answers.studentId] = answers;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('[familyInviteStorage] save failed', err);
  }
}

export function clearInvite(studentId: string): void {
  try {
    const all = readAll();
    delete all[studentId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('[familyInviteStorage] clear failed', err);
  }
}
