/**
 * The five member form sections.
 *
 * Kept in one file for the same reason the student and teacher sections are:
 * all five take an identical props bundle, so five modules would be mostly
 * boilerplate.
 *
 * Role & Scope is the only section that changes shape by type. `SCOPE_FIELDS`
 * in memberRecordTypes.ts is the single source for which fields a role asks
 * for — this file renders that spec rather than carrying its own switch.
 */

import React from 'react';
import {
  Building2,
  Check,
  CalendarClock,
  Copy,
  IdCard,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';
import { TextField } from '../students/fields/TextField';
import { SelectField } from '../students/fields/SelectField';
import { PhotoField } from '../students/fields/PhotoField';
import { PasswordField } from '../students/fields/PasswordField';
import { GENDER_OPTIONS, NATIONALITY_OPTIONS, localized } from '../students/studentOptions';
import { GRADES } from '../../data/adminData';
import { CAMPUSES } from '../../data/mockAttendanceData';
import { SUBJECTS, subjectLabel } from '../teachers/teacherFilters';
import { LeadTeacherPicker } from './LeadTeacherPicker';
import { OTHER_MEMBER_TYPES } from '../people/memberTypes';
import { roleLabel } from './membersI18n';
import {
  scopeOf,
  type AuthoredMemberTypeId,
  type MemberErrorKey,
  type MemberErrors,
  type MemberRecord,
  type MemberSectionId,
  type SectionStatus,
} from './memberRecordTypes';
import type { TeacherRecord } from '../teachers/teacherTypes';
import type { Locale } from '../directory/directoryI18n';

const GRID = 'grid grid-cols-1 sm:grid-cols-2 gap-4';

export const MEMBER_SECTION_ICONS: Record<MemberSectionId, LucideIcon> = {
  'mem-section-identity': UserRound,
  'mem-section-scope': ShieldCheck,
  'mem-section-employment': Briefcase,
  'mem-section-contact': Mail,
  'mem-section-credentials': Lock,
};

/* ─── Shell ───────────────────────────────────────────────────────────── */

const SectionCard: React.FC<{
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

/** Multi-select as toggle chips — campuses, subjects and grades are small sets. */
const ChipMulti: React.FC<{
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  required?: boolean;
  error?: string;
}> = ({ label, options, selected, onToggle, required, error }) => (
  <div>
    <span className="block mb-1.5 text-xs font-bold text-slate-600 font-cairo">
      {label}
      {required && <span className="text-sq-danger-500 ms-0.5">*</span>}
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
    {error && <p className="mt-1.5 text-[11px] font-bold text-sq-danger-600 font-cairo">{error}</p>}
  </div>
);

/* ─── Props ───────────────────────────────────────────────────────────── */

export interface MemberSectionProps {
  record: MemberRecord;
  setField: <K extends keyof MemberRecord>(field: K, value: MemberRecord[K]) => void;
  blurField: (field: MemberErrorKey) => void;
  errors: MemberErrors;
  completion: Record<string, SectionStatus>;
  locale: Locale;
  t: (key: string) => string;
  registerRef: (key: MemberErrorKey) => (el: HTMLElement | null) => void;
}

/* ─── Identity ────────────────────────────────────────────────────────── */

export const IdentitySection: React.FC<
  MemberSectionProps & { idIssued: boolean; lockedByTeacher: boolean }
> = ({ record, setField, blurField, errors, completion, locale, t, registerRef, idIssued, lockedByTeacher }) => (
  <SectionCard
    id="mem-section-identity"
    icon={UserRound}
    title={t('sec.identity')}
    subtitle={t('sec.identity.sub')}
    status={completion['mem-section-identity']}
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
          id="mem-name"
          label={t('f.name')}
          value={record.name}
          onChange={(v) => setField('name', v)}
          onBlur={() => blurField('name')}
          locale={locale}
          required
          // A promoted teacher's name belongs to the teacher record.
          disabled={lockedByTeacher}
          helper={lockedByTeacher ? t('f.sourceTeacher.linked') : undefined}
          error={errors.name}
          inputRef={registerRef('name')}
        />
        <TextField
          id="mem-nameEn"
          label={t('f.nameEn')}
          value={record.nameEn}
          onChange={(v) => setField('nameEn', v)}
          locale={locale}
          disabled={lockedByTeacher}
          optionalHint={t('f.optional')}
        />
      </div>
    </div>

    <div className={GRID}>
      <SelectField
        id="mem-gender"
        label={t('f.gender')}
        value={record.gender}
        onChange={(v) => setField('gender', v as MemberRecord['gender'])}
        onBlur={() => blurField('gender')}
        locale={locale}
        options={localized(GENDER_OPTIONS, locale)}
        placeholder={t('f.select')}
        required
        error={errors.gender}
        selectRef={registerRef('gender') as React.Ref<HTMLSelectElement>}
      />
      <SelectField
        id="mem-nationality"
        label={t('f.nationality')}
        value={record.nationality}
        onChange={(v) => setField('nationality', v)}
        locale={locale}
        options={localized(NATIONALITY_OPTIONS, locale)}
        placeholder={t('f.select')}
        optionalHint={t('f.optional')}
      />
      <TextField
        id="mem-nationalId"
        label={t('f.nationalId')}
        value={record.nationalId}
        onChange={(v) => setField('nationalId', v)}
        locale={locale}
        optionalHint={t('f.optional')}
      />
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
          <span className="text-[10px] font-bold text-sq-success-700 font-cairo">
            {t('f.stringId.permanent')}
          </span>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
          <span className="text-xs font-bold text-slate-400 font-cairo">{t('f.stringId.pending')}</span>
          <p className="mt-1 text-[11px] font-bold text-slate-400 font-cairo">
            {t('f.stringId.pendingHelp')}
          </p>
        </div>
      )}
    </div>
  </SectionCard>
);

