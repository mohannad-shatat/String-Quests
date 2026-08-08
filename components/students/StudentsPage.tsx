/**
 * Student Manager — roster page hosting the add/edit peek panel.
 *
 * The roster merges two sources: the ~2.3k deterministic seeded records from
 * data/mockAttendanceData.ts (read-only demo data) and anything created here,
 * which lives in localStorage. Editing a seeded record saves a local copy
 * rather than mutating the mock dataset.
 *
 * Panel state lives in the URL (`?student=new` / `?student=<id>`) so a refresh
 * or a shared link reopens it. No other overlay in the repo does this — it's
 * scoped to this page.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FileUp,
  Globe,
  IdCard,
  Mail,
  PencilLine,
  Plus,
  Undo2,
  UserPlus,
  Users,
  UserSquare,
} from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { useConfirmDialog } from '../ui/useConfirmDialog';
import {
  loadStudents,
  saveStudent,
  saveStudents,
  deleteStudent as removeStudent,
  deleteStudents,
  generateRecordId,
  clearDraft,
} from '../../utils/studentStorage';
import { emptyGuardian, type Guardian, type StudentRecord } from './studentTypes';
import { seededStudents } from './seedStudents';
import { fill, getStudentsString, type Locale } from './studentsI18n';
import { useStudentForm } from './useStudentForm';
import { StudentsTable, PAGE_SIZE, type SortState } from './StudentsTable';
import { StudentForm } from './StudentForm';
import { StudentPeekPanel, loadPanelMode, type PanelMode } from './StudentPeekPanel';
import { ResetPasswordDialog } from './ResetPasswordDialog';
import { buildInviteMessage, type InviteRelation } from './ParentQrInvite';
import { QrFullscreen } from './QrFullscreen';
import { FilterBar, type SortKey } from './FilterBar';
import { StudentsEmptyState } from './StudentsEmptyState';
import { BulkActionBar } from './BulkActionBar';
import { MoveStudentsDialog, type MoveTarget } from './MoveStudentsDialog';
import { ImportCsvDialog } from './ImportCsvDialog';
import { InviteStudentsDialog } from './InviteStudentsDialog';
import { CommandPalette, type PaletteAction } from './CommandPalette';
import { buildSearchIndex, didYouMean, searchStudents, type SearchHit } from './studentSearch';
import {
  activeFields,
  applyFilters,
  deleteView as removeView,
  facetCounts,
  fieldDef,
  filtersFromParams,
  filtersToParams,
  loadViews,
  saveView as persistView,
  type FilterField,
  type FilterState,
  type SavedView,
} from './studentFilters';
import { downloadCsv, rowToStudent, studentsToCsv, type ParsedRow } from './studentCsv';
import { ExpandableSearch, type QuickFilterGroup } from '../directory/ExpandableSearch';
import { ShortcutsBar, type ShortcutHint } from '../directory/ShortcutsBar';
import { ConfirmDangerDialog, type DangerMode } from '../directory/ConfirmDangerDialog';
import { AccessCardOverlay, type AccessCardHolder } from '../directory/AccessCard';
import { ComposeMessageSheet, type Recipient } from '../directory/ComposeMessageSheet';

/** Faint graph-paper backdrop, matching the enrolment screens. */
const GRID_BG: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(0deg, rgba(148,163,184,0.16) 0 1px, transparent 1px 24px),' +
    'repeating-linear-gradient(90deg, rgba(148,163,184,0.16) 0 1px, transparent 1px 24px)',
};

/** Discoverability for the bindings that already exist on this page. */
const SHORTCUTS: ShortcutHint[] = [
  { keys: '⌘K', labelKey: 'shortcuts.search' },
  { keys: '/', labelKey: 'shortcuts.focus' },
  { keys: '⌘E', labelKey: 'shortcuts.edit' },
  { keys: '⌘S', labelKey: 'shortcuts.save' },
  { keys: 'Esc', labelKey: 'shortcuts.close' },
];

