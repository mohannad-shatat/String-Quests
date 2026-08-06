/**
 * Teachers roster — the students page's twin, built on the shared directory
 * primitives rather than copied from it.
 *
 * Seeded records come from `EXTENDED_TEACHERS` (read-only demo data); anything
 * created or edited here lives in localStorage, and editing a seeded teacher
 * promotes it to a local record.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { EXTENDED_TEACHERS } from '../../data/mockAttendanceData';
import {
  loadTeachers,
  saveTeacher,
  saveTeachers,
  deleteTeachers,
  generateTeacherRecordId,
} from '../../utils/teacherStorage';
import { generatePassword } from '../../utils/studentStorage';
import {
  emptyTeacher,
  isTeacherDirty,
  teacherProgress,
  teacherReadyForId,
  teacherSectionCompletion,
  validateTeacher,
  TEACHER_ERROR_ORDER,
  TEACHER_FIELD_SECTION,
  TEACHER_SECTION_IDS,
  type TeacherErrorKey,
  type TeacherErrors,
  type TeacherRecord,
} from './teacherTypes';
import { fill, getTeachersString, type Locale } from './teachersI18n';
import {
  activeTeacherFields,
  applyTeacherFilters,
  buildTeacherIndex,
  campusLabel,
  fromSeedTeacher,
  newTeacherStringId,
  searchTeachers,
  subjectLabel,
  teacherDidYouMean,
  teacherFacetCounts,
  teacherFieldLabelKey,
  teacherFieldOptions,
  teacherFiltersFromParams,
  teacherFiltersToParams,
  TEACHER_FILTER_FIELDS,
  type TeacherFilterField,
  type TeacherFilterState,
} from './teacherFilters';
import {
  IdentitySection,
  SubjectsSection,
  EmploymentSection,
  ContactSection,
  CredentialsSection,
  TEACHER_SECTION_ICONS,
} from './TeacherSections';
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
  { keys: 'Esc', labelKey: 'shortcuts.close' },
];

type SortKey = 'name' | 'stringId' | 'subject' | 'campusId' | 'hireDate';

const RAIL_ACTIVE_BG = 'bg-sq-accent-500 shadow-sm shadow-pink-500/30';
const RAIL_HALO = 'bg-sq-accent-500/15';
const RAIL_ICON = 'text-sq-accent-700';
const RAIL_CHECK = 'bg-sq-accent-500 shadow-sm shadow-pink-500/30';

const SECTION_LABEL_KEY: Record<string, string> = {
  'tea-section-identity': 'sec.identity',
  'tea-section-subjects': 'sec.subjects',
  'tea-section-employment': 'sec.employment',
  'tea-section-contact': 'sec.contact',
  'tea-section-credentials': 'sec.credentials',
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

const RowAction: React.FC<{ icon: LucideIcon; label: string; onClick: () => void }> = ({
  icon: Icon,
  label,
  onClick,
}) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    aria-label={label}
    title={label}
    className="p-1.5 rounded-lg text-slate-300 hover:text-sq-accent-600 hover:bg-sq-accent-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
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

interface TeachersPageProps {
  onExit?: () => void;
}

export const TeachersPage: React.FC<TeachersPageProps> = ({ onExit }) => {
  const { locale, toggleLocale } = useI18n();
  const reduce = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAr = locale === 'ar';
  const t = useCallback((key: string) => getTeachersString(locale as Locale, key), [locale]);

  const [local, setLocal] = useState<TeacherRecord[]>(() => loadTeachers());
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [debounced, setDebounced] = useState(search);
  const [filters, setFilters] = useState<TeacherFilterState>(() => teacherFiltersFromParams(searchParams));
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<PanelMode>(loadPanelMode);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<TeacherRecord | null>(null);
  const [cardHolders, setCardHolders] = useState<TeacherRecord[]>([]);
  const [addFilterField, setAddFilterField] = useState<TeacherFilterField | null>(null);
  const [danger, setDanger] = useState<{
    mode: DangerMode;
    title: string;
    body: string;
    note?: string;
    onConfirm: () => void;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const lastClickedRef = useRef<string | null>(null);

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

  const seeded = useMemo(() => EXTENDED_TEACHERS.map(fromSeedTeacher), []);

  const teachers = useMemo(() => {
    const localIds = new Set(local.map((s) => s.id));
    return [...local, ...seeded.filter((s) => !localIds.has(s.id))];
  }, [local, seeded]);

  /* ─── URL ─── */

  const targetParam = searchParams.get('teacher');
  const isNew = targetParam === 'new';
  const panelOpen = targetParam !== null;

  const editing = useMemo(() => {
    if (!targetParam || isNew) return null;
    return teachers.find((s) => s.id === targetParam) ?? null;
  }, [targetParam, isNew, teachers]);

  const writeParams = useCallback(
    (teacherParam: string | null) => {
      const next: Record<string, string> = { ...teacherFiltersToParams(filters) };
      if (debounced.trim()) next.q = debounced.trim();
      if (teacherParam) next.teacher = teacherParam;
      setSearchParams(next, { replace: false });
    },
    [filters, debounced, setSearchParams],
  );

  const openPanel = useCallback((id: string) => writeParams(id), [writeParams]);

  useEffect(() => {
    const current = searchParams.get('teacher');
    const next: Record<string, string> = { ...teacherFiltersToParams(filters) };
    if (debounced.trim()) next.q = debounced.trim();
    if (current) next.teacher = current;
    if (new URLSearchParams(next).toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, debounced]);

  useEffect(() => {
    if (targetParam && !isNew && !editing) setSearchParams({}, { replace: true });
  }, [targetParam, isNew, editing, setSearchParams]);

  /* ─── Form state ─── */

  const makeBaseline = useCallback((): TeacherRecord => {
    if (editing) return { ...editing, password: editing.password || generatePassword() };
    return { ...emptyTeacher(), password: generatePassword() };
  }, [editing]);

  const [baseline, setBaseline] = useState<TeacherRecord>(makeBaseline);
  const [record, setRecord] = useState<TeacherRecord>(baseline);
  const [errors, setErrors] = useState<TeacherErrors>({});
  const [passwordVisible, setPasswordVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fieldRefs = useRef<Partial<Record<TeacherErrorKey, HTMLElement | null>>>({});

  const identity = editing?.id ?? '__new__';
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
    <K extends keyof TeacherRecord>(field: K, value: TeacherRecord[K]) => {
      setRecord((prev) => {
        const next = { ...prev, [field]: value };
        setErrors((prevErrors) => {
          if (!(field in prevErrors)) return prevErrors;
          const fresh = validateTeacher(next, isAr);
          const key = field as TeacherErrorKey;
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
    (field: TeacherErrorKey) => {
      setErrors((prev) => {
        const fresh = validateTeacher(record, isAr);
        if (fresh[field]) return { ...prev, [field]: fresh[field] };
        const { [field]: _drop, ...rest } = prev;
        void _drop;
        return rest;
      });
    },
    [record, isAr],
  );

  const registerRef = useCallback(
    (key: TeacherErrorKey) => (el: HTMLElement | null) => {
      fieldRefs.current[key] = el;
    },
    [],
  );

  const idIssued = !!record.stringId;
  const canIssueId = teacherReadyForId(record);

  // Issued once, never reissued — same permanence rule as the student ID.
  useEffect(() => {
    if (canIssueId && !record.stringId) {
      setRecord((prev) => (prev.stringId ? prev : { ...prev, stringId: newTeacherStringId() }));
    }
  }, [canIssueId, record.stringId]);

  const dirty = useMemo(() => isTeacherDirty(record, baseline), [record, baseline]);
  const completion = useMemo(() => teacherSectionCompletion(record), [record]);
  const progress = useMemo(() => teacherProgress(record), [record]);

  /* ─── Derived roster ─── */

  const index = useMemo(() => buildTeacherIndex(teachers), [teachers]);
  const filtered = useMemo(() => applyTeacherFilters(teachers, filters), [teachers, filters]);

  const hits = useMemo(() => {
    if (!debounced.trim()) return null;
    const ids = new Set(filtered.map((s) => s.id));
    const all = searchTeachers(index, debounced);
    return all ? all.filter((h) => ids.has(h.item.id)) : null;
  }, [debounced, index, filtered]);

  const visible = useMemo(() => {
    if (hits) return hits.map((h) => h.item);
    const out = [...filtered];
    const factor = sort.dir === 'asc' ? 1 : -1;
    out.sort((a, b) => {
      const av = String(a[sort.key] ?? '');
      const bv = String(b[sort.key] ?? '');
      return av.localeCompare(bv, isAr ? 'ar' : 'en') * factor;
    });
    return out;
  }, [hits, filtered, sort, isAr]);

  const suggestions = useMemo(() => {
    if (visible.length > 0 || !debounced.trim()) return [];
    return teacherDidYouMean(index, debounced);
  }, [visible.length, debounced, index]);

  useEffect(() => setPage(1), [filters, debounced]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectedTeachers = useMemo(
    () => visible.filter((s) => selectedIds.has(s.id)),
    [visible, selectedIds],
  );

  /* ─── Filters UI ─── */

  const active = activeTeacherFields(filters);
  const shown = useMemo(
    () => (addFilterField && !active.includes(addFilterField) ? [...active, addFilterField] : active),
    [active, addFilterField],
  );

  const countsByField = useMemo(() => {
    const out: Partial<Record<TeacherFilterField, Record<string, number>>> = {};
    for (const f of shown) out[f] = teacherFacetCounts(teachers, filters, f);
    return out;
  }, [teachers, filters, shown]);

  const toggleFilterValue = useCallback((field: TeacherFilterField, value: string) => {
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
      (['subject', 'grades', 'campus'] as TeacherFilterField[]).map((field) => {
        const counts = teacherFacetCounts(teachers, filters, field);
        const options = teacherFieldOptions(field, locale as Locale)
          .map((o) => ({ ...o, count: counts[o.value] ?? 0 }))
          .filter((o) => o.count > 0 || (filters[field] ?? []).includes(o.value))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);
        return { field, label: t(teacherFieldLabelKey(field)), options };
      }),
    [teachers, filters, locale, t],
  );

  /* ─── Save / delete ─── */

  const handleSave = useCallback(() => {
    const fresh = validateTeacher(record, isAr);
    setErrors(fresh);
    const firstKey = TEACHER_ERROR_ORDER.find((k) => fresh[k]);
    if (firstKey) {
      scrollSectionIntoView(TEACHER_FIELD_SECTION[firstKey], scrollRef.current);
      window.setTimeout(() => fieldRefs.current[firstKey]?.focus(), 320);
      return;
    }

    const toSave: TeacherRecord = {
      ...record,
      id: record.id || generateTeacherRecordId(),
      isLocal: true,
    };
    const next = saveTeachers([toSave]);
    setLocal(next);
    const saved = next.find((s) => s.id === toSave.id) ?? toSave;
    setBaseline({ ...saved });
    setRecord({ ...saved });
    showToast(isNew ? t('msg.created') : t('msg.saved'));
    if (isNew) writeParams(saved.id);
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
        setLocal(deleteTeachers([record.id]));
        writeParams(null);
        showToast(t('msg.deleted'), () => {
          setLocal(saveTeacher(snapshot));
          showToast(t('msg.undone'));
        });
      },
    });
  }, [record, isAr, t, writeParams, showToast]);

  const handleBulkDelete = useCallback(() => {
    const deletable = selectedTeachers.filter((s) => s.isLocal);
    const skipped = selectedTeachers.length - deletable.length;
    setDanger({
      mode: 'password',
      title: t('del.title'),
      body: fill(t('del.body'), { n: deletable.length }),
      note: skipped ? fill(t('del.seededSkipped'), { n: skipped }) : undefined,
      onConfirm: () => {
        setDanger(null);
        if (deletable.length === 0) return;
        const snapshot = deletable.map((s) => ({ ...s }));
        setLocal(deleteTeachers(deletable.map((s) => s.id)));
        setSelectedIds(new Set());
        showToast(fill(t('msg.deleted.bulk'), { n: deletable.length }), () => {
          setLocal(saveTeachers(snapshot));
          showToast(t('msg.undone'));
        });
      },
    });
  }, [selectedTeachers, t, showToast]);

  const handleExport = useCallback(() => {
    const rows = selectedTeachers.length > 0 ? selectedTeachers : visible;
    const header = ['name', 'nameEn', 'stringId', 'subject', 'grades', 'campusId', 'employmentType', 'loginEmail'];
    const csv = [
      header.join(','),
      ...rows.map((r) =>
        [r.name, r.nameEn, r.stringId, r.subject, r.grades.join(' '), r.campusId, r.employmentType, r.loginEmail]
          .map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c))
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teachers.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast(fill(t('msg.exported'), { n: rows.length }));
  }, [selectedTeachers, visible, showToast, t]);

  /* ─── Message / cards ─── */

  const messageRecipients: Recipient[] = useMemo(() => {
    if (!messageTarget) return [];
    return [
      {
        id: `teacher-${messageTarget.id}`,
        name: isAr ? messageTarget.name : messageTarget.nameEn || messageTarget.name,
        roleKey: 'msg.role.teacher',
        contact: messageTarget.loginEmail || messageTarget.email || messageTarget.phone || undefined,
        unavailableKey: 'msg.noContact',
      },
    ];
  }, [messageTarget, isAr]);

  const cardData: AccessCardHolder[] = useMemo(
    () =>
      cardHolders.map((s) => ({
        id: s.id,
        name: s.name,
        nameEn: s.nameEn,
        stringId: s.stringId,
        loginEmail: s.loginEmail,
        password: s.password,
        subtitle: [subjectLabel(s.subject, locale as Locale), campusLabel(s.campusId, locale as Locale)]
          .filter(Boolean)
          .join(' · '),
        photoDataUrl: s.photoDataUrl || undefined,
      })),
    [cardHolders, locale],
  );

  /* ─── Palette + shortcuts ─── */

  const paletteActions: PaletteAction[] = useMemo(
    () => [
      { id: 'add', label: t('add.manual'), icon: Plus, run: () => openPanel('new') },
      { id: 'edit', label: t('edit.mode'), icon: PencilLine, run: () => setEditMode(true) },
      { id: 'clear', label: t('filter.clear'), icon: Undo2, run: () => setFilters({}) },
    ],
    [t, openPanel],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ─── Panel body ─── */

  const activeSection = useActiveSection({ sectionIds: TEACHER_SECTION_IDS, containerRef: scrollRef });

  const railSections: SqRailSection[] = useMemo(
    () =>
      TEACHER_SECTION_IDS.map((id) => ({
        id,
        label: t(SECTION_LABEL_KEY[id]),
        icon: TEACHER_SECTION_ICONS[id],
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

  const COLUMNS: { key: SortKey | 'photo' | 'actions'; labelKey: string; sortable: boolean; cls: string }[] = [
    { key: 'photo', labelKey: '', sortable: false, cls: 'w-12' },
    { key: 'name', labelKey: 'col.name', sortable: true, cls: '' },
    { key: 'stringId', labelKey: 'col.stringId', sortable: true, cls: 'w-32 hidden sm:table-cell' },
    { key: 'subject', labelKey: 'col.subject', sortable: true, cls: 'w-32' },
    { key: 'campusId', labelKey: 'col.campus', sortable: true, cls: 'w-44 hidden lg:table-cell' },
    { key: 'actions', labelKey: 'col.actions', sortable: false, cls: 'w-36' },
  ];

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
            <Users className="w-4 h-4 text-white" aria-hidden="true" />
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
          onToggleQuick={(f, v) => toggleFilterValue(f as TeacherFilterField, v)}
          onOpenAdvanced={() => setAddFilterField('subject')}
          onOpenPalette={() => setPaletteOpen(true)}
          resultCount={visible.length}
          suggestions={suggestions.map((s) => ({
            id: s.id,
            label: isAr ? s.name : s.nameEn || s.name,
          }))}
          onPickSuggestion={openPanel}
          locale={locale as Locale}
          t={t}
        />

        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {shown.map((field) => (
            <FilterPill
              key={field}
              label={t(teacherFieldLabelKey(field))}
              values={filters[field] ?? []}
              options={teacherFieldOptions(field, locale as Locale)}
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

          {TEACHER_FILTER_FIELDS.filter((f) => !shown.includes(f)).length > 0 && (
            <div className="relative">
              <select
                value=""
                onChange={(e) => {
                  const f = e.target.value as TeacherFilterField;
                  if (!f) return;
                  setFilters((prev) => ({ ...prev, [f]: [] }));
                  setAddFilterField(f);
                }}
                aria-label={t('filter.add')}
                className="appearance-none inline-flex items-center px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 bg-transparent text-[11px] font-bold text-slate-500 font-cairo hover:border-sq-accent-500 hover:text-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors cursor-pointer"
              >
                <option value="">+ {t('filter.add')}</option>
                {TEACHER_FILTER_FIELDS.filter((f) => !shown.includes(f)).map((f) => (
                  <option key={f} value={f}>
                    {t(teacherFieldLabelKey(f))}
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

        {/* Table */}
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
                      onClick={() => openPanel(s.id)}
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
                          checked={pageData.length > 0 && pageData.every((s) => selectedIds.has(s.id))}
                          onChange={() => {
                            const all = pageData.every((s) => selectedIds.has(s.id));
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              for (const s of pageData) {
                                if (all) next.delete(s.id);
                                else next.add(s.id);
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
                                setPage(1);
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
                  {pageData.map((s) => {
                    const checked = selectedIds.has(s.id);
                    return (
                      <tr
                        key={s.id}
                        onClick={() =>
                          editMode
                            ? setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(s.id)) next.delete(s.id);
                                else next.add(s.id);
                                return next;
                              })
                            : openPanel(s.id)
                        }
                        className={
                          checked
                            ? 'cursor-pointer bg-sq-accent-50/70 transition-colors'
                            : s.id === editing?.id
                              ? 'cursor-pointer bg-sq-accent-50 transition-colors'
                              : 'cursor-pointer hover:bg-slate-50 transition-colors'
                        }
                      >
                        {editMode && (
                          <td className="py-2.5 ps-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(s.id)) next.delete(s.id);
                                  else next.add(s.id);
                                  return next;
                                })
                              }
                              aria-label={s.name}
                              className="w-4 h-4 rounded border-slate-300 text-sq-accent-500 focus:ring-sq-accent-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-2.5 px-3">
                          {s.photoDataUrl ? (
                            <img src={s.photoDataUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                              <UserRound className="w-4 h-4 text-slate-400" aria-hidden="true" />
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-sq-ink">
                            <Highlighted text={isAr ? s.name : s.nameEn || s.name} query={debounced} />
                          </span>
                          {s.isLocal && (
                            <span className="ms-2 px-1.5 py-0.5 rounded-full bg-sq-accent-50 text-sq-accent-700 text-[9px] font-bold align-middle">
                              {t('page.local')}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 hidden sm:table-cell">
                          <span className="font-mono text-[11px] text-slate-500">{s.stringId || '—'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-xs">
                          {subjectLabel(s.subject, locale as Locale)}
                        </td>
                        <td className="py-2.5 px-3 hidden lg:table-cell text-slate-500 text-xs truncate">
                          {campusLabel(s.campusId, locale as Locale)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="flex items-center gap-0.5">
                            <RowAction icon={UserSquare} label={t('row.profile')} onClick={() => showToast(t('row.profileSoon'))} />
                            <RowAction icon={MessageSquare} label={t('row.message')} onClick={() => setMessageTarget(s)} />
                            <RowAction icon={IdCard} label={t('row.card')} onClick={() => setCardHolders([s])} />
                            <RowAction icon={KeyRound} label={t('reset.title')} onClick={() => { setLocal(saveTeacher({ ...s, password: generatePassword(), isLocal: true })); showToast(t('msg.saved')); }} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                  {visible.length} {t('page.count')}
                </span>
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
              </div>
            )}
          </div>
        )}

        <ShortcutsBar shortcuts={SHORTCUTS} locale={locale as Locale} t={t} />
      </main>

      {/* Peek panel */}
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
            <>
              <button
                type="button"
                onClick={() => showToast(t('row.profileSoon'))}
                aria-label={t('row.profile')}
                title={t('row.profile')}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
              >
                <UserSquare className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCardHolders([record])}
                aria-label={t('row.card')}
                title={t('row.card')}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
              >
                <IdCard className="w-4 h-4" />
              </button>
            </>
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
                  <IdentitySection {...sectionProps} idIssued={idIssued} />
                  <SubjectsSection {...sectionProps} />
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
      <CommandPalette<TeacherRecord>
        open={paletteOpen}
        index={index}
        actions={paletteActions}
        getLabel={(s) => (isAr ? s.name : s.nameEn || s.name)}
        getHint={(s) => [s.stringId, subjectLabel(s.subject, locale as Locale)].filter(Boolean).join(' · ')}
        itemsGroupLabel={t('cmd.teachers')}
        locale={locale as Locale}
        t={t}
        onOpenItem={(s) => openPanel(s.id)}
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
          onSelectAll={() => setSelectedIds(new Set(visible.map((s) => s.id)))}
          onClear={() => setSelectedIds(new Set())}
          onMove={() => showToast(t('bulk.soon'))}
          onDelete={handleBulkDelete}
          onExport={handleExport}
          onPrintCards={() => setCardHolders(selectedTeachers)}
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

export default TeachersPage;
