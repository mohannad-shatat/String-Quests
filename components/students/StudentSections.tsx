/**
 * The five form sections, plus the card shell they share.
 *
 * Kept in one file because all five take the identical props bundle — five
 * near-empty modules re-declaring it would be more boilerplate than content.
 *
 * `SqFormSection` was considered and passed over: it composes SqCard's
 * `section` variant, whose header treatment is tied to the violet brand. This
 * surface follows the pink enrolment language instead, so it owns a small
 * local shell.
 */

import React from 'react';
import {
  Check,
  UserRound,
  GraduationCap,
  Mail,
  Users,
  KeyRound,
  IdCard,
  Phone,
  MapPin,
  RefreshCw,
  Copy,
  Lock,
  KeyRound as KeyRoundIcon,
  type LucideIcon,
} from 'lucide-react';
import { TextField } from './fields/TextField';
import { SelectField } from './fields/SelectField';
import { PhotoField } from './fields/PhotoField';
import { PasswordField } from './fields/PasswordField';
import {
  GENDER_OPTIONS,
  GRADE_OPTIONS,
  SECTION_OPTIONS,
  CAMPUS_OPTIONS,
  STUDY_SYSTEM_OPTIONS,
  STUDY_FOCUS_OPTIONS,
  NATIONALITY_OPTIONS,
  localized,
  dialCodeFor,
} from './studentOptions';
import type { SectionStatus, StudentErrors, StudentErrorKey, StudentRecord } from './studentTypes';
import type { Locale } from './studentsI18n';

/* ─── Shared shell ────────────────────────────────────────────────────── */

interface SectionCardProps {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  status: SectionStatus;
  optionalLabel: string;
  children: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  id,
  icon: Icon,
  title,
  subtitle,
  status,
  optionalLabel,
  children,
}) => (
  <section
    id={id}
    // scroll-mt keeps the sticky panel header from covering the heading when
    // the rail jumps here.
    className="scroll-mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
  >
    <header className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
      <span className="w-9 h-9 rounded-xl bg-sq-accent-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-sq-accent-600" aria-hidden="true" />
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-sq-ink font-cairo truncate">{title}</h3>
        <p className="text-[11px] font-bold text-slate-400 font-cairo truncate">{subtitle}</p>
      </div>
      {status === true ? (
        <span className="w-6 h-6 rounded-full bg-sq-success-500 flex items-center justify-center shrink-0">
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} aria-hidden="true" />
        </span>
      ) : status === 'optional' ? (
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold font-cairo shrink-0">
          {optionalLabel}
        </span>
      ) : (
        <span className="w-6 h-6 rounded-full border-2 border-slate-200 shrink-0" aria-hidden="true" />
      )}
    </header>
    <div className="p-5 space-y-4">{children}</div>
  </section>
);

/* ─── Shared props ────────────────────────────────────────────────────── */

export interface SectionProps {
  record: StudentRecord;
  setField: <K extends keyof StudentRecord>(field: K, value: StudentRecord[K]) => void;
  blurField: (field: StudentErrorKey) => void;
  errors: StudentErrors;
  completion: Record<string, SectionStatus>;
  locale: Locale;
  t: (key: string) => string;
  /** Registers a control so "jump to first error" can focus it. */
  registerRef: (key: StudentErrorKey) => (el: HTMLElement | null) => void;
}

const GRID = 'grid grid-cols-1 sm:grid-cols-2 gap-4';

/* ─── Identity ────────────────────────────────────────────────────────── */

interface IdentityProps extends SectionProps {
  /** False until every required field is filled — see `readyForId`. */
  idIssued: boolean;
}

