/**
 * Bulk move — change grade, section and/or campus for many students at once.
 *
 * This is the end-of-year promotion path, so it shows a real before/after
 * count before anything is written: moving 200 students on a misclick is the
 * failure mode worth designing against.
 *
 * Leaving a field blank keeps it unchanged, which is what makes "promote every
 * grade-3 to grade-4 without touching their sections" a single operation.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, ArrowRight, FolderInput, X } from 'lucide-react';
import { SelectField } from './fields/SelectField';
import { CAMPUS_OPTIONS, GRADE_OPTIONS, SECTION_OPTIONS, localized } from './studentOptions';
import { fill, type Locale } from './studentsI18n';
import type { StudentRecord } from './studentTypes';

export interface MoveTarget {
  grade: number | null;
  section: string;
  campusId: string;
}

interface MoveStudentsDialogProps {
  open: boolean;
  students: StudentRecord[];
  locale: Locale;
  t: (key: string) => string;
  onApply: (target: MoveTarget) => void;
  onClose: () => void;
}

export const MoveStudentsDialog: React.FC<MoveStudentsDialogProps> = ({
  open,
  students,
  locale,
  t,
  onApply,
  onClose,
}) => {
  const reduce = useReducedMotion();
  const isAr = locale === 'ar';
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [campusId, setCampusId] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setGrade('');
    setSection('');
    setCampusId('');
    setAcknowledged(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  const hasChange = !!(grade || section || campusId);
  /** Only grade/section/campus changes rebuild a student's spaces. */
  const movesSection = !!(grade || section || campusId);

  /** How many of the selected students this would actually alter. */
  const affected = useMemo(() => {
    if (!hasChange) return 0;
    return students.filter((s) => {
      if (grade && String(s.grade ?? '') !== grade) return true;
      if (section && s.section !== section) return true;
      if (campusId && s.campusId !== campusId) return true;
      return false;
    }).length;
  }, [students, grade, section, campusId, hasChange]);

  const Arrow = isAr ? ArrowLeft : ArrowRight;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.18 }}
          onClick={onClose}
          dir={isAr ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <motion.div
            initial={reduce ? false : { scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 10 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('move.title')}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden font-cairo"
          >
            <header className="relative flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <span className="w-9 h-9 rounded-xl bg-sq-accent-50 flex items-center justify-center shrink-0">
                <FolderInput className="w-4 h-4 text-sq-accent-600" aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-sq-ink">{t('move.title')}</h2>
                <p className="text-[11px] font-bold text-slate-400">
                  {students.length} {t('bulk.selected')}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t('panel.close')}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="px-5 py-5 space-y-4">
              <p className="text-[11px] font-bold text-slate-400">{t('move.body')}</p>

              <SelectField
                id="move-grade"
                label={t('f.grade')}
                value={grade}
                onChange={setGrade}
                locale={locale}
                options={localized(GRADE_OPTIONS, locale)}
                placeholder={t('f.select')}
              />
              <SelectField
                id="move-section"
                label={t('f.section')}
                value={section}
                onChange={setSection}
                locale={locale}
                options={localized(SECTION_OPTIONS, locale)}
                placeholder={t('f.select')}
              />
              <SelectField
                id="move-campus"
                label={t('f.campus')}
                value={campusId}
                onChange={setCampusId}
                locale={locale}
                options={localized(CAMPUS_OPTIONS, locale)}
                placeholder={t('f.select')}
              />

              {/* Spaces don't follow a move. A student's enrolledSpaces encode
                  grade+section (`space-c1-3A-…`), and attendance/progress are
                  keyed off them — so changing either orphans that history.
                  Surfaced before the action, and acknowledged explicitly. */}
              {movesSection && (
                <div className="rounded-xl border border-sq-warning-500/40 bg-sq-warning-50 p-3">
                  <p className="flex items-start gap-2 text-[11px] font-bold text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
                    {t('move.warnTitle')}
                  </p>
                  <p className="mt-1 ms-5 text-[10px] font-bold text-amber-700/90 leading-relaxed">
                    {t('move.warnBody')}
                  </p>
                  <label className="mt-2 ms-5 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-amber-800">{t('move.warnAck')}</span>
                  </label>
                </div>
              )}

              {/* Preview — never apply a bulk change unseen. */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  {t('move.preview')}
                </p>
                {hasChange ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Arrow className="w-3.5 h-3.5 text-sq-accent-500 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-bold text-sq-ink">
                      {fill(t('move.willChange'), { n: affected })}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {grade && (
                        <span className="px-1.5 py-0.5 rounded-full bg-sq-accent-50 border border-sq-accent-200 text-[10px] font-bold text-sq-accent-700">
                          {t('f.grade')}: {grade}
                        </span>
                      )}
                      {section && (
                        <span className="px-1.5 py-0.5 rounded-full bg-sq-accent-50 border border-sq-accent-200 text-[10px] font-bold text-sq-accent-700">
                          {t('f.section')}: {section}
                        </span>
                      )}
                      {campusId && (
                        <span className="px-1.5 py-0.5 rounded-full bg-sq-accent-50 border border-sq-accent-200 text-[10px] font-bold text-sq-accent-700">
                          {t('f.campus')}
                        </span>
                      )}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-400">{t('move.noChange')}</p>
                )}
              </div>
            </div>

            <footer className="flex gap-2 px-5 py-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
              >
                {t('panel.cancel')}
              </button>
              <button
                type="button"
                disabled={!hasChange || (movesSection && !acknowledged)}
                onClick={() =>
                  onApply({ grade: grade ? Number(grade) : null, section, campusId })
                }
                className="flex-1 rounded-xl bg-sq-accent-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
              >
                {t('move.apply')}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MoveStudentsDialog;
