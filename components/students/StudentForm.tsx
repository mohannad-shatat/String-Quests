/**
 * The form body inside the peek panel: anchoring rail + scrolling sections +
 * sticky footer.
 *
 * Scroll-spy comes from components/notification-admin/compose/useActiveSection.ts,
 * which accepts a container ref — so it observes the panel's own scroll box
 * rather than the viewport. Section ids are prefixed `stu-section-` because
 * that hook resolves them with document.getElementById and would otherwise
 * collide with the host page.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { SqAnchoringRail, type SqRailSection } from '../design-system/components/AnchoringRail';
import { useActiveSection } from '../notification-admin/compose/useActiveSection';
import {
  IdentitySection,
  AcademicSection,
  ContactSection,
  CredentialsSection,
  SECTION_ICONS,
} from './StudentSections';
import { FamilySection } from './FamilySection';
import type { InviteRelation } from './ParentQrInvite';
import { DuplicateBanner } from './DuplicateBanner';
import {
  ERROR_ORDER,
  FIELD_SECTION,
  SECTION_IDS,
  type Guardian,
  type StudentErrorKey,
  type StudentRecord,
} from './studentTypes';
import type { Locale } from './studentsI18n';
import type { useStudentForm } from './useStudentForm';

/* Pink overrides for the shared rail — it defaults to the violet brand. */
const RAIL_ACTIVE_BG = 'bg-sq-accent-500 shadow-sm shadow-pink-500/30';
const RAIL_HALO = 'bg-sq-accent-500/15';
const RAIL_ICON = 'text-sq-accent-700';
const RAIL_CHECK = 'bg-sq-accent-500 shadow-sm shadow-pink-500/30';

const SECTION_LABEL_KEY: Record<string, string> = {
  'stu-section-identity': 'sec.identity',
  'stu-section-academic': 'sec.academic',
  'stu-section-contact': 'sec.contact',
  'stu-section-family': 'sec.family',
  'stu-section-credentials': 'sec.credentials',
};

/**
 * Container-relative scroll. `scrollSectionIntoView` in the notification-admin
 * rail is not exported, so its math is reproduced here — using
 * element.scrollIntoView() instead would fight the sticky panel header.
 */
function scrollSectionIntoView(id: string, container: HTMLElement | null): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (!container) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const offset = elRect.top - containerRect.top + container.scrollTop - 16;
  container.scrollTo({ top: offset, behavior: 'smooth' });
}

interface StudentFormProps {
  form: ReturnType<typeof useStudentForm>;
  locale: Locale;
  t: (key: string) => string;
  isNew: boolean;
  saving: boolean;
  /** Horizontal rail instead of vertical — used in the mobile sheet. */
  compact: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onCopyLogin: () => void;
  onCopyInviteMessage: (relation: InviteRelation) => void;
  inviteCopied: InviteRelation | null;
  onLinkFamily: (studentId: string) => void;
  /** Everyone, so the family linker can search beyond what detection found. */
  allStudents: StudentRecord[];
  onOpenStudent: (studentId: string) => void;
  onResetPassword?: () => void;
  onExpandQr: (relation: InviteRelation) => void;
  onCopyGuardians: (guardians: Guardian[]) => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  form,
  locale,
  t,
  isNew,
  saving,
  compact,
  onSave,
  onCancel,
  onDelete,
  onCopyLogin,
  onCopyInviteMessage,
  inviteCopied,
  onLinkFamily,
  allStudents,
  onOpenStudent,
  onResetPassword,
  onExpandQr,
  onCopyGuardians,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fieldRefs = useRef<Partial<Record<StudentErrorKey, HTMLElement | null>>>({});
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [dupDismissed, setDupDismissed] = useState(false);

  const activeId = useActiveSection({ sectionIds: SECTION_IDS, containerRef: scrollRef });

  const registerRef = useCallback(
    (key: StudentErrorKey) => (el: HTMLElement | null) => {
      fieldRefs.current[key] = el;
    },
    [],
  );

  const railSections: SqRailSection[] = useMemo(
    () =>
      SECTION_IDS.map((id) => ({
        id,
        label: t(SECTION_LABEL_KEY[id]),
        icon: SECTION_ICONS[id],
        complete: form.completion[id],
      })),
    [form.completion, t],
  );

  const handleActivate = useCallback((id: string) => {
    scrollSectionIntoView(id, scrollRef.current);
  }, []);

