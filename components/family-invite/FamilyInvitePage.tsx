/**
 * Family invite — the screens a guardian opens from the WhatsApp link.
 *
 * This is the only surface in the app that isn't for staff. It's sized for a
 * phone held one-handed at a school gate: one question per screen, big targets,
 * no chrome. On a desktop it renders in a phone-width column so the layout
 * being reviewed is the layout parents actually get.
 *
 * Deep link: /family-invite?student=<id>&as=father|mother
 * `as` comes from which QR was scanned, so the relation arrives pre-set.
 *
 * Finishing writes a real link: the guardian goes onto the student record (and
 * onto any siblings confirmed on screen 3), and the preference answers go to
 * localStorage. Nothing is written until screen 4 is submitted — a parent who
 * abandons halfway leaves no trace.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Globe, RotateCcw } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { loadStudents, saveStudents } from '../../utils/studentStorage';
import { loadInvite, saveInvite, clearInvite } from '../../utils/familyInviteStorage';
import { seededStudents } from '../students/seedStudents';
import { buildInviteUrl, type InviteRelation } from '../students/ParentQrInvite';
import type { StudentRecord } from '../students/studentTypes';
import {
  canAdvance,
  emptyAnswers,
  findFamilyCandidates,
  guardianFromAnswers,
  validateStep,
  QUESTION_STEPS,
  type InviteAnswers,
  type InviteErrors,
  type InviteStep,
} from './inviteTypes';
import { fill, getInviteString, type Locale } from './familyInviteI18n';
import {
  ScreenAboutYou,
  ScreenConfirmChild,
  ScreenDone,
  ScreenPreferences,
  ScreenSiblings,
  ScreenWrongChild,
  type ScreenProps,
} from './InviteScreens';

const GRID_BG: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(0deg, rgba(148,163,184,0.16) 0 1px, transparent 1px 24px),' +
    'repeating-linear-gradient(90deg, rgba(148,163,184,0.16) 0 1px, transparent 1px 24px)',
};

/** Local records win over a seeded record with the same id. */
function allStudents(): StudentRecord[] {
  const local = loadStudents();
  const localIds = new Set(local.map((s) => s.id));
  return [...local, ...seededStudents().filter((s) => !localIds.has(s.id))];
}

/**
 * Which student to show when the link carries no id — a demo needs a student
 * who actually has siblings, or screen 3 is permanently empty and reviewers
 * conclude it's broken.
 */
function pickDemoStudent(all: StudentRecord[]): StudentRecord | null {
  const withSiblings = all.find(
    (s) => s.guardians.some((g) => g.phone || g.nationalId) && findFamilyCandidates(s, all).length > 0,
  );
  return withSiblings ?? all[0] ?? null;
}

interface FamilyInvitePageProps {
  onExit?: () => void;
}

