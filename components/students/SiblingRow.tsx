/**
 * One candidate or confirmed family member.
 *
 * Extracted from FamilySection so the post-create linking step and the form
 * section render identical rows — a sibling should look the same wherever you
 * are looking at it.
 *
 * `match` is optional: detected candidates carry a score and the reasons they
 * matched, but a student found by manual search has neither. Showing a
 * confidence chip on a row a human picked deliberately would be nonsense.
 */

import React from 'react';
import { ClipboardCopy, Link2, Unlink, UserRound } from 'lucide-react';
import { GuardianSummary } from './GuardianList';
import { siblingConfidence, type SiblingMatch } from './studentMatching';
import type { StudentRecord } from './studentTypes';

interface SiblingRowProps {
  student: StudentRecord;
  /** Present only when the system suggested this row. */
  match?: SiblingMatch;
  locale: 'ar' | 'en';
  t: (key: string) => string;
  confirmed: boolean;
  onLink: () => void;
  onUnlink: () => void;
  /** Offered on confirmed rows when this student has no guardians yet. */
  onCopyGuardians?: () => void;
}

export const SiblingRow: React.FC<SiblingRowProps> = ({
  student: s,
  match,
  locale,
  t,
  confirmed,
  onLink,
  onUnlink,
  onCopyGuardians,
}) => {
  const name = locale === 'ar' ? s.name : s.nameEn || s.name;
  const conf = match ? siblingConfidence(match.score) : null;

  const confClass =
    conf === 'high'
      ? 'bg-sq-success-50 text-sq-success-700 border-sq-success-200'
      : conf === 'medium'
        ? 'bg-sq-warning-50 text-amber-700 border-sq-warning-500/30'
        : 'bg-slate-100 text-slate-500 border-slate-200';

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
          {s.photoDataUrl ? (
            <img src={s.photoDataUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <UserRound className="w-4 h-4 text-slate-400" aria-hidden="true" />
          )}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-sq-ink font-cairo truncate">{name}</span>
            {!confirmed && conf && (
              <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-bold font-cairo ${confClass}`}>
                {t(`family.confidence.${conf}`)}
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold text-slate-400 font-cairo truncate">
            {s.grade !== null ? `${t('f.grade')} ${s.grade}` : ''}
            {s.section ? ` · ${s.section}` : ''}
            {s.studentId ? ` · ${s.studentId}` : ''}
          </p>
          {!confirmed && match && (
            <ul className="mt-1 flex flex-wrap gap-1">
              {match.reasons.map((r) => (
                <li
                  key={r}
                  className="px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[9px] font-bold text-slate-500 font-cairo"
                >
                  {t(`family.reason.${r}`)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {confirmed ? (
          <button
            type="button"
            onClick={onUnlink}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 font-cairo hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
          >
            <Unlink className="w-3 h-3" aria-hidden="true" />
            {t('family.unlink')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onLink}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sq-accent-500 text-white text-[10px] font-bold font-cairo hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
          >
            <Link2 className="w-3 h-3" aria-hidden="true" />
            {t('family.link')}
          </button>
        )}
      </div>

      {/* Once linked, the family's guardians are known — show them rather
          than making staff open the sibling's record to find a phone number. */}
      {confirmed && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 font-cairo">
              {t('family.theirGuardians')}
            </span>
            {onCopyGuardians && (
              <button
                type="button"
                onClick={onCopyGuardians}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-sq-accent-600 hover:text-sq-accent-700 font-cairo focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 rounded px-1 py-0.5 shrink-0"
              >
                <ClipboardCopy className="w-3 h-3" aria-hidden="true" />
                {t('family.copyGuardians')}
              </button>
            )}
          </div>
          <GuardianSummary guardians={s.guardians} locale={locale} t={t} />
        </div>
      )}
    </li>
  );
};

export default SiblingRow;
