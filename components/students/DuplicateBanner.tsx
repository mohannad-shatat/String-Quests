/**
 * "This student may already exist" banner.
 *
 * A name clash is amber and advisory — schools do enrol two people with the
 * same name. A national-ID clash is red, because that number identifies
 * exactly one person, so the entry is either a typo or a re-registration.
 * Neither prevents saving; both offer to open the record that matched, which
 * is almost always what the user actually wants.
 */

import React from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, UserRound, X } from 'lucide-react';
import type { DuplicateMatch } from './studentMatching';

interface DuplicateBannerProps {
  matches: DuplicateMatch[];
  locale: 'ar' | 'en';
  t: (key: string) => string;
  onOpen: (studentId: string) => void;
  onDismiss: () => void;
}

export const DuplicateBanner: React.FC<DuplicateBannerProps> = ({
  matches,
  locale,
  t,
  onOpen,
  onDismiss,
}) => {
  if (matches.length === 0) return null;

  const isAr = locale === 'ar';
  const blocking = matches.some((m) => m.blocking);
  const OpenIcon = isAr ? ArrowLeft : ArrowRight;

  const shell = blocking
    ? 'rounded-2xl border border-sq-danger-500/40 bg-sq-danger-50 p-4'
    : 'rounded-2xl border border-sq-warning-500/40 bg-sq-warning-50 p-4';
  const titleCls = blocking
    ? 'text-xs font-bold text-sq-danger-700 font-cairo'
    : 'text-xs font-bold text-amber-700 font-cairo';
  const iconCls = blocking
    ? 'w-4 h-4 text-sq-danger-600 shrink-0'
    : 'w-4 h-4 text-amber-600 shrink-0';

  return (
    <div className={shell} role="alert">
      <div className="flex items-start gap-2">
        <AlertTriangle className={iconCls} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className={titleCls}>{blocking ? t('dup.blockingTitle') : t('dup.title')}</p>
          {blocking && (
            <p className="mt-0.5 text-[10px] font-bold text-sq-danger-600/80 font-cairo leading-relaxed">
              {t('dup.blockingHelp')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('dup.dismiss')}
          title={t('dup.dismiss')}
          className="p-1 rounded text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {matches.map(({ student, reasons }) => (
          <li
            key={student.id}
            className="flex items-center gap-2.5 rounded-xl bg-white/80 border border-white p-2.5"
          >
            <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              {student.photoDataUrl ? (
                <img src={student.photoDataUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <UserRound className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              )}
            </span>

            <div className="flex-1 min-w-0">
              <span className="block text-[11px] font-bold text-sq-ink font-cairo truncate">
                {isAr ? student.name : student.nameEn || student.name}
              </span>
              <span className="block text-[10px] font-bold text-slate-400 font-cairo truncate">
                {student.studentId || '—'}
                {student.grade !== null ? ` · ${t('f.grade')} ${student.grade}` : ''}
                {student.section ? ` · ${student.section}` : ''}
              </span>
              <ul className="mt-1 flex flex-wrap gap-1">
                {reasons.map((r) => (
                  <li
                    key={r}
                    className="px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-500 font-cairo"
                  >
                    {r === 'nationalId' ? t('dup.byNationalId') : t('dup.byName')}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onOpen(student.id)}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-sq-ink font-cairo hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
            >
              {t('dup.open')}
              <OpenIcon className="w-3 h-3" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DuplicateBanner;
