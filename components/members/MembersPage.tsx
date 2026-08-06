/**
 * Other members — one screen for every role that isn't a student or a teacher.
 *
 * Lead Teacher, Supervisor, Campus Owner, Topic Manager, IT Manager and
 * Parent. Five separate pages would be five places to look for one person, so
 * they share a table with Role as the primary filter; the People rail
 * deep-links each type in with `?type=`.
 *
 * Two kinds of row live here. The five staff roles are authored records in
 * localStorage. Parents are *derived* from student guardians — read-only, and
 * opening one goes to the student where guardians are actually edited.
 *
 * Nothing here enforces permissions. A Lead Teacher's term is a date, not a
 * grant.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  IdCard,
  KeyRound,
  MessageSquare,
  PencilLine,
  Plus,
  Undo2,
  UserRound,
  UserSquare,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { generatePassword } from '../../utils/studentStorage';
import {
  deleteMembers,
  generateMemberRecordId,
  generateMemberStringId,
  loadMembers,
  saveMember,
  saveMembers,
} from '../../utils/memberStorage';
import {
  emptyMember,
  isMemberDirty,
  memberProgress,
  memberReadyForId,
  memberSectionCompletion,
  scopeOf,
  validateMember,
  MEMBER_ERROR_ORDER,
  MEMBER_FIELD_SECTION,
  MEMBER_SECTION_IDS,
  type AuthoredMemberTypeId,
  type MemberErrorKey,
  type MemberErrors,
  type MemberRecord,
} from './memberRecordTypes';
import { fill, getMembersString, roleLabel, type Locale } from './membersI18n';
import {
  activeMemberFields,
  applyMemberFilters,
  buildMemberIndex,
  buildMemberRows,
  campusLabel,
  loadMemberRecords,
  memberDidYouMean,
  memberFacetCounts,
  memberFieldLabelKey,
  memberFieldOptions,
  memberFiltersFromParams,
  memberFiltersToParams,
  searchMembers,
  MEMBER_FILTER_FIELDS,
  TERM_ENDING_SOON_DAYS,
  type MemberFilterField,
  type MemberFilterState,
  type MemberRow,
} from './memberFilters';
import {
  IdentitySection,
  ScopeSection,
  EmploymentSection,
  ContactSection,
  CredentialsSection,
  MEMBER_SECTION_ICONS,
} from './MemberSections';
import { findTeacher } from './LeadTeacherPicker';
import { memberType, OTHER_MEMBER_TYPES, type MemberTypeId } from '../people/memberTypes';
import { PeekPanel, loadPanelMode, type PanelMode } from '../directory/PeekPanel';
import { BulkActionBar } from '../directory/BulkActionBar';
import { CommandPalette, type PaletteAction } from '../directory/CommandPalette';
import { ConfirmDangerDialog, type DangerMode } from '../directory/ConfirmDangerDialog';
import { ExpandableSearch, type QuickFilterGroup } from '../directory/ExpandableSearch';
import { ShortcutsBar, type ShortcutHint } from '../directory/ShortcutsBar';
import { AccessCardOverlay, type AccessCardHolder } from '../directory/AccessCard';
import { ComposeMessageSheet, type Recipient } from '../directory/ComposeMessageSheet';
import { FilterPill } from '../students/FilterPill';
import { SqAnchoringRail, type SqRailSection } from '../design-system/components/AnchoringRail';
import { useActiveSection } from '../notification-admin/compose/useActiveSection';
import { highlight } from '../directory/directorySearch';

const GRID_BG: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(0deg, rgba(148,163,184,0.16) 0 1px, transparent 1px 24px),' +
    'repeating-linear-gradient(90deg, rgba(148,163,184,0.16) 0 1px, transparent 1px 24px)',
};

const PAGE_SIZE = 12;

const SHORTCUTS: ShortcutHint[] = [
  { keys: '⌘K', labelKey: 'shortcuts.search' },
  { keys: '/', labelKey: 'shortcuts.focus' },
  { keys: '⌘E', labelKey: 'shortcuts.bulk' },
  { keys: 'Esc', labelKey: 'shortcuts.close' },
];

type SortKey = 'name' | 'type' | 'stringId' | 'scope';

/**
 * Role sorts in picker order, not alphabetically — and this is the *default*
 * sort, because parents outnumber the staff roles a hundred to one. Sorting by
 * name would bury every supervisor behind a thousand parents.
 */
const TYPE_ORDER = new Map<MemberTypeId, number>(OTHER_MEMBER_TYPES.map((m, i) => [m.id, i]));

const RAIL_ACTIVE_BG = 'bg-sq-accent-500 shadow-sm shadow-pink-500/30';
const RAIL_HALO = 'bg-sq-accent-500/15';
const RAIL_ICON = 'text-sq-accent-700';
const RAIL_CHECK = 'bg-sq-accent-500 shadow-sm shadow-pink-500/30';

const SECTION_LABEL_KEY: Record<string, string> = {
  'mem-section-identity': 'sec.identity',
  'mem-section-scope': 'sec.scope',
  'mem-section-employment': 'sec.employment',
  'mem-section-contact': 'sec.contact',
  'mem-section-credentials': 'sec.credentials',
};

