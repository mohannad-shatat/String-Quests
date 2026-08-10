/**
 * Family linking — what the system found, plus a way to find what it didn't.
 *
 * Detection (studentMatching.ts) only fires on a shared guardian ID, a shared
 * guardian phone, or a shared surname. That misses real families constantly:
 * a mother recorded on one child and a father on the other, a remarried
 * parent, a guardian entered with a typo, a sibling enrolled before phone
 * numbers were collected. So the suggestions are the fast path, and the search
 * below them is the honest fallback — staff who *know* two students are
 * siblings can just say so.
 *
 * Search results deliberately carry no confidence chip. A row a human picked
 * by name isn't a guess.
 */

import React, { useMemo, useState } from 'react';
import { Search, Sparkles, UserCheck, UserRoundSearch, X } from 'lucide-react';
import { SiblingRow } from './SiblingRow';
import { buildSearchIndex, searchStudents } from './studentSearch';
import type { SiblingMatch } from './studentMatching';
import type { Guardian, StudentRecord } from './studentTypes';

/** Enough to choose from without turning the panel into a roster. */
const MAX_RESULTS = 6;

interface SiblingLinkerProps {
  /** The student being linked *from*. Excluded from its own results. */
  selfId: string;
  /** Everyone, for the manual search. */
  allStudents: StudentRecord[];
  suggestions: SiblingMatch[];
  confirmedFamily: SiblingMatch[];
  locale: 'ar' | 'en';
  t: (key: string) => string;
  onLink: (studentId: string) => void;
  onUnlink: () => void;
  /** Offered on confirmed rows when this student has no guardians of its own. */
  onCopyGuardians?: (guardians: Guardian[]) => void;
  canInherit?: boolean;
}

export const SiblingLinker: React.FC<SiblingLinkerProps> = ({
  selfId,
  allStudents,
  suggestions,
  confirmedFamily,
  locale,
  t,
  onLink,
  onUnlink,
  onCopyGuardians,
  canInherit,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const index = useMemo(() => buildSearchIndex(allStudents), [allStudents]);

  /** Anything already on screen above shouldn't reappear in the results. */
  const shown = useMemo(() => {
    const ids = new Set<string>([selfId]);
    for (const m of confirmedFamily) ids.add(m.student.id);
    for (const m of suggestions) ids.add(m.student.id);
    return ids;
  }, [selfId, confirmedFamily, suggestions]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const hits = searchStudents(index, query);
    if (!hits) return [];
    return hits.filter((h) => !shown.has(h.student.id)).slice(0, MAX_RESULTS);
  }, [index, query, shown]);

  return (
    <div className="space-y-4">
      {/* ── Confirmed ── */}
      {confirmedFamily.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-sq-success-700 font-cairo mb-2">
            <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
            {t('family.confirmed')}
          </h4>
          <ul className="space-y-2">
            {confirmedFamily.map((m) => (
              <SiblingRow
                key={m.student.id}
                student={m.student}
                locale={locale}
                t={t}
                confirmed
                onLink={() => onLink(m.student.id)}
                onUnlink={onUnlink}
                onCopyGuardians={
                  canInherit &&
                  onCopyGuardians &&
                  m.student.guardians.some((g) => g.name.trim() || g.phone.trim())
                    ? () => onCopyGuardians(m.student.guardians)
                    : undefined
                }
              />
            ))}
          </ul>
        </div>
      )}

      {/* ── Detected ── */}
      {suggestions.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 font-cairo">
            <Sparkles className="w-3.5 h-3.5 text-sq-accent-500" aria-hidden="true" />
            {t('family.siblings')}
          </h4>
          <p className="text-[10px] font-bold text-slate-400 font-cairo mb-2">
            {t('family.siblings.hint')}
          </p>
          <ul className="space-y-2">
            {suggestions.map((m) => (
              <SiblingRow
                key={m.student.id}
                student={m.student}
                match={m}
                locale={locale}
                t={t}
                confirmed={false}
                onLink={() => onLink(m.student.id)}
                onUnlink={onUnlink}
              />
            ))}
          </ul>
        </div>
      )}

      {suggestions.length === 0 && confirmedFamily.length === 0 && (
        <p className="text-[11px] font-bold text-slate-400 font-cairo">{t('family.siblings.none')}</p>
      )}

      {/* ── Manual search: the fallback for everything detection can't see ── */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
        {!searchOpen ? (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 rounded-lg p-1"
          >
            <UserRoundSearch className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] font-bold text-sq-ink font-cairo">
                {t('family.manualLink')}
              </span>
              <span className="block text-[10px] font-bold text-slate-400 font-cairo leading-snug">
                {t('family.manualLink.hint')}
              </span>
            </span>
          </button>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex-1 min-w-0 text-[11px] font-bold text-sq-ink font-cairo truncate">
                {t('family.manualLink')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery('');
                }}
                aria-label={t('panel.close')}
                className="p-1 rounded text-slate-300 hover:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute top-1/2 -translate-y-1/2 start-3 w-3.5 h-3.5 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('family.searchPh')}
                aria-label={t('family.searchPh')}
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
                className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 font-cairo focus:outline-none focus:ring-2 focus:ring-sq-accent-500/20 focus:border-sq-accent-500"
              />
            </div>

            {query.trim() && (
              results.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {results.map((h) => (
                    <SiblingRow
                      key={h.student.id}
                      student={h.student}
                      locale={locale}
                      t={t}
                      confirmed={false}
                      onLink={() => {
                        onLink(h.student.id);
                        setQuery('');
                      }}
                      onUnlink={onUnlink}
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[10px] font-bold text-slate-400 font-cairo text-center py-3">
                  {t('family.searchNone')}
                </p>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SiblingLinker;
