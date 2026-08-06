/**
 * People — the global roster.
 *
 * Everyone in the school in one table: students, teachers, the five staff
 * roles and every parent, with the same search, filters, sorting, row actions
 * and bulk edit the Students and Teachers pages have. This *is* those pages,
 * unscoped.
 *
 * It used to be a search box over a grid of member-type cards, with a filter
 * panel pinned open above nothing. Two problems: the cards were navigation
 * pretending to be content, and filters with no rows to filter are furniture.
 * Navigation moved to the rail (PeopleRail.tsx) and the body became the roster,
 * so a filter always has something to act on and pills only appear once added.
 *
 * Search, filters and the open panel all live in the URL, so a search is a link.
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
  Undo2,
  UserPlus,
  UserRound,
  UserSquare,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { generatePassword, saveStudent } from '../../utils/studentStorage';
import { saveTeacher } from '../../utils/teacherStorage';
import { loadMembers, saveMember, saveMembers, deleteMembers } from '../../utils/memberStorage';
import { loadStudents, deleteStudents, saveStudents } from '../../utils/studentStorage';
import { loadTeachers, deleteTeachers, saveTeachers } from '../../utils/teacherStorage';
import { fill, type Locale } from '../directory/directoryI18n';
import { getPeopleString } from './peopleI18n';
import { MEMBER_TYPES, memberType, typeLabelKey, type MemberType, type MemberTypeId } from './memberTypes';
import { AddMemberDialog } from './AddMemberDialog';
import { PeopleRail, type RailCounts } from './PeopleRail';
import {
  activeHubFields,
  applyHubFilters,
  buildDirectory,
  buildDirectoryIndex,
  campusName,
  countActiveHubFilters,
  directoryDidYouMean,
  filterScopeNote,
  hubFacetCounts,
  hubFieldLabelKey,
  hubFieldOptions,
  hubFiltersFromParams,
  hubFiltersToParams,
  searchDirectory,
  HUB_FILTER_FIELDS,
  type DirectoryEntry,
  type HubFilterField,
  type HubFilterState,
} from './peopleDirectory';
import { highlight } from '../directory/directorySearch';
import { ExpandableSearch, type QuickFilterGroup } from '../directory/ExpandableSearch';
import { CommandPalette, type PaletteAction } from '../directory/CommandPalette';
import { BulkActionBar } from '../directory/BulkActionBar';
import { ConfirmDangerDialog, type DangerMode } from '../directory/ConfirmDangerDialog';
import { AccessCardOverlay, type AccessCardHolder } from '../directory/AccessCard';
import { ComposeMessageSheet, type Recipient } from '../directory/ComposeMessageSheet';
import { ShortcutsBar, type ShortcutHint } from '../directory/ShortcutsBar';
import { FilterPill } from '../students/FilterPill';

const GRID_BG: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(0deg, rgba(148,163,184,0.16) 0 1px, transparent 1px 24px),' +
    'repeating-linear-gradient(90deg, rgba(148,163,184,0.16) 0 1px, transparent 1px 24px)',
};

const PAGE_SIZE = 15;

const SHORTCUTS: ShortcutHint[] = [
  { keys: '⌘K', labelKey: 'shortcuts.search' },
  { keys: '/', labelKey: 'shortcuts.focus' },
  { keys: '⌘E', labelKey: 'shortcuts.bulk' },
  { keys: 'Esc', labelKey: 'shortcuts.close' },
];

type SortKey = 'name' | 'type' | 'stringId' | 'campusId';

/** Type sorts in the order the rail lists them, not alphabetically. */
const TYPE_ORDER = new Map<MemberTypeId, number>(MEMBER_TYPES.map((m, i) => [m.id, i]));

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

interface PeopleHubPageProps {
  onExit?: () => void;
}

