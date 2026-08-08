/**
 * The parent-facing linking flow — what a guardian opens from the WhatsApp
 * invite, not something staff ever see.
 *
 * Five screens. The first four ask fixed questions and nothing else: a parent
 * who has just scanned a code owes us answers, not a pitch. Everything about
 * what String does is held back to screen five, once the link already exists
 * and the questions are behind them.
 *
 * Answers live in localStorage alongside the student record. Two of them —
 * the guardian's identity and any siblings they confirm — are written back
 * onto the student(s) themselves, because those are facts about the school's
 * records. The rest are preferences about this parent, and stay here.
 */

import type { Guardian, GuardianRelation, StudentRecord } from '../students/studentTypes';
import { emptyGuardian } from '../students/studentTypes';
import { normalizeDigits } from '../students/studentMatching';

export type InviteStep = 1 | 2 | 3 | 4 | 5;

export const INVITE_STEPS: InviteStep[] = [1, 2, 3, 4, 5];
/** Screens that ask something. Screen 5 is the confirmation, not a question. */
export const QUESTION_STEPS = 4;

export type FollowUp = 'me' | 'second' | 'both' | '';
export type NotifyTime = 'morning' | 'evening' | 'any' | '';
export type ChildPhone = 'yes' | 'no' | 'borrows' | '';

export interface InviteAnswers {
  studentId: string;
  /** null until screen 1 is answered; false ends the flow. */
  isMyChild: boolean | null;
  guardianName: string;
  relation: GuardianRelation;
  /** Free text. Optional — see the helper line on screen 2 for why we ask. */
  occupation: string;
  /** Student ids the parent confirmed as their other children. */
  siblingIds: string[];
  followUp: FollowUp;
  notifyTime: NotifyTime;
  childPhone: ChildPhone;
  /** The number the invite arrived from — shown back, never asked for. */
  phone: string;
  completedAt: number;
}

export function emptyAnswers(studentId: string, phone: string): InviteAnswers {
  return {
    studentId,
    isMyChild: null,
    guardianName: '',
    // The QR the parent scanned already said which of them they are, so this
    // arrives pre-set; it stays editable in case the wrong code was shared.
    relation: 'father',
    occupation: '',
    siblingIds: [],
    followUp: '',
    notifyTime: '',
    childPhone: '',
    phone,
    completedAt: 0,
  };
}

/* ─── Validation ──────────────────────────────────────────────────────── */

export type InviteErrorKey = 'guardianName' | 'relation' | 'followUp' | 'notifyTime' | 'childPhone';
export type InviteErrors = Partial<Record<InviteErrorKey, string>>;

/**
 * Per-step, because the flow gates on the current screen only — a parent on
 * screen 2 shouldn't be told screen 4 is incomplete.
 */
export function validateStep(step: InviteStep, a: InviteAnswers, isAr: boolean): InviteErrors {
  const req = isAr ? 'هذا الحقل مطلوب' : 'This field is required';
  const pick = isAr ? 'يرجى الاختيار' : 'Please choose one';
  const e: InviteErrors = {};

  if (step === 2) {
    if (!a.guardianName.trim()) e.guardianName = req;
    if (!a.relation) e.relation = pick;
  }
  if (step === 4) {
    if (!a.followUp) e.followUp = pick;
    if (!a.notifyTime) e.notifyTime = pick;
    if (!a.childPhone) e.childPhone = pick;
  }
  return e;
}

export function canAdvance(step: InviteStep, a: InviteAnswers): boolean {
  if (step === 1) return a.isMyChild === true;
  // Screen 3 is genuinely skippable — an only child is the common case.
  if (step === 3) return true;
  return Object.keys(validateStep(step, a, true)).length === 0;
}

/* ─── Family candidates ───────────────────────────────────────────────── */

/** Last 9 digits, so +962 7… and 07… are the same number. */
function phoneKey(phone: string): string {
  const digits = normalizeDigits(phone).replace(/\D+/g, '');
  return digits.length >= 9 ? digits.slice(-9) : '';
}

export interface SiblingCandidate {
  id: string;
  name: string;
  nameEn: string;
  grade: number | null;
  section: string;
}

/**
 * Other students who share a guardian with this one — matched on national ID
 * or phone, never on surname alone. A parent being shown someone else's child
 * because the family names rhyme is worse than showing nothing.
 */
export function findFamilyCandidates(
  student: StudentRecord,
  all: StudentRecord[],
): SiblingCandidate[] {
  const ids = new Set(
    student.guardians.map((g) => g.nationalId.replace(/\s+/g, '')).filter(Boolean),
  );
  const phones = new Set(student.guardians.map((g) => phoneKey(g.phone)).filter(Boolean));
  if (ids.size === 0 && phones.size === 0) return [];

  return all
    .filter((s) => s.id !== student.id)
    .filter((s) =>
      s.guardians.some(
        (g) => ids.has(g.nationalId.replace(/\s+/g, '')) || phones.has(phoneKey(g.phone)),
      ),
    )
    .map((s) => ({
      id: s.id,
      name: s.name,
      nameEn: s.nameEn,
      grade: s.grade,
      section: s.section,
    }));
}

/* ─── Writing back ────────────────────────────────────────────────────── */

/**
 * The guardian record this flow produces. Reuses any existing guardian in the
 * same slot rather than appending a second copy of the same person — a parent
 * re-scanning the code should update their details, not duplicate them.
 */
export function guardianFromAnswers(a: InviteAnswers, existing: Guardian[]): Guardian[] {
  const match = existing.find((g) => g.relation === a.relation);
  const filled: Guardian = {
    ...(match ?? emptyGuardian(a.relation)),
    relation: a.relation,
    name: a.guardianName.trim(),
    phone: a.phone,
  };
  return match
    ? existing.map((g) => (g.id === match.id ? filled : g))
    : [...existing.filter((g) => g.name.trim() || g.phone.trim()), filled];
}

/**
 * Groups a number for reading aloud: +962 79 123 4567.
 *
 * Shown in full rather than masked — the parent is being asked to confirm it
 * is theirs, and half a number confirms nothing. Render inside `dir="ltr"`, or
 * bidi moves the leading `+` to the wrong end.
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D+/g, '');
  if (digits.length < 9) return phone;
  const tail = digits.slice(-9);
  const cc = digits.slice(0, -9);
  const grouped = `${tail.slice(0, 2)} ${tail.slice(2, 5)} ${tail.slice(5)}`;
  return cc ? `+${cc} ${grouped}` : grouped;
}
