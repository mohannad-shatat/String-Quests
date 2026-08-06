/**
 * The People rail — navigation, not content.
 *
 * This replaces the grid of member-type cards that used to occupy the whole
 * hub. Seven tiles to say "students exist" is something you read once; a rail
 * is something you glance at, so the body can be the roster.
 *
 * Every entry is a shortcut to where that kind of person actually lives. The
 * five rare types share one screen at /members — expanding "Other members"
 * deep-links into it with the type filter already set.
 *
 * Two geometries, one component: a sticky column on desktop, a horizontal
 * scroll strip above the search on phones.
 */

import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, FileUp, ListChecks, UserPlus, Users, type LucideIcon } from 'lucide-react';
import {
  MEMBER_TYPES,
  OTHER_MEMBER_TYPES,
  memberType,
  typeLabelKey,
  type MemberTypeId,
} from './memberTypes';
import type { Locale, Translate } from '../directory/directoryI18n';

export type RailVariant = 'vertical' | 'horizontal';

export interface RailCounts {
  student: number;
  teacher: number;
  /** Everything under Other, summed. */
  other: number;
  /** Per-type, for the expanded sub-items. */
  byType: Partial<Record<MemberTypeId, number>>;
}

interface PeopleRailProps {
  counts: RailCounts;
  /** Total across every type — the "All" entry. */
  totalCount: number;
  variant: RailVariant;
  locale: Locale;
  t: Translate;
  onNavigate: (route: string) => void;
  onAddMember: () => void;
  onBulk: () => void;
  onImport: () => void;
}

function formatCount(n: number, isAr: boolean): string {
  return n.toLocaleString(isAr ? 'ar-EG' : 'en-US');
}

const STUDENT = memberType('student');
const TEACHER = memberType('teacher');

/* ─── Vertical ─────────────────────────────────────────────────────────── */

const RailButton: React.FC<{
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  label: string;
  count?: number;
  isAr: boolean;
  onClick: () => void;
  trailing?: React.ReactNode;
}> = ({ icon: Icon, iconBg, iconColor, label, count, isAr, onClick, trailing }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-start hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-all"
  >
    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
      <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" />
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-xs font-bold text-sq-ink truncate">{label}</span>
      {count !== undefined && (
        <span className="block text-[10px] font-bold text-slate-400 tabular-nums">
          {formatCount(count, isAr)}
        </span>
      )}
    </span>
    {trailing}
  </button>
);