export const PeopleHubPage: React.FC<PeopleHubPageProps> = ({ onExit }) => {
  const { locale, toggleLocale } = useI18n();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAr = locale === 'ar';
  const t = useCallback((key: string) => getPeopleString(locale as Locale, key), [locale]);

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [debounced, setDebounced] = useState(search);
  const [filters, setFilters] = useState<HubFilterState>(() => hubFiltersFromParams(searchParams));
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [addFilterField, setAddFilterField] = useState<HubFilterField | null>(null);
  const [editMode, setEditMode] = useState(() => searchParams.get('edit') === '1');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<DirectoryEntry | null>(null);
  const [cardHolders, setCardHolders] = useState<DirectoryEntry[]>([]);
  const [danger, setDanger] = useState<{
    mode: DangerMode;
    title: string;
    body: string;
    note?: string;
    onConfirm: () => void;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<number | null>(null);

  /** Bumped after any write, to rebuild the directory from storage. */
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

  /* ─── Data ─── */

  const entries = useMemo(
    () => buildDirectory(locale as Locale),
    // `revision` is the write signal — the directory is rebuilt from storage
    // after a delete or a password reset rather than patched in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, revision],
  );
  const index = useMemo(() => buildDirectoryIndex(entries), [entries]);
  const filtered = useMemo(() => applyHubFilters(entries, filters), [entries, filters]);

  const hits = useMemo(() => {
    if (!debounced.trim()) return null;
    const allowed = new Set(filtered.map((e) => e.id));
    const all = searchDirectory(index, debounced);
    return all ? all.filter((h) => allowed.has(h.item.id)) : null;
  }, [debounced, index, filtered]);

  const visible = useMemo(() => {
    // Relevance wins while a query is active — a column sort would throw away
    // the ranking the search just computed.
    if (hits) return hits.map((h) => h.item);
    const out = [...filtered];
    const factor = sort.dir === 'asc' ? 1 : -1;
    out.sort((a, b) => {
      if (sort.key === 'type') {
        return ((TYPE_ORDER.get(a.type) ?? 99) - (TYPE_ORDER.get(b.type) ?? 99)) * factor;
      }
      const av = sort.key === 'name' ? (isAr ? a.name : a.nameEn || a.name) : String(a[sort.key] ?? '');
      const bv = sort.key === 'name' ? (isAr ? b.name : b.nameEn || b.name) : String(b[sort.key] ?? '');
      return av.localeCompare(bv, isAr ? 'ar' : 'en') * factor;
    });
    return out;
  }, [hits, filtered, sort, isAr]);

  const suggestions = useMemo(() => {
    if (visible.length > 0 || !debounced.trim()) return [];
    return directoryDidYouMean(index, debounced);
  }, [visible.length, debounced, index]);

  useEffect(() => setPage(1), [filters, debounced, sort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selected = useMemo(
    () => visible.filter((e) => selectedIds.has(e.id)),
    [visible, selectedIds],
  );

  /* ─── Counts for the rail ─── */

  const railCounts: RailCounts = useMemo(() => {
    const byType: Partial<Record<MemberTypeId, number>> = {};
    for (const e of entries) byType[e.type] = (byType[e.type] ?? 0) + 1;
    const other = MEMBER_TYPES.filter((m) => m.group === 'other').reduce(
      (n, m) => n + (byType[m.id] ?? 0),
      0,
    );
    return { student: byType.student ?? 0, teacher: byType.teacher ?? 0, other, byType };
  }, [entries]);

  /* ─── URL ─── */

  const writeParams = useCallback(
    (extra?: Record<string, string>) => {
      const next: Record<string, string> = { ...hubFiltersToParams(filters), ...extra };
      if (debounced.trim()) next.q = debounced.trim();
      if (editMode) next.edit = '1';
      setSearchParams(next, { replace: true });
    },
    [filters, debounced, editMode, setSearchParams],
  );

  useEffect(() => {
    writeParams();
  }, [writeParams]);

  /* ─── Filters ─── */

  const active = activeHubFields(filters);
  const shown = useMemo(
    () => (addFilterField && !active.includes(addFilterField) ? [...active, addFilterField] : active),
    [active, addFilterField],
  );

  const countsByField = useMemo(() => {
    const out: Partial<Record<HubFilterField, Record<string, number>>> = {};
    for (const f of shown) out[f] = hubFacetCounts(entries, filters, f);
    return out;
  }, [entries, filters, shown]);

  const toggleFilterValue = useCallback((field: HubFilterField, value: string) => {
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
      (['type', 'campus', 'grade'] as HubFilterField[]).map((field) => {
        const counts = hubFacetCounts(entries, filters, field);
        const options = hubFieldOptions(field, locale as Locale, t, entries)
          .map((o) => ({ ...o, count: counts[o.value] ?? 0 }))
          .filter((o) => o.count > 0 || (filters[field] ?? []).includes(o.value))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);
        return { field, label: t(hubFieldLabelKey(field)), options };
      }),
    [entries, filters, locale, t],
  );

  /** Which active filters narrow the roster to only some kinds of person. */
  const scopeNotes = useMemo(
    () =>
      active
        .map((f) => ({ field: f, note: filterScopeNote(f, locale as Locale, t) }))
        .filter((x): x is { field: HubFilterField; note: string } => !!x.note),
    [active, locale, t],
  );

  /* ─── Actions ─── */

  const openEntry = useCallback((e: DirectoryEntry) => navigate(e.route), [navigate]);

  const handlePickType = useCallback(
    (m: MemberType) => {
      setAddOpen(false);
      navigate(m.route);
    },
    [navigate],
  );

  /** Writes a new password back to whichever store owns the record. */
  const handleResetPassword = useCallback(
    (e: DirectoryEntry) => {
      const password = generatePassword();
      if (e.type === 'student') {
        const found = loadStudents().find((s) => s.id === e.id);
        if (found) saveStudent({ ...found, password, isLocal: true });
      } else if (e.type === 'teacher') {
        const found = loadTeachers().find((s) => s.id === e.id);
        if (found) saveTeacher({ ...found, password, isLocal: true });
      } else {
        const found = loadMembers().find((s) => s.id === e.id);
        if (found) saveMember({ ...found, password, isLocal: true });
      }
      setRevision((r) => r + 1);
      showToast(t('msg.reset'));
    },
    [showToast, t],
  );

  const messageRecipients: Recipient[] = useMemo(() => {
    if (!messageTarget) return [];
    const roleKey =
      messageTarget.type === 'student' ? 'msg.role.student'
        : messageTarget.type === 'teacher' ? 'msg.role.teacher'
          : messageTarget.type === 'parent' ? 'msg.role.parent'
            : 'msg.role.member';
    return [
      {
        id: messageTarget.id,
        name: isAr ? messageTarget.name : messageTarget.nameEn || messageTarget.name,
        roleKey,
        contact: messageTarget.loginEmail || messageTarget.phone || undefined,
        unavailableKey: 'msg.noContact',
      },
    ];
  }, [messageTarget, isAr]);

  const cardData: AccessCardHolder[] = useMemo(
    () =>
      cardHolders.map((e) => ({
        id: e.id,
        name: e.name,
        nameEn: e.nameEn,
        stringId: e.stringId,
        loginEmail: e.loginEmail,
        password: e.password,
        subtitle: [t(typeLabelKey(e.type)), campusName(e.campusId, locale as Locale)]
          .filter((s) => s && s !== '—')
          .join(' · '),
        photoDataUrl: e.photoDataUrl || undefined,
      })),
    [cardHolders, locale, t],
  );

  const handleExport = useCallback(() => {
    const rows = selected.length > 0 ? selected : visible;
    const header = ['name', 'nameEn', 'type', 'stringId', 'campus', 'detail', 'loginEmail', 'phone'];
    const csv = [
      header.join(','),
      ...rows.map((r) =>
        [
          r.name, r.nameEn, r.type, r.stringId,
          campusName(r.campusId, locale as Locale), r.detail, r.loginEmail, r.phone,
        ]
          .map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c))
          .join(','),
      ),
    ].join('\n');
    // BOM so Excel reads the Arabic columns as UTF-8.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'people.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast(fill(t('msg.exported'), { n: rows.length }));
  }, [selected, visible, locale, showToast, t]);

  const handleBulkDelete = useCallback(() => {
    const deletable = selected.filter((e) => e.isLocal && !e.derived);
    const derivedCount = selected.filter((e) => e.derived).length;
    const seededCount = selected.length - deletable.length - derivedCount;

    const notes = [
      seededCount ? fill(t('del.seededSkipped'), { n: seededCount }) : '',
      derivedCount ? fill(t('del.derivedSkipped'), { n: derivedCount }) : '',
    ].filter(Boolean);

    if (deletable.length === 0) {
      showToast(t('del.nothing'));
      return;
    }

    setDanger({
      mode: 'password',
      title: t('del.title'),
      body: fill(t('del.body'), { n: deletable.length }),
      note: notes.join(' ') || undefined,
      onConfirm: () => {
        setDanger(null);
        // Snapshot before deleting, so Undo can put them back byte for byte.
        const students = loadStudents().filter((s) => deletable.some((d) => d.id === s.id));
        const teachers = loadTeachers().filter((s) => deletable.some((d) => d.id === s.id));
        const members = loadMembers().filter((s) => deletable.some((d) => d.id === s.id));

        deleteStudents(students.map((s) => s.id));
        deleteTeachers(teachers.map((s) => s.id));
        deleteMembers(members.map((s) => s.id));
        setSelectedIds(new Set());
        setRevision((r) => r + 1);

        showToast(fill(t('msg.deleted.bulk'), { n: deletable.length }), () => {
          if (students.length) saveStudents(students);
          if (teachers.length) saveTeachers(teachers);
          if (members.length) saveMembers(members);
          setRevision((r) => r + 1);
          showToast(t('msg.undone'));
        });
      },
    });
  }, [selected, showToast, t]);

  /**
   * Moving means something different per type — a section for a student, a
   * campus for a supervisor — so a mixed selection has nowhere to go. Students
   * are the only type with a move dialog, and it lives on their own roster.
   */
  const moveDisabledReason = useMemo(() => {
    const types = new Set(selected.map((e) => e.type));
    if (types.size > 1) return t('bulk.mixed');
    if (!types.has('student')) return t('bulk.studentsOnly');
    return undefined;
  }, [selected, t]);

  /* ─── Keyboard ─── */

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

  const paletteActions: PaletteAction[] = useMemo(
    () => [
      { id: 'add', label: t('quick.addMember'), icon: UserPlus, run: () => setAddOpen(true) },
      { id: 'edit', label: t('quick.bulk'), icon: PencilLine, run: () => setEditMode(true) },
      { id: 'clear', label: t('filter.clear'), icon: Undo2, run: () => setFilters({}) },
    ],
    [t],
  );

  /* ─── Render ─── */

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const COLUMNS: { key: SortKey | 'photo' | 'actions'; labelKey: string; sortable: boolean; cls: string }[] = [
    { key: 'photo', labelKey: '', sortable: false, cls: 'w-12' },
    { key: 'name', labelKey: 'col.name', sortable: true, cls: '' },
    { key: 'type', labelKey: 'col.type', sortable: true, cls: 'w-32' },
    { key: 'stringId', labelKey: 'col.stringId', sortable: true, cls: 'w-32 hidden sm:table-cell' },
    { key: 'campusId', labelKey: 'col.campus', sortable: true, cls: 'w-44 hidden xl:table-cell' },
    { key: 'actions', labelKey: 'col.actions', sortable: false, cls: 'w-36' },
  ];

  const toggleRow = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="min-h-screen bg-slate-50 font-cairo" style={GRID_BG} dir={isAr ? 'rtl' : 'ltr'}>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
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
          <img src="/string-logo.svg" alt="" className="w-8 h-8 shrink-0" />
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
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sq-accent-500 text-white text-xs font-bold shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('quick.addMember')}</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-start gap-6">
        <PeopleRail
          counts={railCounts}
          totalCount={entries.length}
          variant="vertical"
          locale={locale as Locale}
          t={t}
          onNavigate={navigate}
          onAddMember={() => setAddOpen(true)}
          onBulk={() => setEditMode(true)}
          onImport={() => navigate('/students?import=1')}
        />

        <main className="flex-1 min-w-0 space-y-4">
          <PeopleRail
            counts={railCounts}
            totalCount={entries.length}
            variant="horizontal"
            locale={locale as Locale}
            t={t}
            onNavigate={navigate}
            onAddMember={() => setAddOpen(true)}
            onBulk={() => setEditMode(true)}
            onImport={() => navigate('/students?import=1')}
          />

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
            onToggleQuick={(f, v) => toggleFilterValue(f as HubFilterField, v)}
            onOpenAdvanced={() => setAddFilterField('campus')}
            onOpenPalette={() => setPaletteOpen(true)}
            resultCount={visible.length}
            suggestions={suggestions.map((s) => ({
              id: s.id,
              label: isAr ? s.name : s.nameEn || s.name,
            }))}
            onPickSuggestion={(id) => {
              const found = entries.find((e) => e.id === id);
              if (found) openEntry(found);
            }}
            locale={locale as Locale}
            t={t}
          />

          {/* Pills, only once a filter exists — the panel that used to sit here
              permanently open had nothing to act on. */}
          <div className="flex flex-wrap items-center gap-2">
            {shown.map((field) => (
              <FilterPill
                key={field}
                label={t(hubFieldLabelKey(field))}
                values={filters[field] ?? []}
                options={hubFieldOptions(field, locale as Locale, t, entries)}
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

            {HUB_FILTER_FIELDS.filter((f) => !shown.includes(f)).length > 0 && (
              <div className="relative">
                <select
                  value=""
                  onChange={(e) => {
                    const f = e.target.value as HubFilterField;
                    if (!f) return;
                    setFilters((prev) => ({ ...prev, [f]: [] }));
                    setAddFilterField(f);
                  }}
                  aria-label={t('filter.add')}
                  className="appearance-none inline-flex items-center px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 bg-transparent text-[11px] font-bold text-slate-500 font-cairo hover:border-sq-accent-500 hover:text-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors cursor-pointer"
                >
                  <option value="">+ {t('filter.add')}</option>
                  {HUB_FILTER_FIELDS.filter((f) => !shown.includes(f)).map((f) => (
                    <option key={f} value={f}>
                      {t(hubFieldLabelKey(f))}
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

          {/* A grade filter can't describe a teacher, so say so rather than
              letting them silently vanish. */}
          {scopeNotes.length > 0 && (
            <p className="px-1 text-[10px] font-bold text-slate-400">
              {scopeNotes
                .map((s) =>
                  fill(t('filter.scopedTo'), {
                    field: t(hubFieldLabelKey(s.field)),
                    type: s.note,
                  }),
                )
                .join(' · ')}
            </p>
          )}

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
                        onClick={() => openEntry(s)}
                        className="px-3 py-1.5 rounded-full border border-sq-accent-200 bg-sq-accent-50 text-[11px] font-bold text-sq-accent-700 hover:bg-sq-accent-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
                      >
                        {isAr ? s.name : s.nameEn || s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {countActiveHubFilters(filters) > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters({})}
                  className="mt-5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-sq-accent-600 hover:bg-sq-accent-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
                >
                  {t('empty.clearFilters')}
                </button>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sq-accent-500 text-white text-xs font-bold shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('empty.addPlain')}
                </button>
              </div>
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
                            checked={pageData.length > 0 && pageData.every((e) => selectedIds.has(e.id))}
                            onChange={() => {
                              const all = pageData.every((e) => selectedIds.has(e.id));
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                for (const e of pageData) {
                                  if (all) next.delete(e.id);
                                  else next.add(e.id);
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
                    {pageData.map((e) => {
                      const checked = selectedIds.has(e.id);
                      const meta = memberType(e.type);
                      const canReset = e.isLocal && !e.derived;
                      const canCard = !!e.stringId && !e.derived;
                      return (
                        <tr
                          key={e.id}
                          onClick={() => (editMode ? toggleRow(e.id) : openEntry(e))}
                          className={
                            checked
                              ? 'cursor-pointer bg-sq-accent-50/70 transition-colors'
                              : 'cursor-pointer hover:bg-slate-50 transition-colors'
                          }
                        >
                          {editMode && (
                            <td className="py-2.5 ps-3" onClick={(ev) => ev.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleRow(e.id)}
                                aria-label={e.name}
                                className="w-4 h-4 rounded border-slate-300 text-sq-accent-500 focus:ring-sq-accent-500 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="py-2.5 px-3">
                            {e.photoDataUrl ? (
                              <img
                                src={e.photoDataUrl}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center ${meta.iconBg}`}>
                                <meta.icon className={`w-4 h-4 ${meta.iconColor}`} aria-hidden="true" />
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-sq-ink">
                              <Highlighted text={isAr ? e.name : e.nameEn || e.name} query={debounced} />
                            </span>
                            {e.detail && (
                              <span className="block text-[11px] font-bold text-slate-400 truncate">
                                {e.detail}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 whitespace-nowrap">
                              {t(typeLabelKey(e.type))}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 hidden sm:table-cell">
                            <span className="font-mono text-[11px] text-slate-500">{e.stringId || '—'}</span>
                          </td>
                          <td className="py-2.5 px-3 hidden xl:table-cell text-slate-500 text-xs truncate">
                            {e.campusId ? campusName(e.campusId, locale as Locale) : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="flex items-center gap-0.5">
                              <RowAction
                                icon={UserSquare}
                                label={e.derived ? t('row.openStudent') : t('row.profile')}
                                onClick={() =>
                                  e.derived ? openEntry(e) : showToast(t('row.profileSoon'))
                                }
                              />
                              <RowAction
                                icon={MessageSquare}
                                label={t('row.message')}
                                onClick={() => setMessageTarget(e)}
                              />
                              <RowAction
                                icon={IdCard}
                                label={t('row.card')}
                                disabled={!canCard}
                                onClick={() => setCardHolders([e])}
                              />
                              <RowAction
                                icon={KeyRound}
                                label={canReset ? t('reset.title') : t('reset.seeded')}
                                disabled={!canReset}
                                onClick={() => handleResetPassword(e)}
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
      </div>

      <AddMemberDialog
        open={addOpen}
        locale={locale as Locale}
        t={t}
        onPick={handlePickType}
        onClose={() => setAddOpen(false)}
      />

      {/* Explicit type arg: JSX won't infer T from `index` alone here. */}
      <CommandPalette<DirectoryEntry>
        open={paletteOpen}
        index={index}
        actions={paletteActions}
        getLabel={(e) => (isAr ? e.name : e.nameEn || e.name)}
        getHint={(e) => [t(typeLabelKey(e.type)), e.stringId].filter(Boolean).join(' · ')}
        itemsGroupLabel={t('cmd.people')}
        locale={locale as Locale}
        t={t}
        onOpenItem={openEntry}
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
          onSelectAll={() => setSelectedIds(new Set(visible.map((e) => e.id)))}
          onClear={() => setSelectedIds(new Set())}
          onMove={() => navigate('/students?edit=1')}
          moveDisabledReason={moveDisabledReason}
          onDelete={handleBulkDelete}
          onExport={handleExport}
          onPrintCards={() => setCardHolders(selected.filter((e) => e.stringId && !e.derived))}
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

export default PeopleHubPage;