export const FamilyInvitePage: React.FC<FamilyInvitePageProps> = ({ onExit }) => {
  const { locale, toggleLocale } = useI18n();
  const reduce = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAr = locale === 'ar';
  const t = useCallback((key: string) => getInviteString(locale as Locale, key), [locale]);

  const [revision, setRevision] = useState(0);
  const students = useMemo(
    () => allStudents(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  const requestedId = searchParams.get('student');
  const student = useMemo(() => {
    const found = requestedId ? students.find((s) => s.id === requestedId) : null;
    return found ?? pickDemoStudent(students);
  }, [requestedId, students]);

  /** Which QR was scanned. Pre-sets the relation; the parent can still change it. */
  const asParam = searchParams.get('as');
  const scannedAs: InviteRelation = asParam === 'mother' ? 'mother' : 'father';

  const siblings = useMemo(
    () => (student ? findFamilyCandidates(student, students) : []),
    [student, students],
  );

  /** The number the invite came from — the guardian's, already on the record. */
  const linkedPhone = useMemo(() => {
    if (!student) return '';
    const match = student.guardians.find((g) => g.relation === scannedAs && g.phone);
    return (match ?? student.guardians.find((g) => g.phone))?.phone ?? student.phone ?? '';
  }, [student, scannedAs]);

  const [step, setStep] = useState<InviteStep>(1);
  const [wrongChild, setWrongChild] = useState(false);
  const [errors, setErrors] = useState<InviteErrors>({});
  const [numberCopied, setNumberCopied] = useState(false);
  const [notFoundNote, setNotFoundNote] = useState(false);

  const [answers, setAnswers] = useState<InviteAnswers>(() =>
    emptyAnswers(student?.id ?? '', linkedPhone),
  );

  // Re-seed when the target student changes (deep link, or the demo resolves).
  const identity = `${student?.id ?? ''}:${scannedAs}`;
  useEffect(() => {
    if (!student) return;
    const saved = loadInvite(student.id);
    setAnswers(
      saved ?? { ...emptyAnswers(student.id, linkedPhone), relation: scannedAs },
    );
    setStep(saved?.completedAt ? 5 : 1);
    setWrongChild(false);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  const setAnswer = useCallback(
    <K extends keyof InviteAnswers>(key: K, value: InviteAnswers[K]) => {
      setAnswers((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!(key in prev)) return prev;
        const { [key as keyof InviteErrors]: _drop, ...rest } = prev;
        void _drop;
        return rest as InviteErrors;
      });
    },
    [],
  );

  /* ─── Finish ─── */

  /**
   * Writes the guardian onto the student and every confirmed sibling, so the
   * link shows up on the roster rather than living only in this flow.
   */
  const commit = useCallback(
    (final: InviteAnswers) => {
      if (!student) return;
      const targets = [student.id, ...final.siblingIds];
      const local = loadStudents();
      const localIds = new Set(local.map((s) => s.id));

      const updated = targets
        .map((id) => students.find((s) => s.id === id))
        .filter((s): s is StudentRecord => !!s)
        .map((s) => ({
          ...s,
          guardians: guardianFromAnswers(final, s.guardians),
          parentLinkMethod: 'qr' as const,
          // Editing a seeded record promotes it to a local one, the same rule
          // the roster applies.
          isLocal: localIds.has(s.id) ? s.isLocal : true,
        }));

      saveStudents(updated);
      saveInvite(final);
      setRevision((r) => r + 1);
    },
    [student, students],
  );

  const goNext = useCallback(() => {
    const fresh = validateStep(step, answers, isAr);
    setErrors(fresh);
    if (Object.keys(fresh).length > 0) return;

    if (step === QUESTION_STEPS) {
      const final = { ...answers, completedAt: Date.now() };
      setAnswers(final);
      commit(final);
      setStep(5);
      return;
    }
    setStep((s) => Math.min(5, s + 1) as InviteStep);
  }, [step, answers, isAr, commit]);

  const goBack = useCallback(() => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1) as InviteStep);
  }, []);

  const restart = useCallback(() => {
    if (!student) return;
    clearInvite(student.id);
    setAnswers({ ...emptyAnswers(student.id, linkedPhone), relation: scannedAs });
    setStep(1);
    setWrongChild(false);
    setErrors({});
  }, [student, linkedPhone, scannedAs]);

  const handleCopyNumber = useCallback(() => {
    navigator.clipboard?.writeText(answers.phone || '').then(
      () => {
        setNumberCopied(true);
        window.setTimeout(() => setNumberCopied(false), 2000);
      },
      () => undefined,
    );
  }, [answers.phone]);

  /* ─── Render ─── */

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-cairo" dir={isAr ? 'rtl' : 'ltr'}>
        <p className="text-sm font-bold text-slate-400">{t('s3.none')}</p>
      </div>
    );
  }

  const screenProps: ScreenProps = {
    student,
    answers,
    setAnswer,
    errors,
    siblings,
    locale: locale as Locale,
    t,
  };

  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const NextIcon = isAr ? ArrowLeft : ArrowRight;
  const showNav = !wrongChild && step > 1 && step <= QUESTION_STEPS;

  /** The other parent's code, for the screen-5 hand-off. */
  const secondGuardianUrl = buildInviteUrl(
    student.name,
    student.studentId,
    locale as Locale,
    answers.relation === 'mother' ? 'father' : 'mother',
  );

  return (
    <div className="min-h-screen bg-slate-100 font-cairo" style={GRID_BG} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Reviewer strip — never shown to a parent. */}
      <div className="bg-sq-ink text-white/80 print:hidden">
        <div className="max-w-md mx-auto px-4 py-2 flex items-center gap-2 text-[10px] font-bold">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              aria-label={t('nav.back')}
              className="p-1 rounded text-white/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-colors"
            >
              <BackIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="px-1.5 py-0.5 rounded bg-white/15 text-white">{t('preview.title')}</span>
          <span className="flex-1 min-w-0 truncate text-white/60">{t('preview.note')}</span>
          <button
            type="button"
            onClick={restart}
            aria-label={t('preview.reset')}
            title={t('preview.reset')}
            className="p-1 rounded text-white/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleLocale}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-colors"
          >
            <Globe className="w-3 h-3" aria-hidden="true" />
            {isAr ? 'EN' : 'عربي'}
          </button>
        </div>
      </div>

      {/* The parent's view, at phone width on any screen. */}
      <div className="max-w-md mx-auto px-4 py-6">
        <header className="flex items-center gap-2.5 mb-5">
          <img src="/string-logo.svg" alt="" className="w-8 h-8 shrink-0" />
          <span className="text-sm font-bold text-sq-ink">{t('brand.name')}</span>
          <span className="flex-1" />
          {step <= QUESTION_STEPS && !wrongChild && (
            <span className="text-[11px] font-bold text-slate-400 tabular-nums">
              {fill(t('page.of'), { n: step, total: QUESTION_STEPS })}
            </span>
          )}
        </header>

        {/* Progress — four steps, so it's worth showing how far in they are. */}
        {step <= QUESTION_STEPS && !wrongChild && (
          <div className="flex gap-1.5 mb-6" aria-hidden="true">
            {Array.from({ length: QUESTION_STEPS }, (_, i) => (
              <span
                key={i}
                className={
                  i < step
                    ? 'h-1 flex-1 rounded-full bg-sq-accent-500 transition-colors'
                    : 'h-1 flex-1 rounded-full bg-slate-200 transition-colors'
                }
              />
            ))}
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={wrongChild ? 'wrong' : step}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={reduce ? { duration: 0 } : { duration: 0.18 }}
            >
              {wrongChild ? (
                <ScreenWrongChild t={t} onBack={() => setWrongChild(false)} />
              ) : step === 1 ? (
                <ScreenConfirmChild
                  {...screenProps}
                  onAnswer={(yes) => {
                    setAnswer('isMyChild', yes);
                    if (yes) setStep(2);
                    else setWrongChild(true);
                  }}
                />
              ) : step === 2 ? (
                <ScreenAboutYou {...screenProps} />
              ) : step === 3 ? (
                <ScreenSiblings {...screenProps} onNotFound={() => setNotFoundNote(true)} />
              ) : step === 4 ? (
                <ScreenPreferences {...screenProps} />
              ) : (
                <ScreenDone
                  {...screenProps}
                  onCopyNumber={handleCopyNumber}
                  numberCopied={numberCopied}
                  secondGuardianUrl={secondGuardianUrl}
                  onRestart={restart}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {notFoundNote && step === 3 && (
            <p className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-[11px] font-bold text-slate-500 leading-relaxed">
              {t('s3.notFoundNote')}
            </p>
          )}

          {showNav && (
            <div className="mt-7 flex items-center gap-3">
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors shrink-0"
              >
                {t('nav.back')}
              </button>
              <span className="flex-1" />
              {step === 3 && answers.siblingIds.length === 0 && (
                <button
                  type="button"
                  onClick={goNext}
                  className="px-4 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors shrink-0"
                >
                  {t('nav.skip')}
                </button>
              )}
              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance(step, answers)}
                className={
                  canAdvance(step, answers)
                    ? 'inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sq-accent-500 text-white text-sm font-bold shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0'
                    : 'inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-200 text-slate-400 text-sm font-bold cursor-not-allowed shrink-0'
                }
              >
                {step === QUESTION_STEPS ? t('nav.finish') : t('nav.next')}
                {step === QUESTION_STEPS ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <NextIcon className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Which student this link points at — reviewer context, not the parent's. */}
        <p className="mt-4 text-center text-[10px] font-bold text-slate-400 print:hidden">
          {t('preview.student')}: {isAr ? student.name : student.nameEn || student.name}
          {student.studentId ? ` · ${student.studentId}` : ''} · {t('preview.as')}:{' '}
          {t(`s2.rel.${scannedAs}`)}
        </p>
      </div>
    </div>
  );
};

export default FamilyInvitePage;
