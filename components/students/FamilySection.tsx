/**
 * Family — guardians plus sibling detection.
 *
 * Replaces the old Guardian section. A parent is connected one of two ways:
 * staff type the details, or the parent scans a WhatsApp QR and links
 * themselves. Choosing QR intentionally leaves the guardian fields empty —
 * that's the point of it — so the section still counts as answered.
 *
 * Sibling suggestions are never applied automatically. `studentMatching.ts`
 * ranks candidates and this UI asks a human to confirm, because a shared
 * surname is a hint, not a fact.
 */

import React from 'react';
import { Users, UserRound, Link2, Unlink, UserCheck, Sparkles, ClipboardCopy } from 'lucide-react';
import { SectionCard, type SectionProps } from './StudentSections';
import { ParentQrInvite, type InviteRelation } from './ParentQrInvite';
import { GuardianList, GuardianSummary } from './GuardianList';
import { siblingConfidence, type SiblingMatch } from './studentMatching';
import type { Guardian, ParentLinkMethod } from './studentTypes';

interface FamilySectionProps extends SectionProps {
  siblings: SiblingMatch[];
  confirmedFamily: SiblingMatch[];
  onLinkFamily: (studentId: string) => void;
  onUnlinkFamily: () => void;
  onCopyInviteMessage: (relation: InviteRelation) => void;
  inviteCopied: InviteRelation | null;
  onExpandQr: (relation: InviteRelation) => void;
  onCopyGuardians: (guardians: Guardian[]) => void;
}

/* ─── Method toggle ───────────────────────────────────────────────────── */