/** Container-relative scroll, so the sticky panel header doesn't eat the target. */
function scrollSectionIntoView(id: string, container: HTMLElement | null): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (!container) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const offset = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 16;
  container.scrollTo({ top: offset, behavior: 'smooth' });
}

const RowAction: React.FC<{
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon: Icon, label, onClick, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    aria-label={label}
    title={label}
    className={
      disabled
        ? 'p-1.5 rounded-lg text-slate-200 cursor-not-allowed'
        : 'p-1.5 rounded-lg text-slate-300 hover:text-sq-accent-600 hover:bg-sq-accent-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors'
    }
  >
    <Icon className="w-3.5 h-3.5" />
  </button>
);

const Highlighted: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim()) return <>{text}</>;
  return (
    <>
      {highlight(text, query).map((s, i) =>
        s.hit ? (
          <mark key={i} className="bg-sq-accent-100 text-sq-accent-700 rounded px-0.5">
            {s.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{s.text}</React.Fragment>
        ),
      )}
    </>
  );
};

/** The Term column: days left, ending soon, or lapsed. */
const TermCell: React.FC<{ row: MemberRow; t: (k: string) => string }> = ({ row, t }) => {
  if (row.termDays === null) return <span className="text-slate-300">—</span>;
  if (row.expired) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 whitespace-nowrap">
        {fill(t('term.lapsed'), { n: Math.abs(row.termDays) })}
      </span>
    );
  }
  const soon = row.termDays <= TERM_ENDING_SOON_DAYS;
  return (
    <span
      className={
        soon
          ? 'inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-[10px] font-bold text-amber-700 whitespace-nowrap'
          : 'inline-flex items-center px-2 py-0.5 rounded-full bg-sq-success-50 text-[10px] font-bold text-sq-success-700 whitespace-nowrap'
      }
    >
      {fill(t('term.days'), { n: row.termDays })}
    </span>
  );
};

interface MembersPageProps {
  onExit?: () => void;
}

