/**
 * The step after creating a student: link the family, then finish.
 *
 * Sibling linking used to be a block buried inside the Family section of the
 * form, competing with guardians and the QR invite for attention — so it got
 * skipped, and families arrived unlinked. Pulling it out into its own step
 * after the record exists gives it the one moment where staff have the whole
 * family in mind: they have just typed the surname.
 *
 * Links here write immediately to both students. The record is already saved,
 * so there is nothing left to discard and no reason to defer.
 */

import React from 'react';
import { Check, PartyPopper, UserRound } from 'lucide-react';
import { SiblingLinker } from './SiblingLinker';
import type { SiblingMatch } from './studentMatching';
import type { Guardian, StudentRecord } from './studentTypes';

interface LinkSiblingsStepProps {
  student: StudentRecord;
  allStudents: StudentRecord[];
  suggestions: SiblingMatch[];
  confirmedFamily: SiblingMatch[];
  locale: 'ar' | 'en';
  t: (key: string) => string;
  onLink: (studentId: string) => void;
  onUnlink: () => void;
  onCopyGuardians: (guardians: Guardian[]) => void;
  onFinish: () => void;
  /** Back to the form, for anything that still needs fixing. */
  onEdit: () => void;
}

export const LinkSiblingsStep: React.FC<LinkSiblingsStepProps> = ({
  student,
  allStudents,
  suggestions,
  confirmedFamily,
  locale,
  t,
  onLink,
  onUnlink,
  onCopyGuardians,
  onFinish,
  onEdit,
}) => {
  const name = locale === 'ar' ? student.name : student.nameEn || student.name;
  const linkedCount = confirmedFamily.length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-5 max-w-3xl mx-auto space-y-5">
          {/* Confirm the create landed, before asking for anything else. */}
          <div className="rounded-2xl border border-sq-success-200 bg-sq-success-50 p-5 text-center">
            <span className="mx-auto w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
              <PartyPopper className="w-5 h-5 text-sq-success-600" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-bold text-sq-ink font-cairo">{t('link.created')}</p>
            <p className="mt-1 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 font-cairo">
              {student.photoDataUrl ? (
                <img src={student.photoDataUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <UserRound className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              )}
              {name}
              {student.studentId ? ` · ${student.studentId}` : ''}
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-sq-ink font-cairo">{t('link.title')}</h3>
            <p className="mt-1 text-[11px] font-bold text-slate-400 font-cairo leading-relaxed">
              {t('link.subtitle')}
            </p>
          </div>

          <SiblingLinker
            selfId={student.id}
            allStudents={allStudents}
            suggestions={suggestions}
            confirmedFamily={confirmedFamily}
            locale={locale}
            t={t}
            onLink={onLink}
            onUnlink={onUnlink}
            onCopyGuardians={onCopyGuardians}
            canInherit={student.guardians.every(
              (g) => !(g.name.trim() || g.phone.trim() || g.email.trim() || g.nationalId.trim()),
            )}
          />

          <div className="h-2" />
        </div>
      </div>

      <footer
        className="shrink-0 border-t border-slate-200 bg-white px-5 py-3.5"
        style={{ paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-500 font-cairo truncate">
              {linkedCount > 0
                ? `${t('link.linkedCount')} ${linkedCount}`
                : t('link.noneYet')}
            </p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 font-cairo hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors shrink-0"
          >
            {t('link.backToForm')}
          </button>
          <button
            type="button"
            onClick={onFinish}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sq-accent-500 text-white text-xs font-bold font-cairo shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            {t('link.finish')}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LinkSiblingsStep;
