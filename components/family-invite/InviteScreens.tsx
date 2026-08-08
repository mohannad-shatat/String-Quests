/**
 * The five screens of the parent linking flow.
 *
 * One file for the same reason the student and teacher sections are one file:
 * they share a props bundle, and five modules would be mostly boilerplate.
 *
 * Screens 1–4 hold one question each and nothing else — no logos, no benefits,
 * no "did you know". A parent who has just scanned a code at a school gate is
 * answering questions, not shopping. The whole case for String is on screen 5,
 * after the link already exists.
 */

import React from 'react';
import {
  BellRing,
  BrainCircuit,
  Check,
  CheckCircle2,
  Copy,
  GraduationCap,
  Info,
  MessageCircle,
  MessagesSquare,
  Phone,
  Send,
  Smartphone,
  TrendingUp,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { STRING_WHATSAPP_NUMBER } from '../students/ParentQrInvite';
import { formatPhone, type InviteAnswers, type InviteErrors, type SiblingCandidate } from './inviteTypes';
import { APP_LAUNCH_WEEKS, FAMILY_APP_URL, fill, type Locale } from './familyInviteI18n';
import type { GuardianRelation, StudentRecord } from '../students/studentTypes';

export interface ScreenProps {
  student: StudentRecord;
  answers: InviteAnswers;
  setAnswer: <K extends keyof InviteAnswers>(key: K, value: InviteAnswers[K]) => void;
  errors: InviteErrors;
  siblings: SiblingCandidate[];
  locale: Locale;
  t: (key: string) => string;
}

/** The child's display name, in the reader's language. */
function displayName(s: StudentRecord, locale: Locale): string {
  return locale === 'ar' ? s.name : s.nameEn || s.name;
}

/* ─── Shared bits ─────────────────────────────────────────────────────── */

const Question: React.FC<{
  label: string;
  why?: string;
  error?: string;
  children: React.ReactNode;
}> = ({ label, why, error, children }) => (
  <div>
    <p className="text-sm font-bold text-sq-ink">{label}</p>
    {children}
    {why && (
      <p className="mt-2 flex items-start gap-1.5 text-[11px] font-bold text-slate-400 leading-relaxed">
        <Info className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
        {why}
      </p>
    )}
    {error && <p className="mt-1.5 text-[11px] font-bold text-sq-danger-600">{error}</p>}
  </div>
);

/** Single-choice pills. Big targets — this is read on a phone, one-handed. */
function ChoiceGroup<T extends string>({
  value,
  options,
  onChange,
  name,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="mt-2.5 flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={
              on
                ? 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-sq-accent-500 bg-sq-accent-500 text-white text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors'
                : 'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors'
            }
          >
            {on && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** The linked number, shown rather than asked for. */
export const LinkedPhone: React.FC<{ phone: string; label: string; note?: string }> = ({
  phone,
  label,
  note,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-[11px] font-bold text-slate-400">{label}</p>
    <p dir="ltr" className="mt-0.5 text-base font-bold text-sq-ink tabular-nums tracking-wide text-start">
      {formatPhone(phone)}
    </p>
    {note && <p className="mt-1 text-[11px] font-bold text-slate-400 leading-relaxed">{note}</p>}
  </div>
);

/* ─── 1 · Confirm the child ───────────────────────────────────────────── */

export const ScreenConfirmChild: React.FC<
  ScreenProps & { onAnswer: (yes: boolean) => void }
> = ({ student, answers, locale, t, onAnswer }) => (
  <div className="space-y-5">
    <h2 className="text-xl font-bold text-sq-ink">{t('s1.title')}</h2>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
      <span className="mx-auto w-14 h-14 rounded-full bg-sq-accent-50 flex items-center justify-center">
        <GraduationCap className="w-6 h-6 text-sq-accent-600" aria-hidden="true" />
      </span>
      <p className="mt-3 text-lg font-bold text-sq-ink">{displayName(student, locale)}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">
        {student.grade !== null
          ? fill(t('s1.grade'), { grade: student.grade, section: student.section || '—' })
          : '—'}
      </p>
    </div>

    <LinkedPhone phone={answers.phone} label={t('s1.phoneLabel')} note={t('s1.phoneNote')} />

    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => onAnswer(true)}
        className="w-full px-5 py-3.5 rounded-xl bg-sq-accent-500 text-white text-sm font-bold shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
      >
        {t('s1.yes')}
      </button>
      <button
        type="button"
        onClick={() => onAnswer(false)}
        className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
      >
        {t('s1.no')}
      </button>
    </div>
  </div>
);

/** Dead end when the parent says it isn't their child. Nothing gets written. */
export const ScreenWrongChild: React.FC<{ t: (key: string) => string; onBack: () => void }> = ({
  t,
  onBack,
}) => (
  <div className="space-y-5 text-center">
    <span className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
      <Info className="w-6 h-6 text-slate-400" aria-hidden="true" />
    </span>
    <h2 className="text-xl font-bold text-sq-ink">{t('s1.wrongTitle')}</h2>
    <p className="text-sm font-bold text-slate-500 leading-relaxed">{t('s1.wrongBody')}</p>
    <button
      type="button"
      onClick={onBack}
      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
    >
      {t('s1.wrongBack')}
    </button>
  </div>
);

/* ─── 2 · You ─────────────────────────────────────────────────────────── */

export const ScreenAboutYou: React.FC<ScreenProps> = ({
  answers, setAnswer, errors, locale, t,
}) => {
  const isAr = locale === 'ar';
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-sq-ink">{t('s2.title')}</h2>

      <Question label={t('s2.name')} error={errors.guardianName}>
        <input
          type="text"
          value={answers.guardianName}
          onChange={(e) => setAnswer('guardianName', e.target.value)}
          placeholder={t('s2.name.ph')}
          aria-label={t('s2.name')}
          dir={isAr ? 'rtl' : 'ltr'}
          autoComplete="name"
          className={
            errors.guardianName
              ? 'mt-2.5 w-full px-4 py-3 rounded-xl border border-sq-danger-500 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sq-danger-500/20'
              : 'mt-2.5 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sq-accent-500/20 focus:border-sq-accent-500'
          }
        />
      </Question>

      <Question label={t('s2.relation')} error={errors.relation}>
        <ChoiceGroup<GuardianRelation>
          name={t('s2.relation')}
          value={answers.relation}
          onChange={(v) => setAnswer('relation', v)}
          options={[
            { value: 'father', label: t('s2.rel.father') },
            { value: 'mother', label: t('s2.rel.mother') },
            { value: 'other', label: t('s2.rel.other') },
          ]}
        />
      </Question>

      <Question
        label={`${t('s2.occupation')} ${t('s2.optional')}`}
        why={t('s2.occupation.why')}
      >
        <input
          type="text"
          value={answers.occupation}
          onChange={(e) => setAnswer('occupation', e.target.value)}
          placeholder={t('s2.occupation.ph')}
          aria-label={t('s2.occupation')}
          dir={isAr ? 'rtl' : 'ltr'}
          autoComplete="organization-title"
          className="mt-2.5 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sq-accent-500/20 focus:border-sq-accent-500"
        />
      </Question>
    </div>
  );
};

/* ─── 3 · Siblings ────────────────────────────────────────────────────── */

export const ScreenSiblings: React.FC<ScreenProps & { onNotFound: () => void }> = ({
  answers, setAnswer, siblings, locale, t, onNotFound,
}) => {
  const toggle = (id: string) =>
    setAnswer(
      'siblingIds',
      answers.siblingIds.includes(id)
        ? answers.siblingIds.filter((x) => x !== id)
        : [...answers.siblingIds, id],
    );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-sq-ink">{t('s3.title')}</h2>
        <p className="mt-1.5 text-sm font-bold text-slate-400">{t('s3.subtitle')}</p>
      </div>

      {siblings.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs font-bold text-slate-400">
          {t('s3.none')}
        </p>
      ) : (
        <ul className="space-y-2">
          {siblings.map((s) => {
            const on = answers.siblingIds.includes(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  aria-pressed={on}
                  className={
                    on
                      ? 'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-sq-accent-500 bg-sq-accent-50 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors'
                      : 'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-start hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors'
                  }
                >
                  <span
                    className={
                      on
                        ? 'w-5 h-5 rounded-md bg-sq-accent-500 flex items-center justify-center shrink-0'
                        : 'w-5 h-5 rounded-md border-2 border-slate-300 shrink-0'
                    }
                  >
                    {on && <Check className="w-3 h-3 text-white" strokeWidth={3} aria-hidden="true" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-sq-ink truncate">
                      {locale === 'ar' ? s.name : s.nameEn || s.name}
                    </span>
                    <span className="block text-[11px] font-bold text-slate-400">
                      {s.grade !== null ? fill(t('s3.gradeShort'), { grade: s.grade }) : ''}
                      {s.section ? ` — ${s.section}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={onNotFound}
        className="w-full text-center text-xs font-bold text-sq-accent-600 hover:text-sq-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 rounded-lg py-2 transition-colors"
      >
        {t('s3.notFound')}
      </button>
    </div>
  );
};

/* ─── 4 · Notification preferences ────────────────────────────────────── */

export const ScreenPreferences: React.FC<ScreenProps> = ({
  student, answers, setAnswer, errors, locale, t,
}) => (
  <div className="space-y-6">
    <h2 className="text-xl font-bold text-sq-ink">{t('s4.title')}</h2>

    <Question label={t('s4.q1')} error={errors.followUp}>
      <ChoiceGroup
        name={t('s4.q1')}
        value={answers.followUp}
        onChange={(v) => setAnswer('followUp', v)}
        options={[
          { value: 'me' as const, label: t('s4.q1.me') },
          { value: 'second' as const, label: t('s4.q1.second') },
          { value: 'both' as const, label: t('s4.q1.both') },
        ]}
      />
    </Question>

    <Question label={t('s4.q2')} error={errors.notifyTime}>
      <ChoiceGroup
        name={t('s4.q2')}
        value={answers.notifyTime}
        onChange={(v) => setAnswer('notifyTime', v)}
        options={[
          { value: 'morning' as const, label: t('s4.q2.morning') },
          { value: 'evening' as const, label: t('s4.q2.evening') },
          { value: 'any' as const, label: t('s4.q2.any') },
        ]}
      />
    </Question>

    <Question
      label={fill(t('s4.q3'), { name: displayName(student, locale).split(' ')[0] })}
      why={t('s4.q3.why')}
      error={errors.childPhone}
    >
      <ChoiceGroup
        name={t('s4.q3')}
        value={answers.childPhone}
        onChange={(v) => setAnswer('childPhone', v)}
        options={[
          { value: 'yes' as const, label: t('s4.q3.yes') },
          { value: 'no' as const, label: t('s4.q3.no') },
          { value: 'borrows' as const, label: t('s4.q3.borrows') },
        ]}
      />
    </Question>
  </div>
);

/* ─── 5 · Done, then the case ─────────────────────────────────────────── */

const BENEFITS: { icon: LucideIcon; titleKey: string; bodyKey: string; tint: string }[] = [
  { icon: CheckCircle2, titleKey: 's5.b1.title', bodyKey: 's5.b1.body', tint: 'text-emerald-500' },
  { icon: TrendingUp, titleKey: 's5.b2.title', bodyKey: 's5.b2.body', tint: 'text-sky-500' },
  { icon: BrainCircuit, titleKey: 's5.b3.title', bodyKey: 's5.b3.body', tint: 'text-violet-500' },
  { icon: MessagesSquare, titleKey: 's5.b4.title', bodyKey: 's5.b4.body', tint: 'text-sq-accent-500' },
];

const APP_FEATURES = ['app.f1', 'app.f2', 'app.f3', 'app.f4', 'app.f5', 'app.f6'];

export const ScreenDone: React.FC<
  ScreenProps & {
    onCopyNumber: () => void;
    numberCopied: boolean;
    secondGuardianUrl: string;
    onRestart: () => void;
  }
> = ({
  student, answers, locale, t, onCopyNumber, numberCopied, secondGuardianUrl, onRestart,
}) => {
  const name = displayName(student, locale);
  const firstName = name.split(' ')[0];

  return (
    <div className="space-y-6">
      {/* Confirmation first — the reason they came. */}
      <div className="text-center">
        <span className="mx-auto w-16 h-16 rounded-full bg-sq-success-50 flex items-center justify-center">
          <Check className="w-8 h-8 text-sq-success-600" strokeWidth={3} aria-hidden="true" />
        </span>
        <p className="mt-3 text-[11px] font-bold text-sq-success-700 uppercase tracking-wide">
          {t('s5.badge')}
        </p>
        <h2 className="mt-1 text-xl font-bold text-sq-ink">{fill(t('s5.title'), { name })}</h2>
        {answers.siblingIds.length > 0 && (
          <p className="mt-2 text-xs font-bold text-slate-500">
            {fill(t('s5.siblingsLinked'), { n: answers.siblingIds.length })}
          </p>
        )}
      </div>

      <LinkedPhone phone={answers.phone} label={t('s5.linkedTo')} />

      {/* What they get */}
      <div>
        <p className="text-sm font-bold text-sq-ink">{t('s5.fromDayOne')}</p>
        <ul className="mt-3 space-y-3">
          {BENEFITS.map((b) => (
            <li key={b.titleKey} className="flex items-start gap-3">
              <b.icon className={`w-5 h-5 shrink-0 mt-0.5 ${b.tint}`} aria-hidden="true" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-sq-ink">{t(b.titleKey)}</span>
                <span className="block text-xs font-bold text-slate-400 leading-relaxed">
                  {t(b.bodyKey)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* The one claim nobody else makes */}
      <div className="rounded-2xl bg-sq-ink text-white p-5">
        <p className="flex items-center gap-2 text-[11px] font-bold text-white/60 uppercase tracking-wide">
          <BrainCircuit className="w-3.5 h-3.5" aria-hidden="true" />
          {t('s5.diff.title')}
        </p>
        <p className="mt-2 text-sm font-bold leading-relaxed">
          {fill(t('s5.diff.body'), { name: firstName })}
        </p>
      </div>

      {/* The family app */}
      <div className="rounded-2xl border border-sq-accent-200 bg-sq-accent-50/40 p-5">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
            <Smartphone className="w-5 h-5 text-sq-accent-600" aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-sq-ink">{t('app.title')}</p>
            <p className="text-[11px] font-bold text-slate-500">{t('app.subtitle')}</p>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {APP_FEATURES.map((key) => (
            <li key={key} className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-sq-accent-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-xs font-bold text-slate-600 leading-relaxed">{t(key)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a
            href={FAMILY_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sq-accent-500 text-white text-xs font-bold hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
            {t('app.download')}
          </a>
          <span className="px-2.5 py-1 rounded-full bg-white text-[10px] font-bold text-slate-500 border border-slate-200">
            {t('app.soon')}
          </span>
        </div>

        <p className="mt-3 text-[11px] font-bold text-slate-500 leading-relaxed">
          {fill(t('app.launchNote'), { weeks: APP_LAUNCH_WEEKS })}
        </p>
      </div>

      {/* Save the number — the notifications depend on it */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
          <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
          {t('save.title')}
        </p>
        <p className="mt-1 text-[11px] font-bold text-amber-800 leading-relaxed">{t('save.body')}</p>
        <div className="mt-3 flex items-center gap-2">
          <span
            dir="ltr"
            className="flex-1 px-3 py-2 rounded-lg bg-white border border-amber-200 text-sm font-bold text-sq-ink tabular-nums tracking-wide text-start"
          >
            {formatPhone(STRING_WHATSAPP_NUMBER)}
          </span>
          <button
            type="button"
            onClick={onCopyNumber}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-amber-200 text-[11px] font-bold text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors shrink-0"
          >
            {numberCopied ? (
              <Check className="w-3.5 h-3.5 text-sq-success-600" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {numberCopied ? t('save.copied') : t('save.copy')}
          </button>
        </div>
      </div>

      {/* Bring the other parent in */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-sq-ink">
          <Users className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          {t('second.title')}
        </p>
        <p className="mt-1 text-[11px] font-bold text-slate-400">
          {fill(t('second.body'), { name: firstName })}
        </p>
        <a
          href={secondGuardianUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sq-success-500 text-white text-sm font-bold hover:bg-sq-success-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-success-500 transition-colors"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
          {t('second.cta')}
        </a>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="w-full text-center text-[11px] font-bold text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 rounded-lg py-2 transition-colors"
      >
        {t('done.restart')}
      </button>
    </div>
  );
};

/** Re-exported so the page can render the same icon set in its header. */
export const INVITE_ICONS = { BellRing, MessageCircle, UserRound };
