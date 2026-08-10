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
import { Users, UserRound, Sparkles } from 'lucide-react';
import { SectionCard, type SectionProps } from './StudentSections';
import { ParentQrInvite, type InviteRelation } from './ParentQrInvite';
import { GuardianList } from './GuardianList';
import { SiblingLinker } from './SiblingLinker';
import type { SiblingMatch } from './studentMatching';
import type { Guardian, ParentLinkMethod, StudentRecord } from './studentTypes';

interface FamilySectionProps extends SectionProps {
  siblings: SiblingMatch[];
  confirmedFamily: SiblingMatch[];
  /** Everyone, so a sibling detection missed can still be found by name. */
  allStudents: StudentRecord[];
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

/* ─── Section ─────────────────────────────────────────────────────────── */

export const FamilySection: React.FC<FamilySectionProps> = ({
  record,
  setField,
  completion,
  locale,
  t,
  siblings,
  confirmedFamily,
  allStudents,
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

      {/* Detected siblings plus the manual search, shared with the
          post-create step so both render the same thing. */}
      <div className="pt-1">
        <SiblingLinker
          selfId={record.id}
          allStudents={allStudents}
          suggestions={siblings}
          confirmedFamily={confirmedFamily}
          locale={locale}
          t={t}
          onLink={onLinkFamily}
          onUnlink={onUnlinkFamily}
          onCopyGuardians={onCopyGuardians}
          canInherit={canInherit}
        />
      </div>
    </SectionCard>
  );
};

export default FamilySection;