export const PeopleRail: React.FC<PeopleRailProps> = ({
  counts,
  totalCount,
  variant,
  locale,
  t,
  onNavigate,
  onAddMember,
  onBulk,
  onImport,
}) => {
  const reduce = useReducedMotion();
  const isAr = locale === 'ar';
  const [otherOpen, setOtherOpen] = useState(false);

  /* ── Horizontal: phones. Flat chips; the nested types are reachable from
        /members once you're there, and a nested accordion in a scroll strip
        is worse than the extra tap. ── */
  if (variant === 'horizontal') {
    const chips: { id: string; label: string; count: number; route?: string }[] = [
      { id: 'all', label: t('rail.all'), count: totalCount },
      { id: 'student', label: t('rail.students'), count: counts.student, route: STUDENT.rosterRoute },
      { id: 'teacher', label: t('rail.teachers'), count: counts.teacher, route: TEACHER.rosterRoute },
      { id: 'other', label: t('rail.other'), count: counts.other, route: '/members' },
    ];

    return (
      <nav aria-label={t('rail.title')} className="lg:hidden -mx-4 px-4 overflow-x-auto">
        <ul className="flex items-center gap-2 w-max pb-1">
          {chips.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => (c.route ? onNavigate(c.route) : undefined)}
                disabled={!c.route}
                className={
                  c.route
                    ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:border-sq-accent-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors whitespace-nowrap'
                    : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sq-accent-500 bg-sq-accent-500 text-[11px] font-bold text-white whitespace-nowrap'
                }
              >
                {c.label}
                <span className={c.route ? 'text-slate-400 tabular-nums' : 'text-white/70 tabular-nums'}>
                  {formatCount(c.count, isAr)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  /* ── Vertical: desktop ── */
  return (
    <nav
      aria-label={t('rail.title')}
      className="hidden lg:block w-56 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto"
    >
      <p className="px-2.5 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
        {t('rail.title')}
      </p>

      <ul className="space-y-0.5">
        <li>
          <RailButton
            icon={Users}
            iconBg="bg-slate-100"
            iconColor="text-slate-500"
            label={t('rail.all')}
            count={totalCount}
            isAr={isAr}
            onClick={() => onNavigate('/people')}
          />
        </li>
        <li>
          <RailButton
            icon={STUDENT.icon}
            iconBg={STUDENT.iconBg}
            iconColor={STUDENT.iconColor}
            label={t('rail.students')}
            count={counts.student}
            isAr={isAr}
            onClick={() => onNavigate(STUDENT.rosterRoute)}
          />
        </li>
        <li>
          <RailButton
            icon={TEACHER.icon}
            iconBg={TEACHER.iconBg}
            iconColor={TEACHER.iconColor}
            label={t('rail.teachers')}
            count={counts.teacher}
            isAr={isAr}
            onClick={() => onNavigate(TEACHER.rosterRoute)}
          />
        </li>

        {/* Other members — one screen, six ways in. */}
        <li>
          <div className="flex items-stretch gap-0.5">
            <div className="flex-1 min-w-0">
              <RailButton
                icon={MEMBER_TYPES.find((m) => m.id === 'supervisor')!.icon}
                iconBg="bg-slate-100"
                iconColor="text-slate-500"
                label={t('rail.other')}
                count={counts.other}
                isAr={isAr}
                onClick={() => onNavigate('/members')}
              />
            </div>
            <button
              type="button"
              onClick={() => setOtherOpen((v) => !v)}
              aria-expanded={otherOpen}
              aria-label={otherOpen ? t('rail.collapse') : t('rail.expand')}
              title={otherOpen ? t('rail.collapse') : t('rail.expand')}
              className="px-1.5 rounded-xl text-slate-300 hover:text-slate-600 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
            >
              <ChevronDown
                className={
                  otherOpen ? 'w-3.5 h-3.5 rotate-180 transition-transform' : 'w-3.5 h-3.5 transition-transform'
                }
              />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {otherOpen && (
              <motion.ul
                initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.18 }}
                className="overflow-hidden ms-5 border-s border-slate-200 ps-2 mt-0.5 space-y-0.5"
              >
                {OTHER_MEMBER_TYPES.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(m.rosterRoute)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-start hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
                    >
                      <m.icon className={`w-3.5 h-3.5 shrink-0 ${m.iconColor}`} aria-hidden="true" />
                      <span className="flex-1 min-w-0 text-[11px] font-bold text-slate-600 truncate">
                        {t(typeLabelKey(m.id))}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 tabular-nums shrink-0">
                        {formatCount(counts.byType[m.id] ?? 0, isAr)}
                      </span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </li>
      </ul>

      {/* Actions live in the rail so the body stays purely roster. */}
      <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-0.5">
        <p className="px-2.5 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          {t('quick.title')}
        </p>
        {(
          [
            { id: 'add', icon: UserPlus, label: t('quick.addMember'), run: onAddMember, keys: '' },
            { id: 'bulk', icon: ListChecks, label: t('quick.bulk'), run: onBulk, keys: '⌘E' },
            { id: 'import', icon: FileUp, label: t('quick.import'), run: onImport, keys: '' },
          ] as { id: string; icon: LucideIcon; label: string; run: () => void; keys: string }[]
        ).map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={a.run}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-start text-[11px] font-bold text-slate-600 hover:bg-white hover:text-sq-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
          >
            <a.icon className="w-3.5 h-3.5 text-sq-accent-600 shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0 truncate">{a.label}</span>
            {a.keys && (
              <kbd
                dir="ltr"
                className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[9px] font-bold text-slate-400 font-mono shrink-0"
              >
                {a.keys}
              </kbd>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default PeopleRail;