const MethodTab: React.FC<{
  active: boolean;
  icon: React.ElementType;
  label: string;
  hint: string;
  onClick: () => void;
}> = ({ active, icon: Icon, label, hint, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={
      active
        ? 'flex-1 min-w-0 text-start rounded-xl border-2 border-sq-accent-500 bg-sq-accent-50 p-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500'
        : 'flex-1 min-w-0 text-start rounded-xl border-2 border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500'
    }
  >
    <span className="flex items-center gap-2">
      <Icon
        className={active ? 'w-4 h-4 text-sq-accent-600 shrink-0' : 'w-4 h-4 text-slate-400 shrink-0'}
        aria-hidden="true"
      />
      <span
        className={
          active
            ? 'text-xs font-bold text-sq-accent-700 font-cairo truncate'
            : 'text-xs font-bold text-slate-600 font-cairo truncate'
        }
      >
        {label}
      </span>
    </span>
    <span className="mt-1 block text-[10px] font-bold text-slate-400 font-cairo leading-snug">
      {hint}
    </span>
  </button>
);

/* ─── Sibling row ─────────────────────────────────────────────────────── */

const SiblingRow: React.FC<{
  match: SiblingMatch;
  locale: 'ar' | 'en';
  t: (key: string) => string;
  confirmed: boolean;
  onLink: () => void;
  onUnlink: () => void;
  /** Offered on confirmed rows when this student has no guardians yet. */
  onCopyGuardians?: () => void;
}> = ({ match, locale, t, confirmed, onLink, onUnlink, onCopyGuardians }) => {
  const s = match.student;
  const name = locale === 'ar' ? s.name : s.nameEn || s.name;
  const conf = siblingConfidence(match.score);

  const confClass =
    conf === 'high'
      ? 'bg-sq-success-50 text-sq-success-700 border-sq-success-200'
      : conf === 'medium'
        ? 'bg-sq-warning-50 text-amber-700 border-sq-warning-500/30'
        : 'bg-slate-100 text-slate-500 border-slate-200';

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
      <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
        {s.photoDataUrl ? (
          <img src={s.photoDataUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <UserRound className="w-4 h-4 text-slate-400" aria-hidden="true" />
        )}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-sq-ink font-cairo truncate">{name}</span>
          {!confirmed && (
            <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-bold font-cairo ${confClass}`}>
              {t(`family.confidence.${conf}`)}
            </span>
          )}
        </div>
        <p className="text-[10px] font-bold text-slate-400 font-cairo truncate">
          {s.grade !== null ? `${t('f.grade')} ${s.grade}` : ''}
          {s.section ? ` · ${s.section}` : ''}
          {s.studentId ? ` · ${s.studentId}` : ''}
        </p>
        {!confirmed && (
          <ul className="mt-1 flex flex-wrap gap-1">
            {match.reasons.map((r) => (
              <li
                key={r}
                className="px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[9px] font-bold text-slate-500 font-cairo"
              >
                {t(`family.reason.${r}`)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmed ? (
        <button
          type="button"
          onClick={onUnlink}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 font-cairo hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
        >
          <Unlink className="w-3 h-3" aria-hidden="true" />
          {t('family.unlink')}
        </button>
      ) : (
        <button
          type="button"
          onClick={onLink}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sq-accent-500 text-white text-[10px] font-bold font-cairo hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
        >
          <Link2 className="w-3 h-3" aria-hidden="true" />
          {t('family.link')}
        </button>
      )}
      </div>

      {/* Once linked, the family's guardians are known — show them rather
          than making staff open the sibling's record to find a phone number. */}
      {confirmed && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 font-cairo">
              {t('family.theirGuardians')}
            </span>
            {onCopyGuardians && (
              <button
                type="button"
                onClick={onCopyGuardians}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-sq-accent-600 hover:text-sq-accent-700 font-cairo focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 rounded px-1 py-0.5 shrink-0"
              >
                <ClipboardCopy className="w-3 h-3" aria-hidden="true" />
                {t('family.copyGuardians')}
              </button>
            )}
          </div>
          <GuardianSummary guardians={s.guardians} locale={locale} t={t} />
        </div>
      )}
    </li>
  );
};

/* ─── Section ─────────────────────────────────────────────────────────── */

export const FamilySection: React.FC<FamilySectionProps> = ({
  record,
  setField,
  completion,
  locale,
  t,
  siblings,
  confirmedFamily,
  onLinkFamily,
  onUnlinkFamily,
  onCopyInviteMessage,
  inviteCopied,
  onExpandQr,
  onCopyGuardians,
}) => {
  const method: ParentLinkMethod = record.parentLinkMethod;
  // Only offer to inherit guardians when this student has none of their own.
  const canInherit = record.guardians.every(
    (g) => !(g.name.trim() || g.phone.trim() || g.email.trim() || g.nationalId.trim()),
  );

  return (
    <SectionCard
      id="stu-section-family"
      icon={Users}
      title={t('sec.family')}
      subtitle={t('sec.family.sub')}
      status={completion['stu-section-family']}
      optionalLabel={t('f.optionalShort')}
    >
      {/* ── Guardians ── */}
      <div>
        <h4 className="text-[11px] font-bold text-slate-500 font-cairo mb-2">{t('family.method')}</h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <MethodTab
            active={method === 'manual'}
            icon={UserRound}
            label={t('family.manual')}
            hint={t('family.manual.hint')}
            onClick={() => setField('parentLinkMethod', 'manual')}
          />
          <MethodTab
            active={method === 'qr'}
            icon={Sparkles}
            label={t('family.qr')}
            hint={t('family.qr.hint')}
            onClick={() => setField('parentLinkMethod', 'qr')}
          />
        </div>
      </div>

      {method === 'manual' ? (
        <GuardianList
          guardians={record.guardians}
          onChange={(next) => setField('guardians', next)}
          locale={locale}
          t={t}
          nationality={record.nationality}
        />
      ) : (
        <ParentQrInvite
          studentName={record.name}
          studentId={record.studentId}
          locale={locale}
          t={t}
          onCopyMessage={onCopyInviteMessage}
          copied={inviteCopied}
          onExpand={onExpandQr}
        />
      )}

      {/* ── Confirmed family ── */}
      {confirmedFamily.length > 0 && (
        <div className="pt-1">
          <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-sq-success-700 font-cairo mb-2">
            <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
            {t('family.confirmed')}
          </h4>
          <ul className="space-y-2">
            {confirmedFamily.map((m) => (
              <SiblingRow
                key={m.student.id}
                match={m}
                locale={locale}
                t={t}
                confirmed
                onLink={() => onLinkFamily(m.student.id)}
                onUnlink={onUnlinkFamily}
                onCopyGuardians={
                  canInherit && m.student.guardians.some((g) => g.name.trim() || g.phone.trim())
                    ? () => onCopyGuardians(m.student.guardians)
                    : undefined
                }
              />
            ))}
          </ul>
        </div>
      )}

      {/* ── Suggestions ── */}
      {siblings.length > 0 && (
        <div className="pt-1">
          <h4 className="text-[11px] font-bold text-slate-500 font-cairo">{t('family.siblings')}</h4>
          <p className="text-[10px] font-bold text-slate-400 font-cairo mb-2">
            {t('family.siblings.hint')}
          </p>
          <ul className="space-y-2">
            {siblings.map((m) => (
              <SiblingRow
                key={m.student.id}
                match={m}
                locale={locale}
                t={t}
                confirmed={false}
                onLink={() => onLinkFamily(m.student.id)}
                onUnlink={onUnlinkFamily}
              />
            ))}
          </ul>
        </div>
      )}

      {siblings.length === 0 && confirmedFamily.length === 0 && (
        <p className="text-[11px] font-bold text-slate-400 font-cairo pt-1">
          {t('family.siblings.none')}
        </p>
      )}
    </SectionCard>
  );
};

export default FamilySection;
