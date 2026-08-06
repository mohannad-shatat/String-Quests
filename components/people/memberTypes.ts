/**
 * The account types String recognises.
 *
 * IMPORTANT — the capability descriptions in peopleI18n.ts are a **first
 * pass**, written to give each role a concrete meaning in the UI. Only
 * `lead_teacher` is specified: a teacher granted temporary campus-owner
 * permissions. The rest are reasonable guesses and should be confirmed against
 * how the school actually delegates authority before anything enforces them.
 *
 * Nothing here grants or checks permissions yet — it's labelling and routing.
 */

import {
  GraduationCap,
  Presentation,
  ShieldCheck,
  Building2,
  BookOpenCheck,
  ServerCog,
  Star,
  HeartHandshake,
  type LucideIcon,
} from 'lucide-react';

export type MemberTypeId =
  | 'student'
  | 'teacher'
  | 'lead_teacher'
  | 'supervisor'
  | 'campus_owner'
  | 'topic_manager'
  | 'it_manager'
  | 'parent';

/**
 * `core` types have a roster of their own. `other` types all share one screen
 * at /members — they're rare enough that five separate pages would be five
 * places to look for one person.
 */
export type MemberGroup = 'core' | 'other';

export interface MemberType {
  id: MemberTypeId;
  group: MemberGroup;
  icon: LucideIcon;
  /** Static Tailwind literals — JIT-safe, per the repo-wide rule. */
  iconBg: string;
  iconColor: string;
  ringHover: string;
  /** Where "add one of these" goes. */
  route: string;
  /** Where the list of these lives. */
  rosterRoute: string;
  /**
   * True when records are computed from other records rather than authored.
   * Parents are folded out of student guardians, so they're listed and
   * searchable but edited on the student they belong to.
   */
  derived?: boolean;
}

/**
 * Ordered as the picker shows them: the two everyday roles first, then the
 * ones a school creates rarely, then the derived one.
 */
export const MEMBER_TYPES: MemberType[] = [
  {
    id: 'student',
    group: 'core',
    icon: GraduationCap,
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-500',
    ringHover: 'hover:border-sky-300',
    route: '/students?student=new',
    rosterRoute: '/students',
  },
  {
    id: 'teacher',
    group: 'core',
    icon: Presentation,
    iconBg: 'bg-sq-accent-50',
    iconColor: 'text-sq-accent-600',
    ringHover: 'hover:border-sq-accent-200',
    route: '/teachers?teacher=new',
    rosterRoute: '/teachers',
  },
  {
    id: 'lead_teacher',
    group: 'other',
    icon: Star,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    ringHover: 'hover:border-amber-300',
    route: '/members?member=new&type=lead_teacher',
    rosterRoute: '/members?type=lead_teacher',
  },
  {
    id: 'supervisor',
    group: 'other',
    icon: ShieldCheck,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
    ringHover: 'hover:border-violet-300',
    route: '/members?member=new&type=supervisor',
    rosterRoute: '/members?type=supervisor',
  },
  {
    id: 'campus_owner',
    group: 'other',
    icon: Building2,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    ringHover: 'hover:border-emerald-300',
    route: '/members?member=new&type=campus_owner',
    rosterRoute: '/members?type=campus_owner',
  },
  {
    id: 'topic_manager',
    group: 'other',
    icon: BookOpenCheck,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-500',
    ringHover: 'hover:border-orange-300',
    route: '/members?member=new&type=topic_manager',
    rosterRoute: '/members?type=topic_manager',
  },
  {
    id: 'it_manager',
    group: 'other',
    icon: ServerCog,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
    ringHover: 'hover:border-slate-300',
    route: '/members?member=new&type=it_manager',
    rosterRoute: '/members?type=it_manager',
  },
  {
    id: 'parent',
    group: 'other',
    icon: HeartHandshake,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    ringHover: 'hover:border-rose-300',
    // A parent is created by adding a guardian to a student, so "add one"
    // opens the student form rather than a parent form that can't exist.
    route: '/students?student=new',
    rosterRoute: '/members?type=parent',
    derived: true,
  },
];

/** The five authored `other` types plus the derived one, in picker order. */
export const OTHER_MEMBER_TYPES = MEMBER_TYPES.filter((m) => m.group === 'other');

/** Types with a record you can author on /members. Excludes parents. */
export const AUTHORED_OTHER_TYPE_IDS = OTHER_MEMBER_TYPES.filter((m) => !m.derived).map((m) => m.id);

export function memberType(id: MemberTypeId): MemberType {
  const found = MEMBER_TYPES.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown member type: ${id}`);
  return found;
}

export function isOtherType(id: MemberTypeId): boolean {
  return memberType(id).group === 'other';
}

/** i18n key helpers, so callers never hand-build the string. */
export const typeLabelKey = (id: MemberTypeId) => `type.${id}.label`;
export const typeDescKey = (id: MemberTypeId) => `type.${id}.desc`;
