/**
 * The five teacher form sections.
 *
 * Kept in one file for the same reason the student sections are: all five take
 * an identical props bundle, so five modules would be mostly boilerplate.
 *
 * No Family section — guardians and sibling detection are student concepts.
 */

import React from 'react';
import {
  Check,
  GraduationCap,
  IdCard,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Briefcase,
  UserRound,
  Copy,
  X,
  type LucideIcon,
} from 'lucide-react';
import { TextField } from '../students/fields/TextField';
import { SelectField } from '../students/fields/SelectField';
import { PhotoField } from '../students/fields/PhotoField';
import { PasswordField } from '../students/fields/PasswordField';
import { GENDER_OPTIONS, NATIONALITY_OPTIONS, SECTION_OPTIONS, localized } from '../students/studentOptions';
import { GRADES } from '../../data/adminData';
import { CAMPUSES } from '../../data/mockAttendanceData';
import { SUBJECTS, subjectLabel } from './teacherFilters';
import type { SectionStatus, TeacherErrors, TeacherErrorKey, TeacherRecord } from './teacherTypes';
import type { Locale } from './teachersI18n';

const GRID = 'grid grid-cols-1 sm:grid-cols-2 gap-4';

/* ─── Shell ───────────────────────────────────────────────────────────── */

export const SectionCard: React.FC<{
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  status: SectionStatus;
  optionalLabel: string;
  children: React.ReactNode;
}> = ({ id, icon: Icon, title, subtitle, status, optionalLabel, children }) => (
  <section id={id} className="scroll-mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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

/** Multi-select as toggle chips — grades and sections are both small sets. */
const ChipMulti: React.FC<{
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  optionalHint?: string;
}> = ({ label, options, selected, onToggle, optionalHint }) => (
  <div>
    <span className="block mb-1.5 text-xs font-bold text-slate-600 font-cairo">
      {label}
      {optionalHint && <span className="ms-1 font-medium text-slate-400">{optionalHint}</span>}
    </span>
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            aria-pressed={on}
            className={
              on
                ? 'px-2.5 py-1 rounded-full border border-sq-accent-500 bg-sq-accent-500 text-[11px] font-bold text-white font-cairo focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors'
                : 'px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-bold text-slate-600 font-cairo hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors'
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  </div>
);

/* ─── Props ───────────────────────────────────────────────────────────── */

export interface TeacherSectionProps {
  record: TeacherRecord;
  setField: <K extends keyof TeacherRecord>(field: K, value: TeacherRecord[K]) => void;
  blurField: (field: TeacherErrorKey) => void;
  errors: TeacherErrors;
  completion: Record<string, SectionStatus>;
  locale: Locale;
  t: (key: string) => string;
  registerRef: (key: TeacherErrorKey) => (el: HTMLElement | null) => void;
}

/* ─── Identity ────────────────────────────────────────────────────────── */

export const IdentitySection: React.FC<TeacherSectionProps & { idIssued: boolean }> = ({
  record, setField, blurField, errors, completion, locale, t, registerRef, idIssued,
}) => (
  <SectionCard
    id="tea-section-identity"
    icon={UserRound}
    title={t('sec.identity')}
    subtitle={t('sec.identity.sub')}
    status={completion['tea-section-identity']}
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
          id="tea-name"
          label={t('f.name')}
          value={record.name}
          onChange={(v) => setField('name', v)}
          onBlur={() => blurField('name')}
          locale={locale}
          required
          error={errors.name}
          inputRef={registerRef('name')}
        />
        <TextField
          id="tea-nameEn"
          label={t('f.nameEn')}
          value={record.nameEn}
          onChange={(v) => setField('nameEn', v)}
          locale={locale}
          optionalHint={t('f.optional')}
        />
      </div>
    </div>

    {/* System-issued, permanent, never regenerated — same rule as students. */}
    <div>
      <span className="block mb-1.5 text-xs font-bold text-slate-600 font-cairo">{t('f.stringId')}</span>
      {idIssued ? (
        <div className="flex items-center gap-2 rounded-xl border border-sq-success-200 bg-sq-success-50 px-4 py-3">
          <IdCard className="w-4 h-4 text-sq-success-600 shrink-0" aria-hidden="true" />
          <span dir="ltr" className="flex-1 font-mono text-sm font-bold text-sq-ink tracking-wide">
            {record.stringId}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sq-success-700 font-cairo shrink-0">
            <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
            {t('f.stringId.issued')}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
          <Lock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="text-sm font-bold text-slate-400 font-cairo">{t('f.stringId.pending')}</span>
        </div>
      )}
      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-slate-400 font-cairo">
        {idIssued && <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />}
        {idIssued ? t('f.stringId.permanent') : t('f.stringId.pendingHelp')}
      </p>
    </div>

    <div className={GRID}>
      <SelectField
        id="tea-gender"
        label={t('f.gender')}
        value={record.gender}
        onChange={(v) => setField('gender', v as TeacherRecord['gender'])}
        onBlur={() => blurField('gender')}
        locale={locale}
        options={localized(GENDER_OPTIONS, locale)}
        placeholder={t('f.select')}
        required
        error={errors.gender}
        selectRef={registerRef('gender')}
      />
      <TextField
        id="tea-dob"
        label={t('f.dob')}
        value={record.dateOfBirth}
        onChange={(v) => setField('dateOfBirth', v)}
        locale={locale}
        type="date"
        optionalHint={t('f.optional')}
      />
    </div>

    <div className={GRID}>
      <SelectField
        id="tea-nationality"
        label={t('f.nationality')}
        value={record.nationality}
        onChange={(v) => setField('nationality', v)}
        locale={locale}
        options={localized(NATIONALITY_OPTIONS, locale)}
        placeholder={t('f.select')}
        optionalHint={t('f.optional')}
      />
      <TextField
        id="tea-nationalId"
        label={t('f.nationalId')}
        value={record.nationalId}
        onChange={(v) => setField('nationalId', v)}
        locale={locale}
        optionalHint={t('f.optional')}
      />
    </div>
  </SectionCard>
);

/* ─── Subjects & Classes ──────────────────────────────────────────────── */

export const SubjectsSection: React.FC<TeacherSectionProps> = ({
  record, setField, blurField, errors, completion, locale, t, registerRef,
}) => (
  <SectionCard
    id="tea-section-subjects"
    icon={GraduationCap}
    title={t('sec.subjects')}
    subtitle={t('sec.subjects.sub')}
    status={completion['tea-section-subjects']}
    optionalLabel={t('f.optionalShort')}
  >
    <div className={GRID}>
      <SelectField
        id="tea-subject"
        label={t('f.subject')}
        value={record.subject}
        onChange={(v) => setField('subject', v)}
        onBlur={() => blurField('subject')}
        locale={locale}
        options={SUBJECTS.map((s) => ({ value: s, label: subjectLabel(s, locale) }))}
        placeholder={t('f.select')}
        required
        error={errors.subject}
        selectRef={registerRef('subject')}
      />
      <SelectField
        id="tea-campus"
        label={t('f.campus')}
        value={record.campusId}
        onChange={(v) => setField('campusId', v)}
        onBlur={() => blurField('campusId')}
        locale={locale}
        options={CAMPUSES.map((c) => ({ value: c.id, label: locale === 'ar' ? c.name : c.nameEn }))}
        placeholder={t('f.select')}
        required
        error={errors.campusId}
        selectRef={registerRef('campusId')}
      />
    </div>

    <ChipMulti
      label={t('f.grades')}
      options={GRADES.map((g) => ({ value: String(g), label: String(g) }))}
      selected={record.grades.map(String)}
      onToggle={(v) => {
        const n = Number(v);
        setField(
          'grades',
          record.grades.includes(n)
            ? record.grades.filter((g) => g !== n)
            : [...record.grades, n].sort((a, b) => a - b),
        );
      }}
    />

    <ChipMulti
      label={t('f.sections')}
      options={SECTION_OPTIONS.map((s) => ({ value: s.value, label: s.value }))}
      selected={record.sections}
      onToggle={(v) =>
        setField(
          'sections',
          record.sections.includes(v)
            ? record.sections.filter((s) => s !== v)
            : [...record.sections, v].sort(),
        )
      }
      optionalHint={t('f.optional')}
    />
  </SectionCard>
);

/* ─── Employment & About ──────────────────────────────────────────────── */

export const EmploymentSection: React.FC<TeacherSectionProps> = ({
  record, setField, completion, locale, t,
}) => {
  const [draft, setDraft] = React.useState('');

  const addCertification = () => {
    const v = draft.trim();
    if (!v || record.certifications.includes(v)) return;
    setField('certifications', [...record.certifications, v]);
    setDraft('');
  };

  return (
    <SectionCard
      id="tea-section-employment"
      icon={Briefcase}
      title={t('sec.employment')}
      subtitle={t('sec.employment.sub')}
      status={completion['tea-section-employment']}
      optionalLabel={t('f.optionalShort')}
    >
      <div className={GRID}>
        <TextField
          id="tea-employeeId"
          label={t('f.employeeId')}
          value={record.employeeId}
          onChange={(v) => setField('employeeId', v)}
          locale={locale}
          optionalHint={t('f.optional')}
        />
        <TextField
          id="tea-hireDate"
          label={t('f.hireDate')}
          value={record.hireDate}
          onChange={(v) => setField('hireDate', v)}
          locale={locale}
          type="date"
          optionalHint={t('f.optional')}
        />
      </div>

      <div className={GRID}>
        <SelectField
          id="tea-employmentType"
          label={t('f.employmentType')}
          value={record.employmentType}
          onChange={(v) => setField('employmentType', v as TeacherRecord['employmentType'])}
          locale={locale}
          options={(['full-time', 'part-time', 'visiting'] as const).map((v) => ({
            value: v,
            label: t(`emp.${v}`),
          }))}
          placeholder={t('f.select')}
          optionalHint={t('f.optional')}
        />
        <TextField
          id="tea-years"
          label={t('f.years')}
          value={record.yearsOfExperience}
          onChange={(v) => setField('yearsOfExperience', v)}
          locale={locale}
          type="number"
          optionalHint={t('f.optional')}
        />
      </div>

      <div className={GRID}>
        <TextField
          id="tea-university"
          label={t('f.university')}
          value={record.university}
          onChange={(v) => setField('university', v)}
          locale={locale}
          optionalHint={t('f.optional')}
        />
        <TextField
          id="tea-major"
          label={t('f.major')}
          value={record.major}
          onChange={(v) => setField('major', v)}
          locale={locale}
          optionalHint={t('f.optional')}
        />
      </div>

      <TextField
        id="tea-bio"
        label={t('f.bio')}
        value={record.bio}
        onChange={(v) => setField('bio', v)}
        locale={locale}
        multiline
        placeholder={t('f.bio.ph')}
        optionalHint={t('f.optional')}
      />

      {/* Tag list — certifications are a free-form set, not a fixed enum. */}
      <div>
        <span className="block mb-1.5 text-xs font-bold text-slate-600 font-cairo">
          {t('f.certifications')}
          <span className="ms-1 font-medium text-slate-400">{t('f.optional')}</span>
        </span>
        {record.certifications.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 mb-2">
            {record.certifications.map((c) => (
              <li
                key={c}
                className="inline-flex items-center gap-1 ps-2.5 pe-1.5 py-1 rounded-full bg-sq-accent-50 border border-sq-accent-200"
              >
                <span className="text-[11px] font-bold text-sq-accent-700 font-cairo">{c}</span>
                <button
                  type="button"
                  onClick={() => setField('certifications', record.certifications.filter((x) => x !== c))}
                  aria-label={`${t('f.photo.remove')} ${c}`}
                  className="p-0.5 rounded-full text-sq-accent-600 hover:bg-sq-accent-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCertification();
            }
          }}
          onBlur={addCertification}
          placeholder={t('f.certifications.ph')}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 placeholder:text-slate-400 font-cairo focus:outline-none focus:bg-white focus:border-sq-accent-500 focus:ring-2 focus:ring-sq-accent-500/20 transition-colors"
        />
      </div>
    </SectionCard>
  );
};

/* ─── Contact ─────────────────────────────────────────────────────────── */

export const ContactSection: React.FC<TeacherSectionProps> = ({
  record, setField, blurField, errors, completion, locale, t, registerRef,
}) => (
  <SectionCard
    id="tea-section-contact"
    icon={Mail}
    title={t('sec.contact')}
    subtitle={t('sec.contact.sub')}
    status={completion['tea-section-contact']}
    optionalLabel={t('f.optionalShort')}
  >
    <div className={GRID}>
      <TextField
        id="tea-email"
        label={t('f.email')}
        value={record.email}
        onChange={(v) => setField('email', v)}
        onBlur={() => blurField('email')}
        locale={locale}
        type="email"
        optionalHint={t('f.optional')}
        error={errors.email}
        leadingIcon={Mail}
        inputRef={registerRef('email')}
      />
      <TextField
        id="tea-phone"
        label={t('f.phone')}
        value={record.phone}
        onChange={(v) => setField('phone', v)}
        onBlur={() => blurField('phone')}
        locale={locale}
        type="tel"
        optionalHint={t('f.optional')}
        prefix="+962"
        error={errors.phone}
        inputRef={registerRef('phone')}
      />
    </div>

    <TextField
      id="tea-officeHours"
      label={t('f.officeHours')}
      value={record.officeHours}
      onChange={(v) => setField('officeHours', v)}
      locale={locale}
      placeholder={t('f.officeHours.ph')}
      optionalHint={t('f.optional')}
    />

    <TextField
      id="tea-address"
      label={t('f.address')}
      value={record.address}
      onChange={(v) => setField('address', v)}
      locale={locale}
      optionalHint={t('f.optional')}
      leadingIcon={MapPin}
    />
  </SectionCard>
);

/* ─── Credentials ─────────────────────────────────────────────────────── */

export const CredentialsSection: React.FC<
  TeacherSectionProps & {
    passwordVisible: boolean;
    onTogglePassword: () => void;
    onGeneratePassword: () => void;
    onCopyLogin: () => void;
    onResetPassword?: () => void;
  }
> = ({
  record, setField, blurField, errors, completion, locale, t, registerRef,
  passwordVisible, onTogglePassword, onGeneratePassword, onCopyLogin, onResetPassword,
}) => (
  <SectionCard
    id="tea-section-credentials"
    icon={KeyRound}
    title={t('sec.credentials')}
    subtitle={t('sec.credentials.sub')}
    status={completion['tea-section-credentials']}
    optionalLabel={t('f.optionalShort')}
  >
    <TextField
      id="tea-loginEmail"
      label={t('f.loginEmail')}
      value={record.loginEmail}
      onChange={(v) => setField('loginEmail', v)}
      onBlur={() => blurField('loginEmail')}
      locale={locale}
      type="email"
      required
      error={errors.loginEmail}
      leadingIcon={Mail}
      inputRef={registerRef('loginEmail')}
    />

    <PasswordField
      id="tea-password"
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
          <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
          {t('reset.title')}
        </button>
      )}
    </div>
  </SectionCard>
);

export const TEACHER_SECTION_ICONS: Record<string, LucideIcon> = {
  'tea-section-identity': UserRound,
  'tea-section-subjects': GraduationCap,
  'tea-section-employment': Briefcase,
  'tea-section-contact': Mail,
  'tea-section-credentials': KeyRound,
};