/* ─── Role & Scope ────────────────────────────────────────────────────── */

export const ScopeSection: React.FC<
  MemberSectionProps & {
    isNew: boolean;
    onChangeType: (type: AuthoredMemberTypeId) => void;
    onPickTeacher: (teacher: TeacherRecord) => void;
    onClearTeacher: () => void;
  }
> = ({
  record, setField, blurField, errors, completion, locale, t, registerRef,
  isNew, onChangeType, onPickTeacher, onClearTeacher,
}) => {
  const scope = scopeOf(record.type);
  const toggle = <K extends 'campusIds' | 'subjects'>(key: K, value: string) => {
    const current = record[key];
    setField(key, (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]) as MemberRecord[K]);
  };

  return (
    <SectionCard
      id="mem-section-scope"
      icon={ShieldCheck}
      title={t('sec.scope')}
      subtitle={t('sec.scope.sub')}
      status={completion['mem-section-scope']}
      optionalLabel={t('f.optionalShort')}
    >
      <SelectField
        id="mem-type"
        label={t('f.type')}
        value={record.type}
        onChange={(v) => onChangeType(v as AuthoredMemberTypeId)}
        locale={locale}
        options={OTHER_MEMBER_TYPES.filter((m) => !m.derived).map((m) => ({
          value: m.id,
          label: roleLabel(m.id, locale),
        }))}
        placeholder={t('f.select')}
        required
        // Changing the role of an existing member would silently invalidate
        // its scope; delete and re-add instead.
        disabled={!isNew}
      />

      {scope.sourceTeacher && (
        <LeadTeacherPicker
          value={record.sourceTeacherId}
          onPick={onPickTeacher}
          onClear={onClearTeacher}
          locale={locale}
          t={t}
          error={errors.sourceTeacherId}
          inputRef={registerRef('sourceTeacherId') as React.Ref<HTMLInputElement>}
        />
      )}

      {scope.campuses === 'one' && (
        <SelectField
          id="mem-campus"
          label={t('f.campus')}
          value={record.campusIds[0] ?? ''}
          onChange={(v) => setField('campusIds', v ? [v] : [])}
          onBlur={() => blurField('campusIds')}
          locale={locale}
          options={CAMPUSES.map((c) => ({ value: c.id, label: locale === 'ar' ? c.name : c.nameEn }))}
          placeholder={t('f.select')}
          required
          error={errors.campusIds}
        />
      )}

      {scope.campuses === 'many' && (
        <ChipMulti
          label={t('f.campuses')}
          options={CAMPUSES.map((c) => ({ value: c.id, label: locale === 'ar' ? c.name : c.nameEn }))}
          selected={record.campusIds}
          onToggle={(v) => toggle('campusIds', v)}
          required
          error={errors.campusIds}
        />
      )}

      {scope.subjects && (
        <ChipMulti
          label={t('f.subjects')}
          options={SUBJECTS.map((s) => ({ value: s, label: subjectLabel(s, locale) }))}
          selected={record.subjects}
          onToggle={(v) => toggle('subjects', v)}
          required
          error={errors.subjects}
        />
      )}

      {scope.grades && (
        <ChipMulti
          label={t('f.grades')}
          options={GRADES.map((g) => ({
            value: String(g),
            label: locale === 'ar' ? `الصف ${g}` : `Grade ${g}`,
          }))}
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
      )}

      {scope.term && (
        <div>
          <div className={GRID}>
            <TextField
              id="mem-termStart"
              label={t('f.termStart')}
              value={record.termStart}
              onChange={(v) => setField('termStart', v)}
              locale={locale}
              type="date"
              optionalHint={t('f.optional')}
            />
            <TextField
              id="mem-termEnd"
              label={t('f.termEnd')}
              value={record.termEnd}
              onChange={(v) => setField('termEnd', v)}
              onBlur={() => blurField('termEnd')}
              locale={locale}
              type="date"
              required
              error={errors.termEnd}
              inputRef={registerRef('termEnd')}
            />
          </div>
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
            <CalendarClock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-[11px] font-bold text-amber-700 font-cairo">{t('f.term.help')}</span>
          </p>
        </div>
      )}

      {/* Not a blank to interpret — an IT manager genuinely has no scope. */}
      {scope.campuses === 'none' && !scope.subjects && !scope.grades && (
        <p className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="text-[11px] font-bold text-slate-500 font-cairo">{t('f.noScope')}</span>
        </p>
      )}
    </SectionCard>
  );
};