  /** Validate, then jump to and focus the first offending field. */
  const handleSave = useCallback(() => {
    const errs = form.validateAll();
    const firstKey = ERROR_ORDER.find((k) => errs[k]);
    if (firstKey) {
      scrollSectionIntoView(FIELD_SECTION[firstKey], scrollRef.current);
      // Wait out the smooth scroll so focus doesn't cancel it.
      window.setTimeout(() => fieldRefs.current[firstKey]?.focus(), 320);
      return;
    }
    onSave();
  }, [form, onSave]);

  const sectionProps = {
    record: form.record,
    setField: form.setField as <K extends keyof StudentRecord>(f: K, v: StudentRecord[K]) => void,
    blurField: form.blurField,
    errors: form.errors,
    completion: form.completion,
    locale,
    t,
    registerRef,
  };

  const hasErrors = Object.keys(form.errors).length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Horizontal rail — mobile sheet / narrow peek */}
      {compact && (
        <div className="shrink-0 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
          <SqAnchoringRail
            sections={railSections}
            activeId={activeId}
            onActivate={handleActivate}
            variant="horizontal"
            sticky={false}
            activeBg={RAIL_ACTIVE_BG}
            activeHalo={RAIL_HALO}
            activeIconColor={RAIL_ICON}
            checkBg={RAIL_CHECK}
            optionalLabel={t('f.optionalShort')}
          />
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="flex items-start gap-6 p-5">
          {!compact && (
            <SqAnchoringRail
              sections={railSections}
              activeId={activeId}
              onActivate={handleActivate}
              variant="vertical"
              activeBg={RAIL_ACTIVE_BG}
              activeHalo={RAIL_HALO}
              activeIconColor={RAIL_ICON}
              checkBg={RAIL_CHECK}
              optionalLabel={t('f.optionalShort')}
            />
          )}

          <div className="flex-1 min-w-0 space-y-4 max-w-3xl">
            {!dupDismissed && (
              <DuplicateBanner
                matches={form.duplicates}
                locale={locale}
                t={t}
                onOpen={onOpenStudent}
                onDismiss={() => setDupDismissed(true)}
              />
            )}

            {form.warnings.length > 0 && (
              <div className="rounded-2xl border border-sq-warning-500/30 bg-sq-warning-50 p-4 space-y-1">
                {form.warnings.map((key) => (
                  <p
                    key={key}
                    className="flex items-start gap-2 text-[11px] font-bold text-amber-700 font-cairo"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
                    {t(key)}
                  </p>
                ))}
              </div>
            )}

            <IdentitySection {...sectionProps} idIssued={form.idIssued} />
            <AcademicSection {...sectionProps} />
            <ContactSection {...sectionProps} />
            <FamilySection
              {...sectionProps}
              siblings={form.siblingSuggestions}
              confirmedFamily={form.confirmedFamily}
              allStudents={allStudents}
              onLinkFamily={onLinkFamily}
              onUnlinkFamily={form.unlinkFamily}
              onCopyInviteMessage={onCopyInviteMessage}
              inviteCopied={inviteCopied}
              onExpandQr={onExpandQr}
              onCopyGuardians={onCopyGuardians}
            />
            <CredentialsSection
              {...sectionProps}
              passwordVisible={passwordVisible}
              onTogglePassword={() => setPasswordVisible((v) => !v)}
              onGeneratePassword={form.regeneratePassword}
              onCopyLogin={onCopyLogin}
              onResetPassword={onResetPassword}
            />

            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-sq-danger-500/30 bg-white px-4 py-2.5 text-xs font-bold text-sq-danger-600 font-cairo hover:bg-sq-danger-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-danger-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                {t('panel.delete')}
              </button>
            )}

            <div className="h-2" />
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <footer
        className="shrink-0 border-t border-slate-200 bg-white px-5 py-3.5"
        style={{ paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 rounded-full bg-slate-200 overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full bg-sq-accent-500 transition-[width] duration-300"
                  style={{ width: `${(form.progress.done / form.progress.total) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-500 font-cairo tabular-nums whitespace-nowrap">
                {form.progress.done} {t('panel.progress')} {form.progress.total}
              </span>
            </div>
            {(form.dirty || hasErrors) && (
              <p
                className={
                  hasErrors
                    ? 'mt-1 text-[10px] font-bold text-sq-danger-600 font-cairo truncate'
                    : 'mt-1 text-[10px] font-bold text-amber-600 font-cairo truncate'
                }
              >
                {hasErrors ? t('msg.errors') : t('panel.unsaved')}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 font-cairo hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors shrink-0"
          >
            {t('panel.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sq-accent-500 text-white text-xs font-bold font-cairo shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 focus-visible:ring-offset-1 transition-colors shrink-0"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
            {isNew ? t('panel.saveNew') : t('panel.save')}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default StudentForm;