interface StudentsPageProps {
  onExit?: () => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({ onExit }) => {
  const { locale, toggleLocale } = useI18n();
  const reduce = useReducedMotion();
  const { confirm, dialog } = useConfirmDialog();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAr = locale === 'ar';
  const t = useCallback((key: string) => getStudentsString(locale as Locale, key), [locale]);

  const [local, setLocal] = useState<StudentRecord[]>(() => loadStudents());
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [filters, setFilters] = useState<FilterState>(() => filtersFromParams(searchParams));
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<PanelMode>(loadPanelMode);
  const [saving, setSaving] = useState(false);
  const [inviteCopied, setInviteCopied] = useState<InviteRelation | null>(null);
  const [resetTarget, setResetTarget] = useState<StudentRecord | null>(null);
  /** Which parent's code is expanded, or null when closed. */
  const [qrFullscreen, setQrFullscreen] = useState<InviteRelation | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  /** Bumped to ask the filter bar to open its full field menu. */
  const [advancedSignal, setAdvancedSignal] = useState(0);
  const [messageTarget, setMessageTarget] = useState<StudentRecord | null>(null);
  const [cardHolders, setCardHolders] = useState<StudentRecord[]>([]);
  const [danger, setDanger] = useState<{
    mode: DangerMode;
    title: string;
    body: string;
    note?: string;
    onConfirm: () => void;
  } | null>(null);

  // Edit mode + selection. `?edit=1` / `?import=1` let the People Hub's quick
  // actions land directly in bulk mode or the importer.
  const [editMode, setEditMode] = useState(() => searchParams.get('edit') === '1');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<string | null>(null);

  // Dialogs
  const [moveOpen, setMoveOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(() => searchParams.get('import') === '1');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const [views, setViews] = useState<SavedView[]>(() => loadViews());

  /** Toast with an optional undo — bulk actions are scary without one. */
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string, undo?: () => void) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = window.setTimeout(() => setToast(null), undo ? 8000 : 2600);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  // Debounce the search so 2,300 records aren't re-ranked on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 150);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Derived once in seedStudents.ts and shared with the People hub, so both
  // read the same guardians rather than each synthesising their own.
  const seeded = useMemo(() => seededStudents(), []);

  /** Local records win over a seeded record with the same id. */
  const students = useMemo(() => {
    const localIds = new Set(local.map((s) => s.id));
    return [...local, ...seeded.filter((s) => !localIds.has(s.id))];
  }, [local, seeded]);

  /* ─── Derived roster: filter → search → sort ─── */

  const searchIndex = useMemo(() => buildSearchIndex(students), [students]);

  const filtered = useMemo(() => applyFilters(students, filters), [students, filters]);

  const hits = useMemo(() => {
    if (!debouncedSearch.trim()) return null;
    const filteredIds = new Set(filtered.map((s) => s.id));
    const all = searchStudents(searchIndex, debouncedSearch);
    return all ? all.filter((h) => filteredIds.has(h.student.id)) : null;
  }, [debouncedSearch, searchIndex, filtered]);

  const hitsById = useMemo(() => {
    if (!hits) return undefined;
    return new Map<string, SearchHit>(hits.map((h) => [h.student.id, h]));
  }, [hits]);

  const visible = useMemo(() => {
    // With a query, relevance order wins — re-sorting by column would throw
    // away the ranking the user just asked for.
    if (hits) return hits.map((h) => h.student);

    const out = [...filtered];
    const factor = sort.dir === 'asc' ? 1 : -1;
    out.sort((a, b) => {
      switch (sort.key) {
        case 'grade':
          return ((a.grade ?? 0) - (b.grade ?? 0)) * factor;
        case 'createdAt':
          return ((a.createdAt || 0) - (b.createdAt || 0)) * factor;
        case 'dateOfBirth':
          return (a.dateOfBirth || '').localeCompare(b.dateOfBirth || '') * factor;
        default: {
          const av = String(a[sort.key as keyof StudentRecord] ?? '');
          const bv = String(b[sort.key as keyof StudentRecord] ?? '');
          return av.localeCompare(bv, isAr ? 'ar' : 'en') * factor;
        }
      }
    });
    return out;
  }, [hits, filtered, sort, isAr]);

  const suggestions = useMemo(() => {
    if (visible.length > 0 || !debouncedSearch.trim()) return [];
    return didYouMean(searchIndex, debouncedSearch);
  }, [visible.length, debouncedSearch, searchIndex]);

  // A filter or query change can strand the user on a page that no longer
  // exists; snap back rather than showing an empty table.
  useEffect(() => {
    setPage(1);
  }, [filters, debouncedSearch]);

  /* ─── Selection ─── */

  const selectedStudents = useMemo(
    () => visible.filter((s) => selectedIds.has(s.id)),
    [visible, selectedIds],
  );

  const toggleSelect = useCallback(
    (student: StudentRecord, shiftKey: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        // Shift-click extends from the last clicked row through this one.
        if (shiftKey && lastClickedRef.current) {
          const from = visible.findIndex((s) => s.id === lastClickedRef.current);
          const to = visible.findIndex((s) => s.id === student.id);
          if (from !== -1 && to !== -1) {
            const [lo, hi] = from < to ? [from, to] : [to, from];
            for (let i = lo; i <= hi; i++) next.add(visible[i].id);
            return next;
          }
        }
        if (next.has(student.id)) next.delete(student.id);
        else next.add(student.id);
        return next;
      });
      lastClickedRef.current = student.id;
    },
    [visible],
  );

  const togglePage = useCallback((rows: StudentRecord[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of rows) {
        if (select) next.add(s.id);
        else next.delete(s.id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const exitEditMode = useCallback(() => {
    setEditMode(false);
    clearSelection();
  }, [clearSelection]);

  /* ─── Panel target, driven by the URL ─── */

  const targetParam = searchParams.get('student');
  const isNew = targetParam === 'new';
  const panelOpen = targetParam !== null;

  const editing = useMemo(() => {
    if (!targetParam || isNew) return null;
    return students.find((s) => s.id === targetParam) ?? null;
  }, [targetParam, isNew, students]);

  // A stale ?student=<id> (deleted, or a bad link) shouldn't leave an empty
  // panel hanging — drop the param.
  useEffect(() => {
    if (targetParam && !isNew && !editing) {
      setSearchParams({}, { replace: true });
    }
  }, [targetParam, isNew, editing, setSearchParams]);

  const form = useStudentForm({
    initial: editing,
    isAr,
    existing: students,
    autosaveDraft: isNew,
  });

  /**
   * Rebuilds the whole query string from state. Filters, search and the open
   * panel all live in the URL, so every mutation goes through here — writing
   * a bare `{ student: id }` would silently drop the user's filters.
   */
  const writeParams = useCallback(
    (studentParam: string | null, opts?: { replace?: boolean }) => {
      const next: Record<string, string> = { ...filtersToParams(filters) };
      if (debouncedSearch.trim()) next.q = debouncedSearch.trim();
      if (studentParam) next.student = studentParam;
      setSearchParams(next, { replace: opts?.replace ?? false });
    },
    [filters, debouncedSearch, setSearchParams],
  );

  const openPanel = useCallback((id: string) => writeParams(id), [writeParams]);

  const closePanel = useCallback(() => {
    clearDraft();
    writeParams(null);
  }, [writeParams]);

  // Keep filters/search in the URL without disturbing an open panel.
  useEffect(() => {
    const current = searchParams.get('student');
    const next: Record<string, string> = { ...filtersToParams(filters) };
    if (debouncedSearch.trim()) next.q = debouncedSearch.trim();
    if (current) next.student = current;

    const nextStr = new URLSearchParams(next).toString();
    if (nextStr !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // searchParams is intentionally read, not depended on — including it would
    // loop, since this effect writes to it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, debouncedSearch]);

  /* ─── Guarded navigation ─── */

  const confirmDiscard = useCallback(
    async (bodyKey: 'msg.confirmClose' | 'msg.confirmSwitch') => {
      if (!form.dirty) return true;
      return confirm({
        titleAr: 'تغييرات غير محفوظة',
        titleEn: 'Unsaved changes',
        bodyAr: getStudentsString('ar', bodyKey),
        bodyEn: getStudentsString('en', bodyKey),
        confirmLabelAr: 'تجاهل',
        confirmLabelEn: 'Discard',
        destructive: true,
      });
    },
    [form.dirty, confirm],
  );

  const handleClose = useCallback(async () => {
    if (await confirmDiscard('msg.confirmClose')) closePanel();
  }, [confirmDiscard, closePanel]);

  const handleSelect = useCallback(
    async (student: StudentRecord) => {
      if (student.id === targetParam) return;
      if (panelOpen && !(await confirmDiscard('msg.confirmSwitch'))) return;
      openPanel(student.id);
    },
    [targetParam, panelOpen, confirmDiscard, openPanel],
  );

  const handleAdd = useCallback(async () => {
    if (panelOpen && !(await confirmDiscard('msg.confirmSwitch'))) return;
    openPanel('new');
  }, [panelOpen, confirmDiscard, openPanel]);

  /* ─── Persistence ─── */

  const handleSave = useCallback(() => {
    setSaving(true);
    const record: StudentRecord = {
      ...form.record,
      id: form.record.id || generateRecordId(),
      isLocal: true,
    };
    let next = saveStudent(record);

    // Flush the other half of every family link made in this session. A
    // seeded sibling gets promoted to a local record, since the mock dataset
    // can't be written to.
    for (const siblingId of form.pendingLinks) {
      const sibling = next.find((s) => s.id === siblingId) ?? students.find((s) => s.id === siblingId);
      if (sibling && sibling.familyId !== record.familyId) {
        next = saveStudent({ ...sibling, familyId: record.familyId, isLocal: true });
      }
    }

    setLocal(next);
    const saved = next.find((s) => s.id === record.id) ?? record;
    form.commit(saved);
    setSaving(false);
    showToast(isNew ? t('msg.created') : t('msg.saved'));
    // Keep the panel open on the freshly-created record so staff can copy the
    // login or keep editing, rather than bouncing them back to the roster.
    if (isNew) setSearchParams({ student: saved.id }, { replace: true });
  }, [form, students, isNew, showToast, t, setSearchParams]);

  /** Single delete asks you to type the word — cheap, but not accidental. */
  const handleDelete = useCallback(() => {
    const record = form.record;
    const name = isAr ? record.name : record.nameEn || record.name;
    setDanger({
      mode: 'typed',
      title: t('del.oneTitle'),
      body: fill(t('del.oneBody'), { name: name || '—' }),
      onConfirm: () => {
        setDanger(null);
        const snapshot = { ...record };
        setLocal(removeStudent(record.id));
        clearDraft();
        writeParams(null);
        showToast(t('msg.deleted'), () => {
          setLocal(saveStudent(snapshot));
          showToast(t('msg.undone'));
        });
      },
    });
  }, [form.record, isAr, writeParams, showToast, t]);

  /**
   * Records the link in form state only. The sibling's own familyId is
   * written on save (see `handleSave`), so discarding the form leaves no
   * half-formed family behind.
   */
  const handleLinkFamily = useCallback(
    (siblingId: string) => {
      form.linkFamily(siblingId);
      showToast(t('msg.familyLinked'));
    },
    [form, showToast, t],
  );

  const handleCopyInviteMessage = useCallback(
    (relation: InviteRelation) => {
      const text = buildInviteMessage(
        form.record.name,
        form.record.studentId,
        locale as Locale,
        relation,
      );
      navigator.clipboard?.writeText(text).then(
        () => {
          setInviteCopied(relation);
          window.setTimeout(() => setInviteCopied(null), 2000);
        },
        () => {
          /* clipboard blocked */
        },
      );
    },
    [form.record.name, form.record.studentId, locale],
  );

  /** Inherit a linked sibling's guardians, with fresh ids so the two records
      stay independently editable. */
  const handleCopyGuardians = useCallback(
    (guardians: Guardian[]) => {
      form.setField(
        'guardians',
        guardians.map((g) => ({ ...g, id: emptyGuardian(g.relation).id + g.relation })),
      );
      showToast(t('msg.guardiansCopied'));
    },
    [form, showToast, t],
  );

  const handleResetPassword = useCallback(
    (student: StudentRecord, newPassword: string) => {
      const next = saveStudent({ ...student, password: newPassword, isLocal: true });
      setLocal(next);
      // Keep an open form in sync so it doesn't hold the stale password.
      if (form.record.id === student.id) {
        const saved = next.find((s) => s.id === student.id);
        if (saved) form.commit(saved);
      }
    },
    [form],
  );

  /* ─── Bulk actions ─── */

  /**
   * Bulk move. Seeded rows are promoted to local copies, since the mock
   * dataset can't be written to. Undo restores the exact prior records.
   */
  const handleBulkMove = useCallback(
    (target: MoveTarget) => {
      const before = selectedStudents.map((s) => ({ ...s }));
      const after = selectedStudents.map((s) => ({
        ...s,
        grade: target.grade ?? s.grade,
        section: target.section || s.section,
        campusId: target.campusId || s.campusId,
        isLocal: true,
      }));

      setLocal(saveStudents(after));
      setMoveOpen(false);
      clearSelection();
      showToast(fill(t('msg.moved'), { n: after.length }), () => {
        // Records that were seeded before the move go back to being absent
        // from local storage rather than being written back as local copies.
        const wasSeeded = before.filter((s) => !s.isLocal).map((s) => s.id);
        const wasLocal = before.filter((s) => s.isLocal);
        let next = deleteStudents(wasSeeded);
        if (wasLocal.length > 0) next = saveStudents(wasLocal);
        setLocal(next);
        showToast(t('msg.undone'));
      });
    },
    [selectedStudents, clearSelection, showToast, t],
  );

  /**
   * Bulk delete is password-gated: one click here can remove hundreds of
   * records, so the friction is proportional to the blast radius.
   */
  const handleBulkDelete = useCallback(() => {
    const deletable = selectedStudents.filter((s) => s.isLocal);
    const skipped = selectedStudents.length - deletable.length;
    if (deletable.length === 0 && skipped === 0) return;

    setDanger({
      mode: 'password',
      title: t('del.title'),
      body: fill(t('del.body'), { n: deletable.length }),
      note: skipped ? fill(t('del.seededSkipped'), { n: skipped }) : undefined,
      onConfirm: () => {
        setDanger(null);
        if (deletable.length === 0) return;
        const snapshot = deletable.map((s) => ({ ...s }));
        setLocal(deleteStudents(deletable.map((s) => s.id)));
        clearSelection();
        showToast(fill(t('msg.deleted.bulk'), { n: deletable.length }), () => {
          setLocal(saveStudents(snapshot));
          showToast(t('msg.undone'));
        });
      },
    });
  }, [selectedStudents, clearSelection, showToast, t]);

  const handleBulkExport = useCallback(() => {
    const rows = selectedStudents.length > 0 ? selectedStudents : visible;
    downloadCsv('students.csv', studentsToCsv(rows));
    showToast(fill(t('msg.exported'), { n: rows.length }));
  }, [selectedStudents, visible, showToast, t]);

  /** Applies a reviewed CSV import. Skipped rows are never written. */
  const handleCsvApply = useCallback(
    (rows: ParsedRow[]) => {
      const records: StudentRecord[] = [];
      for (const row of rows) {
        if (row.resolution === 'skip') continue;
        const base = row.resolution === 'update' ? row.duplicateOf : undefined;
        records.push(rowToStudent(row, base));
      }
      if (records.length === 0) return;

      const priorIds = new Set(loadStudents().map((s) => s.id));
      setLocal(saveStudents(records));
      setCsvOpen(false);
      showToast(fill(t('msg.imported'), { n: records.length }), () => {
        // Undo removes only what this import created; updates to
        // pre-existing records are left alone rather than half-reverted.
        const created = records.filter((r) => !priorIds.has(r.id)).map((r) => r.id);
        setLocal(deleteStudents(created));
        showToast(t('msg.undone'));
      });
    },
    [showToast, t],
  );

  /* ─── Quick filters for the expandable search ─── */

  /**
   * The handful of cuts worth a single tap. Counts come from the same
   * `facetCounts` the pills use, so the two never disagree; each group is
   * capped because this is a shortcut, not the full filter set.
   */
  const quickFilters: QuickFilterGroup[] = useMemo(() => {
    const groups: { field: FilterField; max: number }[] = [
      { field: 'grade', max: 6 },
      { field: 'section', max: 6 },
      { field: 'campus', max: 3 },
      { field: 'gender', max: 2 },
    ];

    return groups.map(({ field, max }) => {
      const def = fieldDef(field);
      const counts = facetCounts(students, filters, field);
      const options = def
        .options(locale as Locale)
        .map((o) => ({ ...o, count: counts[o.value] ?? 0 }))
        .filter((o) => o.count > 0 || (filters[field] ?? []).includes(o.value))
        .sort((a, b) => b.count - a.count)
        .slice(0, max);
      return { field, label: t(def.labelKey), options };
    });
  }, [students, filters, locale, t]);

  const toggleQuickFilter = useCallback((field: string, value: string) => {
    setFilters((prev) => {
      const key = field as FilterField;
      const current = prev[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      const out = { ...prev };
      if (next.length === 0) delete out[key];
      else out[key] = next;
      return out;
    });
  }, []);

  /* ─── Quick message ─── */

  /**
   * Recipients derived from the record, so the sheet never has to ask who the
   * message is for. Anyone without contact details is still listed, disabled,
   * with the reason — "why can't I message the mother?" deserves an answer.
   */
  const messageRecipients: Recipient[] = useMemo(() => {
    if (!messageTarget) return [];
    const out: Recipient[] = [
      {
        id: `student-${messageTarget.id}`,
        name: isAr ? messageTarget.name : messageTarget.nameEn || messageTarget.name,
        roleKey: 'msg.role.student',
        contact: messageTarget.loginEmail || messageTarget.phone || undefined,
        unavailableKey: 'msg.noContact',
      },
    ];
    for (const g of messageTarget.guardians) {
      if (!g.name.trim() && !g.phone.trim() && !g.email.trim()) continue;
      out.push({
        id: `guardian-${g.id}`,
        name: g.name.trim(),
        roleKey: 'msg.role.parent',
        contact: g.phone || g.email || undefined,
        unavailableKey: 'msg.noContact',
      });
    }
    return out;
  }, [messageTarget, isAr]);

  /* ─── Access cards ─── */

  const cardData: AccessCardHolder[] = useMemo(
    () =>
      cardHolders.map((s) => ({
        id: s.id,
        name: s.name,
        nameEn: s.nameEn,
        stringId: s.studentId,
        loginEmail: s.loginEmail,
        password: s.password,
        subtitle: [
          s.grade !== null ? `${t('f.grade')} ${s.grade}` : '',
          s.section,
        ]
          .filter(Boolean)
          .join(' · '),
        photoDataUrl: s.photoDataUrl || undefined,
      })),
    [cardHolders, t],
  );

  /* ─── Views ─── */

  const handleSaveView = useCallback(
    (name: string) => {
      const view: SavedView = {
        id: `view-${Date.now().toString(36)}`,
        name,
        filters,
        sortKey: sort.key,
        sortDir: sort.dir,
      };
      setViews(persistView(view));
      showToast(t('msg.viewSaved'));
    },
    [filters, sort, showToast, t],
  );

  const handleApplyView = useCallback((view: SavedView) => {
    setFilters(view.filters);
    setSort({ key: view.sortKey as SortKey, dir: view.sortDir });
  }, []);

  const handleCopyLogin = useCallback(() => {
    const text = `${form.record.loginEmail}\n${form.record.password}`;
    navigator.clipboard?.writeText(text).then(
      () => showToast(t('msg.copied')),
      () => {
        /* clipboard blocked — nothing useful to say */
      },
    );
  }, [form.record.loginEmail, form.record.password, showToast, t]);

  const paletteActions: PaletteAction[] = useMemo(
    () => [
      { id: 'add', label: t('add.manual'), icon: UserPlus, run: handleAdd },
      { id: 'csv', label: t('add.csv'), icon: FileUp, run: () => setCsvOpen(true) },
      { id: 'invite', label: t('add.invite'), icon: Mail, run: () => setInviteOpen(true) },
      { id: 'edit', label: t('edit.mode'), icon: PencilLine, run: () => setEditMode(true) },
      { id: 'clear', label: t('filter.clear'), icon: Undo2, run: () => setFilters({}) },
    ],
    [t, handleAdd],
  );

  /**
   * Page-level shortcuts. `⌘K` opens the palette; `⌘E` toggles bulk edit —
   * both guarded so they never fire while typing into a field.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement;

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

  /* Cmd/Ctrl+S saves while the panel is open. */
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, handleSave]);

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <div
      className="min-h-screen bg-slate-50 font-cairo"
      style={GRID_BG}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Header */}
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
            onClick={() => (editMode ? exitEditMode() : setEditMode(true))}
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

          {/* Split button: manual add stays one click; the other routes in
              never add a step to it. */}
          <div className="relative shrink-0">
            <span className="inline-flex items-stretch rounded-xl bg-sq-accent-500 shadow-sm shadow-pink-500/30 overflow-hidden">
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-xs font-bold hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t('page.add')}</span>
              </button>
              <button
                type="button"
                onClick={() => setAddMenuOpen((v) => !v)}
                aria-expanded={addMenuOpen}
                aria-label={t('add.menu')}
                className="px-2 border-s border-white/25 text-white hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </span>

            {addMenuOpen && (
              <>
                <span
                  className="fixed inset-0 z-40"
                  aria-hidden="true"
                  onClick={() => setAddMenuOpen(false)}
                />
                <div
                  className={
                    isAr
                      ? 'absolute top-full mt-1.5 left-0 z-50 w-56 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden py-1'
                      : 'absolute top-full mt-1.5 right-0 z-50 w-56 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden py-1'
                  }
                >
                  {[
                    { icon: UserPlus, label: t('add.manual'), run: handleAdd },
                    { icon: FileUp, label: t('add.csv'), run: () => setCsvOpen(true) },
                    { icon: Mail, label: t('add.invite'), run: () => setInviteOpen(true) },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setAddMenuOpen(false);
                        item.run();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-start hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 transition-colors"
                    >
                      <item.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                      <span className="text-[11px] font-bold text-slate-700 font-cairo">{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Roster */}
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
          onToggleQuick={toggleQuickFilter}
          onOpenAdvanced={() => setAdvancedSignal((n) => n + 1)}
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

        <FilterBar
          students={students}
          filters={filters}
          onFiltersChange={setFilters}
          sortKey={sort.key}
          sortDir={sort.dir}
          onSortChange={(key, dir) => setSort({ key, dir })}
          views={views}
          onSaveView={handleSaveView}
          onApplyView={handleApplyView}
          onDeleteView={(id) => setViews(removeView(id))}
          locale={locale as Locale}
          t={t}
          openMenuSignal={advancedSignal}
        />

        {visible.length === 0 ? (
          <StudentsEmptyState
            query={debouncedSearch}
            suggestions={suggestions}
            activeFilters={activeFields(filters)}
            filters={filters}
            filterLabel={(f: FilterField) => t(fieldDef(f).labelKey)}
            onClearFilter={(f) => {
              const next = { ...filters };
              delete next[f];
              setFilters(next);
            }}
            onClearAll={() => setFilters({})}
            onOpenStudent={openPanel}
            onAddStudent={handleAdd}
            onImportCsv={() => setCsvOpen(true)}
            locale={locale as Locale}
            t={t}
          />
        ) : (
          <StudentsTable
            students={visible}
            hitsById={hitsById}
            query={debouncedSearch}
            locale={locale as Locale}
            t={t}
            sort={sort}
            onSortChange={setSort}
            page={page}
            onPageChange={setPage}
            selectedId={editing?.id ?? null}
            onSelect={handleSelect}
            onResetPassword={setResetTarget}
            onOpenProfile={() => showToast(t('row.profileSoon'))}
            onMessage={setMessageTarget}
            onPrintCard={(s) => setCardHolders([s])}
            editing={editMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onTogglePage={togglePage}
          />
        )}

        <ShortcutsBar shortcuts={SHORTCUTS} locale={locale as Locale} t={t} />
      </main>

      {/* Peek panel */}
      <StudentPeekPanel
        open={panelOpen}
        title={isNew ? t('panel.new') : t('panel.edit')}
        subtitle={isNew ? undefined : form.record.studentId}
        locale={locale as 'ar' | 'en'}
        mode={mode}
        onModeChange={setMode}
        onClose={handleClose}
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
                onClick={() => setCardHolders([form.record])}
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
          <StudentForm
            form={form}
            locale={locale as Locale}
            t={t}
            isNew={isNew}
            saving={saving}
            compact={compact}
            onSave={handleSave}
            onCancel={handleClose}
            onDelete={!isNew && form.record.isLocal ? handleDelete : undefined}
            onCopyLogin={handleCopyLogin}
            onCopyInviteMessage={handleCopyInviteMessage}
            inviteCopied={inviteCopied}
            onLinkFamily={handleLinkFamily}
            onOpenStudent={openPanel}
            onResetPassword={isNew ? undefined : () => setResetTarget(form.record)}
            onExpandQr={setQrFullscreen}
            onCopyGuardians={handleCopyGuardians}
          />
        )}
      </StudentPeekPanel>

      <QrFullscreen
        open={qrFullscreen !== null}
        studentName={form.record.name}
        studentId={form.record.studentId}
        relation={qrFullscreen ?? 'father'}
        locale={locale as Locale}
        t={t}
        onClose={() => setQrFullscreen(null)}
      />

      <ResetPasswordDialog
        student={resetTarget}
        locale={locale as 'ar' | 'en'}
        t={t}
        onConfirm={handleResetPassword}
        onClose={() => setResetTarget(null)}
      />

      <ComposeMessageSheet
        open={!!messageTarget}
        subjectName={
          messageTarget ? (isAr ? messageTarget.name : messageTarget.nameEn || messageTarget.name) : ''
        }
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

      <MoveStudentsDialog
        open={moveOpen}
        students={selectedStudents}
        locale={locale as Locale}
        t={t}
        onApply={handleBulkMove}
        onClose={() => setMoveOpen(false)}
      />

      <ImportCsvDialog
        open={csvOpen}
        existing={students}
        locale={locale as Locale}
        t={t}
        onApply={handleCsvApply}
        onClose={() => setCsvOpen(false)}
      />

      <InviteStudentsDialog
        open={inviteOpen}
        locale={locale as Locale}
        t={t}
        onSend={(emails) => {
          setInviteOpen(false);
          showToast(fill(t('msg.invitesSent'), { n: emails.length }));
        }}
        onCopyLink={(link, message) => {
          navigator.clipboard?.writeText(`${message}\n${link}`).then(
            () => showToast(t('msg.linkCopied')),
            () => {
              /* clipboard blocked */
            },
          );
        }}
        onClose={() => setInviteOpen(false)}
      />

      <CommandPalette
        open={paletteOpen}
        index={searchIndex}
        actions={paletteActions}
        locale={locale as Locale}
        t={t}
        onOpenStudent={(s) => openPanel(s.id)}
        onClose={() => setPaletteOpen(false)}
      />

      {/* The bulk bar and the toast share the bottom-centre slot, so the bar
          steps aside while a toast (and its Undo) is showing. */}
      {!toast && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          matchingCount={visible.length}
          onSelectAll={() => setSelectedIds(new Set(visible.map((s) => s.id)))}
          onClear={clearSelection}
          onMove={() => setMoveOpen(true)}
          onDelete={handleBulkDelete}
          onExport={handleBulkExport}
          onPrintCards={() => setCardHolders(selectedStudents)}
          locale={locale as Locale}
          t={t}
        />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2 }}
            role="status"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] inline-flex items-center gap-2 ps-4 pe-2 py-2.5 rounded-xl bg-sq-ink text-white text-xs font-bold shadow-lg font-cairo"
          >
            <Check className="w-3.5 h-3.5 text-sq-success-500 shrink-0" aria-hidden="true" />
            <span className="pe-1">{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors shrink-0"
              >
                <Undo2 className="w-3 h-3" aria-hidden="true" />
                {t('msg.undo')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {dialog}
    </div>
  );
};

export default StudentsPage;
