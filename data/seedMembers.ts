/**
 * Demo records for the five authored "other member" types.
 *
 * There's no seeded staff data in the repo beyond teachers, so this fills the
 * gap — an empty /members screen reads as broken rather than new.
 *
 * Two of these aren't invented: campus owners come from the `principalName`
 * already on each campus, and lead teachers and supervisors are promoted from
 * real `EXTENDED_TEACHERS` entries, so `sourceTeacherId` points at a teacher
 * that exists and the promotion link is demonstrable. Topic and IT managers
 * have no counterpart in the mock data, so those are made up.
 *
 * Term dates are computed relative to today so the countdown stays live, and
 * one grant is deliberately already expired to exercise that state.
 */

import { CAMPUSES, EXTENDED_TEACHERS } from './mockAttendanceData';
import {
  emptyMember,
  type AuthoredMemberTypeId,
  type MemberRecord,
} from '../components/members/memberRecordTypes';

/** Arabic principal names carry no English twin in the campus data. */
const PRINCIPAL_EN: Record<string, string> = {
  'camp-1': 'Dr. Abdullah Al-Omar',
  'camp-2': 'Ms. Noura Al-Khalid',
  'camp-3': 'Mr. Saud Al-Mohammadi',
};

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Stable String ID from the whole record id. Taking only the digits would
 * collapse `mem-lead-1`, `mem-sup-1` and `mem-owner-1` onto the same MBR0001.
 */
function seedStringId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `MBR${(h % 100000).toString().padStart(5, '0')}`;
}

function seedBase(
  id: string,
  type: AuthoredMemberTypeId,
  name: string,
  nameEn: string,
  gender: 'male' | 'female',
): MemberRecord {
  return {
    ...emptyMember(type),
    id,
    stringId: seedStringId(id),
    name,
    nameEn,
    gender,
    loginEmail: `${id}@staff.school.edu`,
    isLocal: false,
  };
}

/** Picks a teacher by position, wrapping — the list length isn't fixed here. */
function teacherAt(i: number) {
  return EXTENDED_TEACHERS[i % EXTENDED_TEACHERS.length];
}

function buildSeeds(): MemberRecord[] {
  const out: MemberRecord[] = [];

  // ── Campus owners: one per campus, named from the campus data ──
  CAMPUSES.forEach((c, i) => {
    out.push({
      ...seedBase(
        `mem-owner-${i + 1}`,
        'campus_owner',
        c.principalName,
        PRINCIPAL_EN[c.id] ?? c.principalName,
        c.type === 'girls' ? 'female' : 'male',
      ),
      campusIds: [c.id],
      employeeId: `EMP-OWN-${i + 1}`,
      yearsOfExperience: String(14 + i * 3),
    });
  });

  // ── Lead teachers: promoted from real teachers, with live terms ──
  // +52 days, +9 days (nearly up), and −12 days (already lapsed).
  [52, 9, -12].forEach((offset, i) => {
    const t = teacherAt(i * 11);
    out.push({
      ...seedBase(`mem-lead-${i + 1}`, 'lead_teacher', t.name, t.nameEn, i === 1 ? 'female' : 'male'),
      sourceTeacherId: t.id,
      campusIds: [t.campusId],
      termStart: isoOffset(offset - 90),
      termEnd: isoOffset(offset),
      employeeId: `EMP-LEAD-${i + 1}`,
    });
  });

  // ── Supervisors: each over a subject, across one or two campuses ──
  [3, 15, 27].forEach((idx, i) => {
    const t = teacherAt(idx);
    out.push({
      ...seedBase(`mem-sup-${i + 1}`, 'supervisor', t.name, t.nameEn, i === 0 ? 'female' : 'male'),
      campusIds: i === 2 ? CAMPUSES.map((c) => c.id) : [t.campusId],
      subjects: [t.subject],
      employeeId: `EMP-SUP-${i + 1}`,
      yearsOfExperience: String(9 + i * 2),
    });
  });

  // ── Topic managers: curriculum, no campus scope ──
  const topics: [string, string, string, number[], 'male' | 'female'][] = [
    ['ريم الحوراني', 'Reem Al-Hourani', 'رياضيات', [1, 2, 3, 4, 5, 6], 'female'],
    ['ياسر الشوابكة', 'Yaser Al-Shawabkeh', 'لغة عربية', [7, 8, 9, 10, 11, 12], 'male'],
  ];
  topics.forEach(([name, nameEn, subject, grades, gender], i) => {
    out.push({
      ...seedBase(`mem-topic-${i + 1}`, 'topic_manager', name, nameEn, gender),
      subjects: [subject],
      grades,
      employeeId: `EMP-TOP-${i + 1}`,
    });
  });

  // ── IT managers: system-wide, deliberately unscoped ──
  const its: [string, string, 'male' | 'female'][] = [
    ['مهند القضاة', 'Muhannad Al-Qudah', 'male'],
    ['لمى برهوم', 'Lama Barhoum', 'female'],
  ];
  its.forEach(([name, nameEn, gender], i) => {
    out.push({
      ...seedBase(`mem-it-${i + 1}`, 'it_manager', name, nameEn, gender),
      employeeId: `EMP-IT-${i + 1}`,
      email: `${nameEn.split(' ')[0].toLowerCase()}@school.edu`,
    });
  });

  return out;
}

export const SEED_MEMBERS: MemberRecord[] = buildSeeds();