export const MembersPage: React.FC<MembersPageProps> = ({ onExit }) => {
  const { locale, toggleLocale } = useI18n();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAr = locale === 'ar';
  const t = useCallback((key: string) => getMembersString(locale as Locale, key), [locale]);

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [debounced, setDebounced] = useState(search);
  const [filters, setFilters] = useState<MemberFilterState>(() => memberFiltersFromParams(searchParams));
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'type', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<PanelMode>(loadPanelMode);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [addFilterField, setAddFilterField] = useState<MemberFilterField | null>(null);
  const [editMode, setEditMode] = useState(() => searchParams.get('edit') === '1');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<MemberRow | null>(null);
  const [cardHolders, setCardHolders] = useState<MemberRow[]>([]);
  const [danger, setDanger] = useState<{
    mode: DangerMode;
    title: string;
    body: string;
    note?: string;
    onConfirm: () => void;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [revision, setRevision] = useState(0);

  const showToast = useCallback((message: string, undo?: () => void) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = window.setTimeout(() => setToast(null), undo ? 8000 : 2600);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 150);
    return () => window.clearTimeout(timer);
  }, [search]);

  /* ─── Rows ─── */

  // Captured once per rebuild so every row's "days left" is measured against
  // the same instant rather than drifting as the list renders.
  const rows = useMemo(
    () => buildMemberRows(locale as Locale, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, revision],
  );

  const index = useMemo(() => buildMemberIndex(rows), [rows]);
  const filtered = useMemo(() => applyMemberFilters(rows, filters), [rows, filters]);

  const hits = useMemo(() => {
    if (!debounced.trim()) return null;
    const ids = new Set(filtered.map((r) => r.id));
    const all = searchMembers(index, debounced);
    return all ? all.filter((h) => ids.has(h.item.id)) : null;
  }, [debounced, index, filtered]);

  const visible = useMemo(() => {
    if (hits) return hits.map((h) => h.item);
    const out = [...filtered];
    const factor = sort.dir === 'asc' ? 1 : -1;
    const byName = (a: MemberRow, b: MemberRow) =>
      (isAr ? a.name : a.nameEn || a.name).localeCompare(
        isAr ? b.name : b.nameEn || b.name,
        isAr ? 'ar' : 'en',
      );

    out.sort((a, b) => {
      if (sort.key === 'type') {
        const delta = (TYPE_ORDER.get(a.type) ?? 99) - (TYPE_ORDER.get(b.type) ?? 99);
        // Name breaks the tie, so a role's own rows stay alphabetical.
        return (delta !== 0 ? delta : byName(a, b)) * factor;
      }
      if (sort.key === 'name') return byName(a, b) * factor;
      return String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? ''), isAr ? 'ar' : 'en') * factor;
    });
    return out;
  }, [hits, filtered, sort, isAr]);

  const suggestions = useMemo(() => {
    if (visible.length > 0 || !debounced.trim()) return [];
    return memberDidYouMean(index, debounced);
  }, [visible.length, debounced, index]);

  useEffect(() => setPage(1), [filters, debounced, sort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selected = useMemo(() => visible.filter((r) => selectedIds.has(r.id)), [visible, selectedIds]);

  /* ─── URL + panel ─── */

  const targetParam = searchParams.get('member');
  const isNew = targetParam === 'new';
  const panelOpen = targetParam !== null;

  const editing = useMemo(() => {
    if (!targetParam || isNew) return null;
    return loadMemberRecords().find((m) => m.id === targetParam) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetParam, isNew, revision]);

  const writeParams = useCallback(
    (memberParam: string | null) => {
      const next: Record<string, string> = { ...memberFiltersToParams(filters) };
      if (debounced.trim()) next.q = debounced.trim();
      if (editMode) next.edit = '1';
      if (memberParam) next.member = memberParam;
      setSearchParams(next, { replace: false });
    },
    [filters, debounced, editMode, setSearchParams],
  );

  const openPanel = useCallback((id: string) => writeParams(id), [writeParams]);

  useEffect(() => {
    const current = searchParams.get('member');
    const next: Record<string, string> = { ...memberFiltersToParams(filters) };
    if (debounced.trim()) next.q = debounced.trim();
    if (editMode) next.edit = '1';
    if (current) next.member = current;
    if (new URLSearchParams(next).toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, debounced, editMode]);

  /* ─── Form ─── */

  /** `?type=` seeds a new record so the rail's deep link lands on the right role. */
  const requestedType = (searchParams.get('type') as AuthoredMemberTypeId | null) ?? null;

  const makeBaseline = useCallback((): MemberRecord => {
    if (editing) return { ...editing, password: editing.password || generatePassword() };
    const base = emptyMember(
      requestedType && requestedType !== ('parent' as never) ? requestedType : 'supervisor',
    );
    return { ...base, password: generatePassword() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, requestedType]);

  const [baseline, setBaseline] = useState<MemberRecord>(makeBaseline);
  const [record, setRecord] = useState<MemberRecord>(baseline);
  const [errors, setErrors] = useState<MemberErrors>({});
  const [passwordVisible, setPasswordVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fieldRefs = useRef<Partial<Record<MemberErrorKey, HTMLElement | null>>>({});

  const identity = editing?.id ?? `__new__${requestedType ?? ''}`;
  const lastIdentity = useRef(identity);
  useEffect(() => {
    if (lastIdentity.current === identity) return;
    lastIdentity.current = identity;
    const next = makeBaseline();
    setBaseline(next);
    setRecord(next);
    setErrors({});
  }, [identity, makeBaseline]);

  const setField = useCallback(
    <K extends keyof MemberRecord>(field: K, value: MemberRecord[K]) => {
      setRecord((prev) => {
        const next = { ...prev, [field]: value };
        setErrors((prevErrors) => {
          if (!(field in prevErrors)) return prevErrors;
          const fresh = validateMember(next, isAr);
          const key = field as MemberErrorKey;
          if (fresh[key]) return { ...prevErrors, [key]: fresh[key] };
          const { [key]: _drop, ...rest } = prevErrors;
          void _drop;
          return rest;
        });
        return next;
      });
    },
    [isAr],
  );

  const blurField = useCallback(
    (field: MemberErrorKey) => {
      setErrors((prev) => {
        const fresh = validateMember(record, isAr);
        if (fresh[field]) return { ...prev, [field]: fresh[field] };
        const { [field]: _drop, ...rest } = prev;
        void _drop;
        return rest;
      });
    },
    [record, isAr],
  );

  const registerRef = useCallback(
    (key: MemberErrorKey) => (el: HTMLElement | null) => {
      fieldRefs.current[key] = el;
    },
    [],
  );

  const idIssued = !!record.stringId;
  const canIssueId = memberReadyForId(record);

  // Issued once, never reissued — same permanence rule as the student ID.
  useEffect(() => {
    if (canIssueId && !record.stringId) {
      setRecord((prev) => (prev.stringId ? prev : { ...prev, stringId: generateMemberStringId() }));
    }
  }, [canIssueId, record.stringId]);

  const dirty = useMemo(() => isMemberDirty(record, baseline), [record, baseline]);
  const completion = useMemo(() => memberSectionCompletion(record), [record]);
  const progress = useMemo(() => memberProgress(record), [record]);
  const lockedByTeacher = scopeOf(record.type).sourceTeacher && !!record.sourceTeacherId;

  /** Changing role resets the scope — the old values describe a different job. */
  const handleChangeType = useCallback((type: AuthoredMemberTypeId) => {
    setRecord((prev) => ({
      ...prev,
      type,
      sourceTeacherId: '',
      campusIds: [],
      subjects: [],
      grades: [],
      termStart: '',
      termEnd: '',
    }));
    setErrors({});
  }, []);

  const handlePickTeacher = useCallback((teacher: { id: string; name: string; nameEn: string; campusId: string; gender: string; photoDataUrl: string; email: string; phone: string; loginEmail: string }) => {
    setRecord((prev) => ({
      ...prev,
      sourceTeacherId: teacher.id,
      name: teacher.name,
      nameEn: teacher.nameEn,
      gender: teacher.gender as MemberRecord['gender'],
      photoDataUrl: teacher.photoDataUrl,
      campusIds: teacher.campusId ? [teacher.campusId] : prev.campusIds,
      email: prev.email || teacher.email,
      phone: prev.phone || teacher.phone,
      loginEmail: prev.loginEmail || teacher.loginEmail,
    }));
    setErrors({});
  }, []);

  const handleClearTeacher = useCallback(() => {
    setRecord((prev) => ({ ...prev, sourceTeacherId: '' }));
  }, []);

  const handleSave = useCallback(() => {
    const fresh = validateMember(record, isAr);
    setErrors(fresh);
    const firstKey = MEMBER_ERROR_ORDER.find((k) => fresh[k]);
    if (firstKey) {
      scrollSectionIntoView(MEMBER_FIELD_SECTION[firstKey], scrollRef.current);
      window.setTimeout(() => fieldRefs.current[firstKey]?.focus(), 320);
      return;
    }

    const toSave: MemberRecord = {
      ...record,
      id: record.id || generateMemberRecordId(),
      isLocal: true,
    };
    saveMembers([toSave]);
    setRevision((r) => r + 1);
    setBaseline({ ...toSave });
    setRecord({ ...toSave });
    showToast(isNew ? t('msg.created') : t('msg.saved'));
    if (isNew) writeParams(toSave.id);
  }, [record, isAr, isNew, showToast, t, writeParams]);

  const handleDeleteOne = useCallback(() => {
    const name = isAr ? record.name : record.nameEn || record.name;
    setDanger({
      mode: 'typed',
      title: t('del.oneTitle'),
      body: fill(t('del.oneBody'), { name: name || '—' }),
      onConfirm: () => {
        setDanger(null);
        const snapshot = { ...record };
        deleteMembers([record.id]);
        setRevision((r) => r + 1);
        writeParams(null);
        showToast(t('msg.deleted'), () => {
          saveMember(snapshot);
          setRevision((r) => r + 1);
          showToast(t('msg.undone'));
        });
      },
    });
  }, [record, isAr, t, writeParams, showToast]);

  /* ─── Filters UI ─── */

  const active = activeMemberFields(filters);
  const shown = useMemo(
    () => (addFilterField && !active.includes(addFilterField) ? [...active, addFilterField] : active),
    [active, addFilterField],
  );

  const countsByField = useMemo(() => {
    const out: Partial<Record<MemberFilterField, Record<string, number>>> = {};
    for (const f of shown) out[f] = memberFacetCounts(rows, filters, f);
    return out;
  }, [rows, filters, shown]);

  const toggleFilterValue = useCallback((field: MemberFilterField, value: string) => {
    setFilters((prev) => {
      const current = prev[field] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      const out = { ...prev };
      if (next.length === 0) delete out[field];
      else out[field] = next;
      return out;
    });
  }, []);

  const quickFilters: QuickFilterGroup[] = useMemo(
    () =>
      (['type', 'campus', 'term'] as MemberFilterField[]).map((field) => {
        const counts = memberFacetCounts(rows, filters, field);
        const options = memberFieldOptions(field, locale as Locale, t)
          .map((o) => ({ ...o, count: counts[o.value] ?? 0 }))
          .filter((o) => o.count > 0 || (filters[field] ?? []).includes(o.value))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);
        return { field, label: t(memberFieldLabelKey(field)), options };
      }),
    [rows, filters, locale, t],
  );

  /* ─── Bulk ─── */

  const handleExport = useCallback(() => {
    const list = selected.length > 0 ? selected : visible;
    const header = ['name', 'nameEn', 'role', 'stringId', 'scope', 'email', 'phone'];
    const csv = [
      header.join(','),
      ...list.map((r) =>
        [r.name, r.nameEn, roleLabel(r.type, locale as Locale), r.stringId, r.scope, r.email, r.phone]
          .map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c))
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast(fill(t('msg.exported'), { n: list.length }));
  }, [selected, visible, showToast, t]);

  const handleBulkDelete = useCallback(() => {
    const deletable = selected.filter((r) => r.isLocal && !r.derived);
    const derivedCount = selected.filter((r) => r.derived).length;
    const seededCount = selected.length - deletable.length - derivedCount;

    if (deletable.length === 0) {
      showToast(t('del.nothing'));
      return;
    }

    const notes = [
      seededCount ? fill(t('del.seededSkipped'), { n: seededCount }) : '',
      derivedCount ? fill(t('del.derivedSkipped'), { n: derivedCount }) : '',
    ].filter(Boolean);

    setDanger({
      mode: 'password',
      title: t('del.title'),
      body: fill(t('del.body'), { n: deletable.length }),
      note: notes.join(' ') || undefined,
      onConfirm: () => {
        setDanger(null);
        const ids = deletable.map((r) => r.id);
        const snapshot = loadMembers().filter((m) => ids.includes(m.id));
        deleteMembers(ids);
        setSelectedIds(new Set());
        setRevision((r) => r + 1);
        showToast(fill(t('msg.deleted.bulk'), { n: deletable.length }), () => {
          saveMembers(snapshot);
          setRevision((r) => r + 1);
          showToast(t('msg.undone'));
        });
      },
    });
  }, [selected, showToast, t]);

  const handleResetPassword = useCallback(
    (row: MemberRow) => {
      const found = loadMembers().find((m) => m.id === row.id) ?? row.record;
      if (!found) return;
      saveMember({ ...found, password: generatePassword(), isLocal: true });
      setRevision((r) => r + 1);
      showToast(t('msg.reset'));
    },
    [showToast, t],
  );

  /* ─── Message / cards ─── */

  const messageRecipients: Recipient[] = useMemo(() => {
    if (!messageTarget) return [];
    return [
      {
        id: messageTarget.id,
        name: isAr ? messageTarget.name : messageTarget.nameEn || messageTarget.name,
        roleKey: messageTarget.derived ? 'msg.role.parent' : 'msg.role.member',
        contact: messageTarget.email || messageTarget.phone || undefined,
        unavailableKey: 'msg.noContact',
      },
    ];
  }, [messageTarget, isAr]);

  const cardData: AccessCardHolder[] = useMemo(
    () =>
      cardHolders.map((r) => ({
        id: r.id,
        name: r.name,
        nameEn: r.nameEn,
        stringId: r.stringId,
        loginEmail: r.record?.loginEmail ?? r.email,
        password: r.record?.password ?? '',
        subtitle: [roleLabel(r.type, locale as Locale), r.scope].filter(Boolean).join(' · '),
        photoDataUrl: r.photoDataUrl || undefined,
      })),
    [cardHolders, t],
  );

  /* ─── Palette + shortcuts ─── */

  const paletteActions: PaletteAction[] = useMemo(
    () => [
      { id: 'add', label: t('page.add'), icon: Plus, run: () => openPanel('new') },
      { id: 'edit', label: t('edit.mode'), icon: PencilLine, run: () => setEditMode(true) },
      { id: 'clear', label: t('filter.clear'), icon: Undo2, run: () => setFilters({}) },
    ],
    [t, openPanel],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement | null)?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e' && !typing) {
        e.preventDefault();
        setEditMode((v) => {
          if (v) setSelectedIds(new Set());
          return !v;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ─── Panel body ─── */

  const activeSection = useActiveSection({ sectionIds: MEMBER_SECTION_IDS, containerRef: scrollRef });

  const railSections: SqRailSection[] = useMemo(
    () =>
      MEMBER_SECTION_IDS.map((id) => ({
        id,
        label: t(SECTION_LABEL_KEY[id]),
        icon: MEMBER_SECTION_ICONS[id],
        complete: completion[id],
      })),
    [completion, t],
  );

  const sectionProps = {
    record,
    setField,
    blurField,
    errors,
    completion,
    locale: locale as Locale,
    t,
    registerRef,
  };

  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const hasErrors = Object.keys(errors).length > 0;

  const COLUMNS: { key: SortKey | 'photo' | 'term' | 'actions'; labelKey: string; sortable: boolean; cls: string }[] = [
    { key: 'photo', labelKey: '', sortable: false, cls: 'w-12' },
    { key: 'name', labelKey: 'col.name', sortable: true, cls: '' },
    { key: 'type', labelKey: 'col.type', sortable: true, cls: 'w-36' },
    { key: 'scope', labelKey: 'col.scope', sortable: true, cls: 'w-56 hidden lg:table-cell' },
    { key: 'term', labelKey: 'col.term', sortable: false, cls: 'w-32 hidden xl:table-cell' },
    { key: 'actions', labelKey: 'col.actions', sortable: false, cls: 'w-36' },
  ];

  const toggleRow = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openRow = (row: MemberRow) => {
    // A parent has no record of their own — editing happens on the student.
    if (row.derived) navigate(`/students?student=${row.parent?.primaryStudentId ?? ''}`);
    else openPanel(row.id);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-cairo" style={GRID_BG} dir={isAr ? 'rtl' : 'ltr'}>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              aria-label={t('page.back')}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
            >
              <BackIcon className="w-4 h-4" />
            </button>
          )}
          <span className="w-9 h-9 rounded-xl bg-sq-accent-500 flex items-center justify-center shrink-0 shadow-sm shadow-pink-500/30">
            <UserSquare className="w-4 h-4 text-white" aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-sq-ink truncate">{t('page.title')}</h1>
            <p className="text-[11px] font-bold text-slate-400 truncate">{t('page.subtitle')}</p>
          </div>

          <button
            type="button"
            onClick={toggleLocale}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
          >
            <Globe className="w-3.5 h-3.5" aria-hidden="true" />
            {isAr ? 'EN' : 'عربي'}
          </button>

          <button
            type="button"
            onClick={() => {
              if (editMode) setSelectedIds(new Set());
              setEditMode((v) => !v);
            }}
            aria-pressed={editMode}
            className={
              editMode
                ? 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sq-ink text-white text-[11px] font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-ink transition-colors shrink-0'
                : 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0'
            }
          >
            <PencilLine className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{editMode ? t('edit.exit') : t('edit.mode')}</span>
          </button>

          <button
            type="button"
            onClick={() => openPanel('new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sq-accent-500 text-white text-xs font-bold shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('page.add')}</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <ExpandableSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={t('page.search')}
          expanded={searchExpanded}
          onExpandedChange={setSearchExpanded}
          quickFilters={quickFilters}
          activeValues={filters as Record<string, string[]>}
          onToggleQuick={(f, v) => toggleFilterValue(f as MemberFilterField, v)}
          onOpenAdvanced={() => setAddFilterField('gender')}
          onOpenPalette={() => setPaletteOpen(true)}
          resultCount={visible.length}
          suggestions={suggestions.map((s) => ({
            id: s.id,
            label: isAr ? s.name : s.nameEn || s.name,
          }))}
          onPickSuggestion={(id) => {
            const found = rows.find((r) => r.id === id);
            if (found) openRow(found);
          }}
          locale={locale as Locale}
          t={t}
        />

        <div className="flex flex-wrap items-center gap-2">
          {shown.map((field) => (
            <FilterPill
              key={field}
              label={t(memberFieldLabelKey(field))}
              values={filters[field] ?? []}
              options={memberFieldOptions(field, locale as Locale, t)}
              counts={countsByField[field] ?? {}}
              onToggle={(v) => toggleFilterValue(field, v)}
              onClear={() => {
                const next = { ...filters };
                delete next[field];
                setFilters(next);
                if (addFilterField === field) setAddFilterField(null);
              }}
              locale={locale as 'ar' | 'en'}
              t={t}
              autoOpen={addFilterField === field}
            />
          ))}

          {MEMBER_FILTER_FIELDS.filter((f) => !shown.includes(f)).length > 0 && (
            <div className="relative">
              <select
                value=""
                onChange={(e) => {
                  const f = e.target.value as MemberFilterField;
                  if (!f) return;
                  setFilters((prev) => ({ ...prev, [f]: [] }));
                  setAddFilterField(f);
                }}
                aria-label={t('filter.add')}
                className="appearance-none inline-flex items-center px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 bg-transparent text-[11px] font-bold text-slate-500 font-cairo hover:border-sq-accent-500 hover:text-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors cursor-pointer"
              >
                <option value="">+ {t('filter.add')}</option>
                {MEMBER_FILTER_FIELDS.filter((f) => !shown.includes(f)).map((f) => (
                  <option key={f} value={f}>
                    {t(memberFieldLabelKey(f))}
                  </option>
                ))}
              </select>
            </div>
          )}

          {active.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilters({});
                setAddFilterField(null);
              }}
              className="px-2 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 font-cairo hover:text-sq-danger-600 hover:bg-sq-danger-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-danger-500 transition-colors"
            >
              {t('filter.clear')}
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-12 text-center">
            <p className="text-sm font-bold text-sq-ink">
              {debounced.trim() ? `${t('empty.title')} «${debounced.trim()}»` : t('empty.titleNoQuery')}
            </p>
            {suggestions.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-bold text-slate-400 mb-2">{t('empty.didYouMean')}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => openRow(s)}
                      className="px-3 py-1.5 rounded-full border border-sq-accent-200 bg-sq-accent-50 text-[11px] font-bold text-sq-accent-700 hover:bg-sq-accent-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
                    >
                      {isAr ? s.name : s.nameEn || s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => openPanel('new')}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sq-accent-500 text-white text-xs font-bold shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              {t('empty.addPlain')}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wide">
                    {editMode && (
                      <th scope="col" className="w-10 py-3 ps-3">
                        <input
                          type="checkbox"
                          checked={pageData.length > 0 && pageData.every((r) => selectedIds.has(r.id))}
                          onChange={() => {
                            const all = pageData.every((r) => selectedIds.has(r.id));
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              for (const r of pageData) {
                                if (all) next.delete(r.id);
                                else next.add(r.id);
                              }
                              return next;
                            });
                          }}
                          aria-label={t('bulk.selectAll')}
                          className="w-4 h-4 rounded border-slate-300 text-sq-accent-500 focus:ring-sq-accent-500 cursor-pointer"
                        />
                      </th>
                    )}
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        scope="col"
                        className={`py-3 px-3 text-start font-bold ${col.cls} ${
                          col.sortable ? 'cursor-pointer hover:text-slate-600 select-none' : ''
                        }`}
                        onClick={
                          col.sortable
                            ? () => {
                                const key = col.key as SortKey;
                                setSort((prev) =>
                                  prev.key === key
                                    ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                                    : { key, dir: 'asc' },
                                );
                              }
                            : undefined
                        }
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {col.labelKey ? t(col.labelKey) : ''}
                          {col.sortable &&
                            (sort.key !== col.key ? (
                              <ArrowUpDown className="w-3 h-3 opacity-40" aria-hidden="true" />
                            ) : sort.dir === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-sq-accent-600" aria-hidden="true" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-sq-accent-600" aria-hidden="true" />
                            ))}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageData.map((r) => {
                    const checked = selectedIds.has(r.id);
                    const meta = memberType(r.type);
                    return (
                      <tr
                        key={r.id}
                        onClick={() => (editMode ? toggleRow(r.id) : openRow(r))}
                        className={
                          checked
                            ? 'cursor-pointer bg-sq-accent-50/70 transition-colors'
                            : r.id === editing?.id
                              ? 'cursor-pointer bg-sq-accent-50 transition-colors'
                              : r.expired
                                // A lapsed grant is still a record, just not a
                                // live one — muted rather than hidden.
                                ? 'cursor-pointer opacity-60 hover:bg-slate-50 transition-colors'
                                : 'cursor-pointer hover:bg-slate-50 transition-colors'
                        }
                      >
                        {editMode && (
                          <td className="py-2.5 ps-3" onClick={(ev) => ev.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRow(r.id)}
                              aria-label={r.name}
                              className="w-4 h-4 rounded border-slate-300 text-sq-accent-500 focus:ring-sq-accent-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-2.5 px-3">
                          {r.photoDataUrl ? (
                            <img src={r.photoDataUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center ${meta.iconBg}`}>
                              <meta.icon className={`w-4 h-4 ${meta.iconColor}`} aria-hidden="true" />
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-sq-ink">
                            <Highlighted text={isAr ? r.name : r.nameEn || r.name} query={debounced} />
                          </span>
                          {r.stringId && (
                            <span className="ms-2 font-mono text-[10px] text-slate-400 align-middle">
                              {r.stringId}
                            </span>
                          )}
                          {r.derived && (
                            <span className="block text-[10px] font-bold text-slate-400">
                              {t('parent.readOnly')}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 whitespace-nowrap">
                            {roleLabel(r.type, locale as Locale)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 hidden lg:table-cell text-slate-500 text-xs truncate">
                          {r.scope || '—'}
                        </td>
                        <td className="py-2.5 px-3 hidden xl:table-cell">
                          <TermCell row={r} t={t} />
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="flex items-center gap-0.5">
                            <RowAction
                              icon={UserSquare}
                              label={r.derived ? t('row.openStudent') : t('row.profile')}
                              onClick={() => (r.derived ? openRow(r) : showToast(t('row.profileSoon')))}
                            />
                            <RowAction
                              icon={MessageSquare}
                              label={t('row.message')}
                              onClick={() => setMessageTarget(r)}
                            />
                            <RowAction
                              icon={IdCard}
                              label={t('row.card')}
                              disabled={!r.stringId}
                              onClick={() => setCardHolders([r])}
                            />
                            <RowAction
                              icon={KeyRound}
                              label={r.isLocal ? t('reset.title') : t('reset.seeded')}
                              disabled={!r.isLocal || r.derived}
                              onClick={() => handleResetPassword(r)}
                            />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                {visible.length.toLocaleString(isAr ? 'ar-EG' : 'en-US')} {t('page.count')}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, safePage - 1))}
                    disabled={safePage === 1}
                    aria-label="Previous page"
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500"
                  >
                    {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </button>
                  <span className="px-3 text-[11px] font-bold text-slate-600 tabular-nums">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                    disabled={safePage === totalPages}
                    aria-label="Next page"
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500"
                  >
                    {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <ShortcutsBar shortcuts={SHORTCUTS} locale={locale as Locale} t={t} />
      </main>

      <PeekPanel
        open={panelOpen}
        title={isNew ? t('panel.new') : t('panel.edit')}
        subtitle={isNew ? undefined : record.stringId}
        locale={locale as 'ar' | 'en'}
        mode={mode}
        onModeChange={setMode}
        onClose={() => writeParams(null)}
        labels={{
          expand: t('panel.expand'),
          collapse: t('panel.collapse'),
          close: t('panel.close'),
          resize: t('panel.resize'),
        }}
        headerActions={
          isNew ? undefined : (
            <button
              type="button"
              onClick={() => showToast(t('row.profileSoon'))}
              aria-label={t('row.profile')}
              title={t('row.profile')}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
            >
              <UserSquare className="w-4 h-4" />
            </button>
          )
        }
      >
        {(compact) => (
          <div className="flex-1 flex flex-col min-h-0">
            {compact && (
              <div className="shrink-0 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
                <SqAnchoringRail
                  sections={railSections}
                  activeId={activeSection}
                  onActivate={(id) => scrollSectionIntoView(id, scrollRef.current)}
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
                    activeId={activeSection}
                    onActivate={(id) => scrollSectionIntoView(id, scrollRef.current)}
                    variant="vertical"
                    activeBg={RAIL_ACTIVE_BG}
                    activeHalo={RAIL_HALO}
                    activeIconColor={RAIL_ICON}
                    checkBg={RAIL_CHECK}
                    optionalLabel={t('f.optionalShort')}
                  />
                )}

                <div className="flex-1 min-w-0 space-y-4 max-w-3xl">
                  <ScopeSection
                    {...sectionProps}
                    isNew={isNew}
                    onChangeType={handleChangeType}
                    onPickTeacher={handlePickTeacher}
                    onClearTeacher={handleClearTeacher}
                  />
                  <IdentitySection
                    {...sectionProps}
                    idIssued={idIssued}
                    lockedByTeacher={lockedByTeacher}
                  />
                  <EmploymentSection {...sectionProps} />
                  <ContactSection {...sectionProps} />
                  <CredentialsSection
                    {...sectionProps}
                    passwordVisible={passwordVisible}
                    onTogglePassword={() => setPasswordVisible((v) => !v)}
                    onGeneratePassword={() => setField('password', generatePassword())}
                    onCopyLogin={() => {
                      navigator.clipboard?.writeText(`${record.loginEmail}\n${record.password}`).then(
                        () => showToast(t('msg.copied')),
                        () => undefined,
                      );
                    }}
                  />

                  {!isNew && record.isLocal && (
                    <button
                      type="button"
                      onClick={handleDeleteOne}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-sq-danger-500/30 bg-white px-4 py-2.5 text-xs font-bold text-sq-danger-600 hover:bg-sq-danger-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-danger-500 transition-colors"
                    >
                      {t('panel.delete')}
                    </button>
                  )}

                  <div className="h-2" />
                </div>
              </div>
            </div>

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
                        style={{ width: `${(progress.done / progress.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 tabular-nums whitespace-nowrap">
                      {progress.done} {t('panel.progress')} {progress.total}
                    </span>
                  </div>
                  {(dirty || hasErrors) && (
                    <p
                      className={
                        hasErrors
                          ? 'mt-1 text-[10px] font-bold text-sq-danger-600 truncate'
                          : 'mt-1 text-[10px] font-bold text-amber-600 truncate'
                      }
                    >
                      {hasErrors ? t('msg.errors') : t('panel.unsaved')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => writeParams(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors shrink-0"
                >
                  {t('panel.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sq-accent-500 text-white text-xs font-bold shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
                >
                  {isNew ? t('panel.saveNew') : t('panel.save')}
                </button>
              </div>
            </footer>
          </div>
        )}
      </PeekPanel>

      {/* Explicit type arg: JSX won't infer T from `index` alone here. */}
      <CommandPalette<MemberRow>
        open={paletteOpen}
        index={index}
        actions={paletteActions}
        getLabel={(r) => (isAr ? r.name : r.nameEn || r.name)}
        getHint={(r) => [roleLabel(r.type, locale as Locale), r.scope].filter(Boolean).join(' · ')}
        itemsGroupLabel={t('cmd.members')}
        locale={locale as Locale}
        t={t}
        onOpenItem={openRow}
        onClose={() => setPaletteOpen(false)}
      />

      <ComposeMessageSheet
        open={!!messageTarget}
        subjectName={messageTarget ? (isAr ? messageTarget.name : messageTarget.nameEn || messageTarget.name) : ''}
        recipients={messageRecipients}
        locale={locale as Locale}
        t={t}
        onSend={(ids) => {
          setMessageTarget(null);
          showToast(fill(t('msg.sent'), { n: ids.length }));
        }}
        onClose={() => setMessageTarget(null)}
      />

      <AccessCardOverlay
        open={cardHolders.length > 0}
        holders={cardData}
        locale={locale as Locale}
        t={t}
        onClose={() => setCardHolders([])}
      />

      <ConfirmDangerDialog
        open={!!danger}
        mode={danger?.mode ?? 'typed'}
        title={danger?.title ?? ''}
        body={danger?.body ?? ''}
        note={danger?.note}
        confirmWord={t('danger.deleteWord')}
        confirmLabel={t('bulk.delete')}
        locale={locale as Locale}
        t={t}
        onConfirm={() => danger?.onConfirm()}
        onClose={() => setDanger(null)}
      />

      {!toast && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          matchingCount={visible.length}
          onSelectAll={() => setSelectedIds(new Set(visible.map((r) => r.id)))}
          onClear={() => setSelectedIds(new Set())}
          // Scope is a property of the record, not a destination — there's
          // nowhere to "move" a supervisor to.
          onMove={() => undefined}
          moveDisabledReason={t('bulk.noMove')}
          onDelete={handleBulkDelete}
          onExport={handleExport}
          onPrintCards={() => setCardHolders(selected.filter((r) => r.stringId))}
          locale={locale as Locale}
          t={t}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2 }}
            role="status"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] inline-flex items-center gap-2 ps-4 pe-2 py-2.5 rounded-xl bg-sq-ink text-white text-xs font-bold shadow-lg"
          >
            <Check className="w-3.5 h-3.5 text-sq-success-500 shrink-0" aria-hidden="true" />
            <span className="pe-1">{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => toast.undo?.()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors shrink-0"
              >
                <Undo2 className="w-3 h-3" aria-hidden="true" />
                {t('msg.undo')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MembersPage;
