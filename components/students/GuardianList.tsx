/**
 * Editable list of guardians — mother, father, or a free-text "other".
 *
 * Replaces the old fixed guardianName/motherName pair, which could only ever
 * hold one parent plus a mother's name with no contact details of her own.
 */

import React from 'react';
import { Plus, Trash2, UserRound, Mail, IdCard } from 'lucide-react';
import { TextField } from './fields/TextField';
import { SelectField } from './fields/SelectField';
import { dialCodeFor } from './studentOptions';
import {
  emptyGuardian,
  validateGuardian,
  type Guardian,
  type GuardianRelation,
} from './studentTypes';
import type { Locale } from './studentsI18n';

const GRID = 'grid grid-cols-1 sm:grid-cols-2 gap-4';

export const RELATION_KEYS: GuardianRelation[] = ['mother', 'father', 'other'];

interface GuardianListProps {
  guardians: Guardian[];
  onChange: (guardians: Guardian[]) => void;
  locale: Locale;
  t: (key: string) => string;
  /** Dial-code source for the phone prefix. */
  nationality: string;
}

export const GuardianList: React.FC<GuardianListProps> = ({
  guardians,
  onChange,
  locale,
  t,
  nationality,
}) => {
  const isAr = locale === 'ar';

  const patch = (id: string, changes: Partial<Guardian>) => {
    onChange(guardians.map((g) => (g.id === id ? { ...g, ...changes } : g)));
  };

  const remove = (id: string) => onChange(guardians.filter((g) => g.id !== id));

  const add = () => {
    // Offer the relation they don't have yet — usually the second parent.
    const taken = new Set(guardians.map((g) => g.relation));
    const next: GuardianRelation = !taken.has('mother')
      ? 'mother'
      : !taken.has('father')
        ? 'father'
        : 'other';
    onChange([...guardians, emptyGuardian(next)]);
  };

  const relationOptions = RELATION_KEYS.map((r) => ({
    value: r,
    label: t(`rel.${r}`),
  }));

  return (
    <div className="space-y-3">
      {guardians.map((g, i) => {
        const errs = validateGuardian(g, isAr);
        return (
          <div key={g.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-sq-accent-50 flex items-center justify-center shrink-0">
                <UserRound className="w-3.5 h-3.5 text-sq-accent-600" aria-hidden="true" />
              </span>
              <span className="flex-1 text-[11px] font-bold text-slate-500 font-cairo">
                {t('family.guardian')} {guardians.length > 1 ? i + 1 : ''}
              </span>
              <button
                type="button"
                onClick={() => remove(g.id)}
                aria-label={t('family.removeGuardian')}
                title={t('family.removeGuardian')}
                className="p-1.5 rounded-lg text-slate-300 hover:text-sq-danger-600 hover:bg-sq-danger-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-danger-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className={GRID}>
              <SelectField
                id={`g-${g.id}-relation`}
                label={t('f.relation')}
                value={g.relation}
                onChange={(v) => patch(g.id, { relation: v as GuardianRelation })}
                locale={locale}
                options={relationOptions}
                placeholder={t('f.select')}
              />
              {g.relation === 'other' ? (
                <TextField
                  id={`g-${g.id}-relationLabel`}
                  label={t('f.relationLabel')}
                  value={g.relationLabel}
                  onChange={(v) => patch(g.id, { relationLabel: v })}
                  locale={locale}
                  placeholder={t('f.relationLabel.ph')}
                />
              ) : (
                <div className="hidden sm:block" aria-hidden="true" />
              )}
            </div>

            <TextField
              id={`g-${g.id}-name`}
              label={t('f.guardianName')}
              value={g.name}
              onChange={(v) => patch(g.id, { name: v })}
              locale={locale}
              optionalHint={t('f.optional')}
            />

            <div className={GRID}>
              <TextField
                id={`g-${g.id}-phone`}
                label={t('f.guardianPhone')}
                value={g.phone}
                onChange={(v) => patch(g.id, { phone: v })}
                locale={locale}
                type="tel"
                optionalHint={t('f.optional')}
                prefix={dialCodeFor(nationality)}
                error={errs.phone}
              />
              <TextField
                id={`g-${g.id}-email`}
                label={t('f.guardianEmail')}
                value={g.email}
                onChange={(v) => patch(g.id, { email: v })}
                locale={locale}
                type="email"
                optionalHint={t('f.optional')}
                error={errs.email}
                leadingIcon={Mail}
              />
            </div>

            <TextField
              id={`g-${g.id}-nationalId`}
              label={t('f.guardianNationalId')}
              value={g.nationalId}
              onChange={(v) => patch(g.id, { nationalId: v })}
              locale={locale}
              optionalHint={t('f.optional')}
              helper={t('f.guardianNationalId.help')}
              leadingIcon={IdCard}
            />
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-500 font-cairo hover:border-sq-accent-500 hover:text-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
        {guardians.length === 0 ? t('family.addFirstGuardian') : t('family.addGuardian')}
      </button>
    </div>
  );
};

/* ─── Read-only summary, used for a linked sibling's guardians ─────────── */

export const GuardianSummary: React.FC<{
  guardians: Guardian[];
  locale: Locale;
  t: (key: string) => string;
}> = ({ guardians, locale, t }) => {
  const filled = guardians.filter((g) => g.name.trim() || g.phone.trim() || g.email.trim());
  if (filled.length === 0) {
    return (
      <p className="text-[10px] font-bold text-slate-400 font-cairo">{t('family.noGuardianInfo')}</p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {filled.map((g) => (
        <li key={g.id} className="flex items-center gap-2 flex-wrap">
          <span className="px-1.5 py-0.5 rounded-full bg-sq-accent-50 border border-sq-accent-200 text-[9px] font-bold text-sq-accent-700 font-cairo shrink-0">
            {g.relation === 'other' && g.relationLabel.trim()
              ? g.relationLabel
              : t(`rel.${g.relation}`)}
          </span>
          <span className="text-[10px] font-bold text-sq-ink font-cairo truncate">
            {g.name.trim() || '—'}
          </span>
          {g.phone.trim() && (
            <span dir="ltr" className="text-[10px] font-bold text-slate-400 font-mono">
              {g.phone}
            </span>
          )}
          {g.email.trim() && (
            <span dir="ltr" className="text-[10px] font-bold text-slate-400 truncate">
              {g.email}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};

export default GuardianList;