/* ─── Employment ──────────────────────────────────────────────────────── */

export const EmploymentSection: React.FC<MemberSectionProps> = ({
  record, setField, completion, locale, t,
}) => (
  <SectionCard
    id="mem-section-employment"
    icon={Briefcase}
    title={t('sec.employment')}
    subtitle={t('sec.employment.sub')}
    status={completion['mem-section-employment']}
    optionalLabel={t('f.optionalShort')}
  >
    <div className={GRID}>
      <TextField
        id="mem-employeeId"
        label={t('f.employeeId')}
        value={record.employeeId}
        onChange={(v) => setField('employeeId', v)}
        locale={locale}
        optionalHint={t('f.optional')}
      />
      <TextField
        id="mem-hireDate"
        label={t('f.hireDate')}
        value={record.hireDate}
        onChange={(v) => setField('hireDate', v)}
        locale={locale}
        type="date"
        optionalHint={t('f.optional')}
      />
      <SelectField
        id="mem-employmentType"
        label={t('f.employmentType')}
        value={record.employmentType}
        onChange={(v) => setField('employmentType', v as MemberRecord['employmentType'])}
        locale={locale}
        options={(['full-time', 'part-time', 'visiting'] as const).map((v) => ({
          value: v,
          label: t(`emp.${v}`),
        }))}
        placeholder={t('f.select')}
        optionalHint={t('f.optional')}
      />
      <TextField
        id="mem-years"
        label={t('f.years')}
        value={record.yearsOfExperience}
        onChange={(v) => setField('yearsOfExperience', v)}
        locale={locale}
        type="number"
        optionalHint={t('f.optional')}
      />
    </div>
    <TextField
      id="mem-bio"
      label={t('f.bio')}
      value={record.bio}
      onChange={(v) => setField('bio', v)}
      locale={locale}
      multiline
      placeholder={t('f.bio.ph')}
      optionalHint={t('f.optional')}
    />
  </SectionCard>
);

/* ─── Contact ─────────────────────────────────────────────────────────── */

export const ContactSection: React.FC<MemberSectionProps> = ({
  record, setField, blurField, errors, completion, locale, t, registerRef,
}) => (
  <SectionCard
    id="mem-section-contact"
    icon={Mail}
    title={t('sec.contact')}
    subtitle={t('sec.contact.sub')}
    status={completion['mem-section-contact']}
    optionalLabel={t('f.optionalShort')}
  >
    <div className={GRID}>
      <TextField
        id="mem-email"
        label={t('f.email')}
        value={record.email}
        onChange={(v) => setField('email', v)}
        onBlur={() => blurField('email')}
        locale={locale}
        type="email"
        optionalHint={t('f.optional')}
        error={errors.email}
        inputRef={registerRef('email')}
      />
      <TextField
        id="mem-phone"
        label={t('f.phone')}
        value={record.phone}
        onChange={(v) => setField('phone', v)}
        onBlur={() => blurField('phone')}
        locale={locale}
        type="tel"
        optionalHint={t('f.optional')}
        error={errors.phone}
        inputRef={registerRef('phone')}
      />
    </div>
    <TextField
      id="mem-address"
      label={t('f.address')}
      value={record.address}
      onChange={(v) => setField('address', v)}
      locale={locale}
      optionalHint={t('f.optional')}
    />
  </SectionCard>
);

/* ─── Login ───────────────────────────────────────────────────────────── */

export const CredentialsSection: React.FC<
  MemberSectionProps & {
    passwordVisible: boolean;
    onTogglePassword: () => void;
    onGeneratePassword: () => void;
    onCopyLogin: () => void;
  }
> = ({
  record, setField, blurField, errors, completion, locale, t, registerRef,
  passwordVisible, onTogglePassword, onGeneratePassword, onCopyLogin,
}) => (
  <SectionCard
    id="mem-section-credentials"
    icon={Lock}
    title={t('sec.credentials')}
    subtitle={t('sec.credentials.sub')}
    status={completion['mem-section-credentials']}
    optionalLabel={t('f.optionalShort')}
  >
    <TextField
      id="mem-loginEmail"
      label={t('f.loginEmail')}
      value={record.loginEmail}
      onChange={(v) => setField('loginEmail', v)}
      onBlur={() => blurField('loginEmail')}
      locale={locale}
      type="email"
      required
      leadingIcon={Mail}
      error={errors.loginEmail}
      inputRef={registerRef('loginEmail')}
    />
    <PasswordField
      id="mem-password"
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
    <button
      type="button"
      onClick={onCopyLogin}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600 font-cairo hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
    >
      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
      {t('f.copyLogin')}
    </button>
    <p className="flex items-start gap-2 text-[11px] font-bold text-slate-400 font-cairo">
      <KeyRound className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
      {t('sec.credentials.sub')}
    </p>
  </SectionCard>
);