export const IdentitySection: React.FC<IdentityProps> = ({
  record, setField, blurField, errors, completion, locale, t, registerRef, idIssued,
}) => (
  <SectionCard
    id="stu-section-identity"
    icon={UserRound}
    title={t('sec.identity')}
    subtitle={t('sec.identity.sub')}
    status={completion['stu-section-identity']}
    optionalLabel={t('f.optionalShort')}
  >
    <div className="flex flex-col sm:flex-row gap-5">
      <PhotoField
        label={t('f.photo')}
        dropHint={t('f.photo.drop')}
        removeLabel={t('f.photo.remove')}
        value={record.photoDataUrl}
        onChange={(v) => setField('photoDataUrl', v)}
        locale={locale}
        className="shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-4">
        <TextField
          id="stu-name"
          label={t('f.name')}
          value={record.name}
          onChange={(v) => setField('name', v)}
          onBlur={() => blurField('name')}
          locale={locale}
          required
          error={errors.name}
          inputRef={registerRef('name')}
          autoComplete="off"
        />
        <TextField
          id="stu-nameEn"
          label={t('f.nameEn')}
          value={record.nameEn}
          onChange={(v) => setField('nameEn', v)}
          locale={locale}
          optionalHint={t('f.optional')}
          autoComplete="off"
        />
      </div>
    </div>

    {/* The String ID is issued by the system, never typed and never reissued.
        Until every required field is filled it shows a locked placeholder —
        minting an identifier against a half-filled form creates numbers that
        belong to no-one. There is deliberately no regenerate action. */}
    <div>
      <span className="block mb-1.5 text-xs font-bold text-slate-600 font-cairo">
        {t('f.stringId')}
      </span>

      {idIssued ? (
        <div className="flex items-center gap-2 rounded-xl border border-sq-success-200 bg-sq-success-50 px-4 py-3">
          <IdCard className="w-4 h-4 text-sq-success-600 shrink-0" aria-hidden="true" />
          <span dir="ltr" className="flex-1 font-mono text-sm font-bold text-sq-ink tracking-wide">
            {record.studentId}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sq-success-700 font-cairo shrink-0">
            <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
            {t('f.stringId.issued')}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
          <Lock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="text-sm font-bold text-slate-400 font-cairo">
            {t('f.stringId.pending')}
          </span>
        </div>
      )}
      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-slate-400 font-cairo">
        {idIssued && <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />}
        {idIssued ? t('f.stringId.permanent') : t('f.stringId.pendingHelp')}
      </p>
    </div>

    <div className={GRID}>
      <SelectField
        id="stu-gender"
        label={t('f.gender')}
        value={record.gender}
        onChange={(v) => setField('gender', v as StudentRecord['gender'])}
        onBlur={() => blurField('gender')}
        locale={locale}
        options={localized(GENDER_OPTIONS, locale)}
        placeholder={t('f.select')}
        required
        error={errors.gender}
        selectRef={registerRef('gender')}
      />
      <TextField
        id="stu-dob"
        label={t('f.dob')}
        value={record.dateOfBirth}
        onChange={(v) => setField('dateOfBirth', v)}
        onBlur={() => blurField('dateOfBirth')}
        locale={locale}
        type="date"
        required
        error={errors.dateOfBirth}
        inputRef={registerRef('dateOfBirth')}
      />
    </div>

    <div className={GRID}>
      <SelectField
        id="stu-nationality"
        label={t('f.nationality')}
        value={record.nationality}
        onChange={(v) => setField('nationality', v)}
        locale={locale}
        options={localized(NATIONALITY_OPTIONS, locale)}
        placeholder={t('f.select')}
        optionalHint={t('f.optional')}
      />
      <TextField
        id="stu-nationalId"
        label={t('f.nationalId')}
        value={record.nationalId}
        onChange={(v) => setField('nationalId', v)}
        locale={locale}
        optionalHint={t('f.optional')}
      />
    </div>
  </SectionCard>
);

/* ─── Academic ────────────────────────────────────────────────────────── */

export const AcademicSection: React.FC<SectionProps> = ({
  record, setField, blurField, errors, completion, locale, t, registerRef,
}) => (
  <SectionCard
    id="stu-section-academic"
    icon={GraduationCap}
    title={t('sec.academic')}
    subtitle={t('sec.academic.sub')}
    status={completion['stu-section-academic']}
    optionalLabel={t('f.optionalShort')}
  >
    <div className={GRID}>
      <SelectField
        id="stu-grade"
        label={t('f.grade')}
        value={record.grade === null ? '' : String(record.grade)}
        onChange={(v) => setField('grade', v === '' ? null : Number(v))}
        onBlur={() => blurField('grade')}
        locale={locale}
        options={localized(GRADE_OPTIONS, locale)}
        placeholder={t('f.select')}
        required
        error={errors.grade}
        selectRef={registerRef('grade')}
      />
      <SelectField
        id="stu-section"
        label={t('f.section')}
        value={record.section}
        onChange={(v) => setField('section', v)}
        onBlur={() => blurField('section')}
        locale={locale}
        options={localized(SECTION_OPTIONS, locale)}
        placeholder={t('f.select')}
        required
        error={errors.section}
        selectRef={registerRef('section')}
      />
    </div>

    <SelectField
      id="stu-campus"
      label={t('f.campus')}
      value={record.campusId}
      onChange={(v) => setField('campusId', v)}
      locale={locale}
      options={localized(CAMPUS_OPTIONS, locale)}
      placeholder={t('f.select')}
      optionalHint={t('f.optional')}
    />

    <div className={GRID}>
      <SelectField
        id="stu-studySystem"
        label={t('f.studySystem')}
        value={record.studySystem}
        onChange={(v) => setField('studySystem', v)}
        locale={locale}
        options={localized(STUDY_SYSTEM_OPTIONS, locale)}
        placeholder={t('f.select')}
        optionalHint={t('f.optional')}
      />
      <SelectField
        id="stu-studyFocus"
        label={t('f.studyFocus')}
        value={record.studyFocus}
        onChange={(v) => setField('studyFocus', v)}
        locale={locale}
        options={localized(STUDY_FOCUS_OPTIONS, locale)}
        placeholder={t('f.select')}
        optionalHint={t('f.optional')}
      />
    </div>
  </SectionCard>
);

