/**
 * Teacher picker for the Lead Teacher promotion.
 *
 * A Lead Teacher is a teacher who temporarily holds campus-owner permissions —
 * not a second person. So the form starts here: pick the teacher, and their
 * name, campus and contact are read from that record rather than retyped.
 * Entering "Ahmed Al-Mohammed" twice under two ids is exactly the failure this
 * avoids.
 */

import React, { useMemo, useState } from 'react';
import { Check, Search, UserRound, X } from 'lucide-react';
import { EXTENDED_TEACHERS } from '../../data/mockAttendanceData';
import { loadTeachers } from '../../utils/teacherStorage';
import { fromSeedTeacher, subjectLabel } from '../teachers/teacherFilters';
import { normalizeArabic } from '../students/studentMatching';
import type { TeacherRecord } from '../teachers/teacherTypes';
import type { Locale } from '../directory/directoryI18n';

/** Local records win over a seeded record with the same id. */
export function allTeachers(): TeacherRecord[] {
  const local = loadTeachers();
  const localIds = new Set(local.map((t) => t.id));
  return [...local, ...EXTENDED_TEACHERS.map(fromSeedTeacher).filter((t) => !localIds.has(t.id))];
}

export function findTeacher(id: string): TeacherRecord | null {
  return allTeachers().find((t) => t.id === id) ?? null;
}

interface LeadTeacherPickerProps {
  value: string;
  onPick: (teacher: TeacherRecord) => void;
  onClear: () => void;
  locale: Locale;
  t: (key: string) => string;
  error?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

export const LeadTeacherPicker: React.FC<LeadTeacherPickerProps> = ({
  value,
  onPick,
  onClear,
  locale,
  t,
  error,
  inputRef,
}) => {
  const isAr = locale === 'ar';
  const [query, setQuery] = useState('');
  const teachers = useMemo(() => allTeachers(), []);
  const picked = useMemo(() => teachers.find((x) => x.id === value) ?? null, [teachers, value]);

  const results = useMemo(() => {
    const q = normalizeArabic(query);
    if (!q) return teachers.slice(0, 6);
    return teachers
      .filter((x) => normalizeArabic(`${x.name} ${x.nameEn} ${x.subject}`).includes(q))
      .slice(0, 6);
  }, [teachers, query]);

  if (picked) {
    return (
      <div>
        <span className="block mb-1.5 text-xs font-bold text-slate-600 font-cairo">
          {t('f.sourceTeacher')}
          <span className="text-sq-danger-500 ms-0.5">*</span>
        </span>
        <div className="flex items-center gap-3 rounded-xl border border-sq-success-200 bg-sq-success-50 px-4 py-3">
          {picked.photoDataUrl ? (
            <img src={picked.photoDataUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
              <UserRound className="w-4 h-4 text-slate-400" aria-hidden="true" />
            </span>
          )}
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-bold text-sq-ink font-cairo truncate">
              {isAr ? picked.name : picked.nameEn || picked.name}
            </span>
            <span className="block text-[11px] font-bold text-slate-500 font-cairo truncate">
              {[picked.stringId, subjectLabel(picked.subject, locale)].filter(Boolean).join(' · ')}
            </span>
          </span>
          <button
            type="button"
            onClick={onClear}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-500 font-cairo hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
          >
            {t('f.sourceTeacher.change')}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] font-bold text-slate-400 font-cairo">
          {t('f.sourceTeacher.linked')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className="block mb-1.5 text-xs font-bold text-slate-600 font-cairo">
        {t('f.sourceTeacher')}
        <span className="text-sq-danger-500 ms-0.5">*</span>
      </span>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-slate-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('f.sourceTeacher.search')}
          aria-label={t('f.sourceTeacher.search')}
          dir={isAr ? 'rtl' : 'ltr'}
          className={
            error
              ? 'w-full ps-10 pe-10 py-2.5 rounded-xl border border-sq-danger-500 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sq-danger-500/20 font-cairo'
              : 'w-full ps-10 pe-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sq-accent-500/20 focus:border-sq-accent-500 font-cairo'
          }
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t('panel.close')}
            className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded text-slate-300 hover:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <ul className="mt-2 rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        {results.map((x) => (
          <li key={x.id}>
            <button
              type="button"
              onClick={() => onPick(x)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-start hover:bg-sq-accent-50 focus:outline-none focus-visible:bg-sq-accent-50 transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <UserRound className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-bold text-sq-ink font-cairo truncate">
                  {isAr ? x.name : x.nameEn || x.name}
                </span>
                <span className="block text-[10px] font-bold text-slate-400 font-cairo truncate">
                  {subjectLabel(x.subject, locale)}
                </span>
              </span>
              <Check className="w-3.5 h-3.5 text-slate-200 shrink-0" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <p className={error ? 'mt-1.5 text-[11px] font-bold text-sq-danger-600 font-cairo' : 'mt-1.5 text-[11px] font-bold text-slate-400 font-cairo'}>
        {error ?? t('f.sourceTeacher.help')}
      </p>
    </div>
  );
};

export default LeadTeacherPicker;