/* ─── Contact ─────────────────────────────────────────────────────────── */

export const ContactSection: React.FC<SectionProps> = ({
  record, setField, blurField, errors, completion, locale, t, registerRef,
}) => (
  <SectionCard
    id="stu-section-contact"
    icon={Mail}
    title={t('sec.contact')}
    subtitle={t('sec.contact.sub')}
    status={completion['stu-section-contact']}
    optionalLabel={t('f.optionalShort')}
  >
    <div className={GRID}>
      <TextField
        id="stu-email"
        label={t('f.email')}
        value={record.email}
        onChange={(v) => setField('email', v)}
        onBlur={() => blurField('email')}
        locale={locale}
        type="email"
        optionalHint={t('f.optional')}
        placeholder="student@example.com"
        error={errors.email}
        leadingIcon={Mail}
        inputRef={registerRef('email')}
      />
      <TextField
        id="stu-phone"
        label={t('f.phone')}
        value={record.phone}
        onChange={(v) => setField('phone', v)}
        onBlur={() => blurField('phone')}
        locale={locale}
        type="tel"
        optionalHint={t('f.optional')}
        prefix={dialCodeFor(record.nationality)}
        error={errors.phone}
        inputRef={registerRef('phone')}
      />
    </div>

    <TextField
      id="stu-address"
      label={t('f.address')}
      value={record.address}
      onChange={(v) => setField('address', v)}
      locale={locale}
      optionalHint={t('f.optional')}
      leadingIcon={MapPin}
    />

    <TextField
      id="stu-bio"
      label={t('f.bio')}
      value={record.bio}
      onChange={(v) => setField('bio', v)}
      locale={locale}
      multiline
      optionalHint={t('f.optional')}
    />
  </SectionCard>
);

/* Guardian fields now live in FamilySection.tsx, alongside sibling linking
   and the QR parent invite. */

/* ─── Credentials ─────────────────────────────────────────────────────── */

interface CredentialsProps extends SectionProps {
  passwordVisible: boolean;
  onTogglePassword: () => void;
  onGeneratePassword: () => void;
  onCopyLogin: () => void;
  /** Only offered for saved records — there's nothing to reset before that. */
  onResetPassword?: () => void;
}

export const CredentialsSection: React.FC<CredentialsProps> = ({
  record, setField, blurField, errors, completion, locale, t, registerRef,
  passwordVisible, onTogglePassword, onGeneratePassword, onCopyLogin, onResetPassword,
}) => (
  <SectionCard
    id="stu-section-credentials"
    icon={KeyRound}
    title={t('sec.credentials')}
    subtitle={t('sec.credentials.sub')}
    status={completion['stu-section-credentials']}
    optionalLabel={t('f.optionalShort')}
  >
    <TextField
      id="stu-loginEmail"
      label={t('f.loginEmail')}
      value={record.loginEmail}
      onChange={(v) => setField('loginEmail', v)}
      onBlur={() => blurField('loginEmail')}
      locale={locale}
      type="email"
      required
      error={errors.loginEmail}
      leadingIcon={Mail}
      placeholder="student@school.edu"
      inputRef={registerRef('loginEmail')}
      autoComplete="off"
    />

    <PasswordField
      id="stu-password"
      label={t('f.password')}
      value={record.password}
      onChange={(v) => setField('password', v)}
      onBlur={() => blurField('password')}
      onGenerate={onGeneratePassword}
      locale={locale}
      visible={passwordVisible}
      onToggleVisible={onTogglePassword}
      showLabel={t('f.password.show')}
      hideLabel={t('f.password.hide')}
      generateLabel={t('f.password.gen')}
      required
      error={errors.password}
      inputRef={registerRef('password')}
    />

    <div className="flex flex-col sm:flex-row gap-2">
      <button
        type="button"
        onClick={onCopyLogin}
        disabled={!record.loginEmail.trim() || !record.password}
        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-sq-ink font-cairo hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
      >
        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
        {t('f.copyLogin')}
      </button>

      {onResetPassword && (
        <button
          type="button"
          onClick={onResetPassword}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-sq-accent-200 bg-sq-accent-50 px-4 py-2.5 text-xs font-bold text-sq-accent-700 font-cairo hover:bg-sq-accent-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
        >
          <KeyRoundIcon className="w-3.5 h-3.5" aria-hidden="true" />
          {t('reset.title')}
        </button>
      )}
    </div>
  </SectionCard>
);

/* Re-exported so the rail and the form agree on the icon per section. */
export const SECTION_ICONS: Record<string, LucideIcon> = {
  'stu-section-identity': UserRound,
  'stu-section-academic': GraduationCap,
  'stu-section-contact': Phone,
  'stu-section-family': Users,
  'stu-section-credentials': KeyRound,
};
