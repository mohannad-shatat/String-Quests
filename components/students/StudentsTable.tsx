/**
 * The roster — sortable columns, selection, match highlighting, row actions.
 *
 * Rows come in pre-filtered and pre-sorted from the page: relevance ranking
 * and column sorting are different orderings of the same list, and deciding
 * between them here would duplicate that logic.
 *
 * Structure follows components/admin-hub/attendance/AttendanceReport.tsx, but
 * with logical properties throughout — that file's `left-2.5` / `pl-8 pr-3`
 * break under RTL.
 */

import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  IdCard,
  KeyRound,
  MessageSquare,
  UserRound,
  UserSquare,
  type LucideIcon,
} from 'lucide-react';
import type { SortKey } from './FilterBar';
import { highlight, type MatchField, type SearchHit } from './studentSearch';
import { CAMPUS_OPTIONS, GRADE_OPTIONS, label as optLabel } from './studentOptions';
import type { Locale } from './studentsI18n';
import type { StudentRecord } from './studentTypes';

export const PAGE_SIZE = 12;

export interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

interface StudentsTableProps {
  /** Already filtered and ordered. */
  students: StudentRecord[];
  /** Search hits by student id, for the "matched on…" hint. */
  hitsById?: Map<string, SearchHit>;
  query: string;
  locale: Locale;
  t: (key: string) => string;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  page: number;
  onPageChange: (page: number) => void;
  selectedId: string | null;
  onSelect: (student: StudentRecord) => void;
  onResetPassword: (student: StudentRecord) => void;
  onOpenProfile: (student: StudentRecord) => void;
  onMessage: (student: StudentRecord) => void;
  onPrintCard: (student: StudentRecord) => void;
  /** Edit mode — shows the checkbox column. */
  editing: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (student: StudentRecord, shiftKey: boolean) => void;
  onTogglePage: (students: StudentRecord[], select: boolean) => void;
}

const COLUMNS: { key: SortKey | 'photo' | 'actions'; labelKey: string; sortable: boolean; cls: string }[] = [
  { key: 'photo', labelKey: '', sortable: false, cls: 'w-12' },
  { key: 'name', labelKey: 'col.name', sortable: true, cls: '' },
  { key: 'studentId', labelKey: 'col.studentId', sortable: true, cls: 'w-32 hidden sm:table-cell' },
  { key: 'grade', labelKey: 'col.grade', sortable: true, cls: 'w-24' },
  { key: 'section', labelKey: 'col.section', sortable: true, cls: 'w-20' },
  { key: 'campusId', labelKey: 'col.campus', sortable: true, cls: 'w-44 hidden lg:table-cell' },
  { key: 'actions', labelKey: 'col.actions', sortable: false, cls: 'w-36' },
];

function campusLabel(id: string, locale: Locale): string {
  const opt = CAMPUS_OPTIONS.find((c) => c.value === id);
  return opt ? optLabel(opt, locale) : '—';
}

function gradeLabel(grade: number | null, locale: Locale): string {
  if (grade === null) return '—';
  const opt = GRADE_OPTIONS.find((g) => g.value === String(grade));
  return opt ? optLabel(opt, locale) : String(grade);
}

/** Renders text with the matched substring marked. */
const Highlighted: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim()) return <>{text}</>;
  const segments = highlight(text, query);
  return (
    <>
      {segments.map((s, i) =>
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

/** Fields worth calling out — a name hit is self-evident, a phone hit isn't. */
const NOTEWORTHY: MatchField[] = ['guardianName', 'guardianPhone', 'nationalId', 'loginEmail'];

/** One row-level icon button. Four of these per row, so it earns a component. */
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

export const StudentsTable: React.FC<StudentsTableProps> = ({
  students,
  hitsById,
  query,
  locale,
  t,
  sort,
  onSortChange,
  page,
  onPageChange,
  selectedId,
  onSelect,
  onResetPassword,
  onOpenProfile,
  onMessage,
  onPrintCard,
  editing,
  selectedIds,
  onToggleSelect,
  onTogglePage,
}) => {
  const isAr = locale === 'ar';

  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = students.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allOnPageSelected = pageData.length > 0 && pageData.every((s) => selectedIds.has(s.id));

  const toggleSort = (key: SortKey) => {
    onSortChange(
      sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );
    onPageChange(1);
  };

  const SortIcon: React.FC<{ column: SortKey }> = ({ column }) => {
    if (sort.key !== column) return <ArrowUpDown className="w-3 h-3 opacity-40" aria-hidden="true" />;
    return sort.dir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-sq-accent-600" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3 h-3 text-sq-accent-600" aria-hidden="true" />
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wide font-cairo">
              {editing && (
                <th scope="col" className="w-10 py-3 ps-3">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={() => onTogglePage(pageData, !allOnPageSelected)}
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
                  onClick={col.sortable ? () => toggleSort(col.key as SortKey) : undefined}
                  aria-sort={
                    col.sortable && sort.key === col.key
                      ? sort.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.labelKey ? t(col.labelKey) : ''}
                    {col.sortable && <SortIcon column={col.key as SortKey} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageData.map((s) => {
              const isOpen = s.id === selectedId;
              const isChecked = selectedIds.has(s.id);
              const hit = hitsById?.get(s.id);
              const noteworthy = hit && NOTEWORTHY.includes(hit.matchedField);

              return (
                <tr
                  key={s.id}
                  onClick={() => (editing ? onToggleSelect(s, false) : onSelect(s))}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      editing ? onToggleSelect(s, false) : onSelect(s);
                    }
                  }}
                  className={
                    isChecked
                      ? 'cursor-pointer bg-sq-accent-50/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sq-accent-500'
                      : isOpen
                        ? 'cursor-pointer bg-sq-accent-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sq-accent-500'
                        : 'cursor-pointer hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sq-accent-500'
                  }
                >
                  {editing && (
                    <td className="py-2.5 ps-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => undefined}
                        onClick={(e) => onToggleSelect(s, (e as React.MouseEvent).shiftKey)}
                        aria-label={s.name}
                        className="w-4 h-4 rounded border-slate-300 text-sq-accent-500 focus:ring-sq-accent-500 cursor-pointer"
                      />
                    </td>
                  )}

                  <td className="py-2.5 px-3">
                    {s.photoDataUrl ? (
                      <img
                        src={s.photoDataUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <UserRound className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-3">
                    <span className="font-bold text-sq-ink font-cairo">
                      <Highlighted text={isAr ? s.name : s.nameEn || s.name} query={query} />
                    </span>
                    {s.isLocal && (
                      <span className="ms-2 px-1.5 py-0.5 rounded-full bg-sq-accent-50 text-sq-accent-700 text-[9px] font-bold font-cairo align-middle">
                        {t('page.local')}
                      </span>
                    )}
                    {/* Explains a non-obvious hit — "why is this row here?" */}
                    {noteworthy && (
                      <span className="block text-[10px] font-bold text-slate-400 font-cairo">
                        {t('empty.matchedOn')} {t(`match.${hit.matchedField}`)}
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 hidden sm:table-cell">
                    <span className="font-mono text-[11px] text-slate-500">
                      <Highlighted text={s.studentId || '—'} query={query} />
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-cairo text-xs">
                    {gradeLabel(s.grade, locale)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-cairo text-xs">{s.section || '—'}</td>
                  <td className="py-2.5 px-3 hidden lg:table-cell text-slate-500 font-cairo text-xs truncate">
                    {campusLabel(s.campusId, locale)}
                  </td>

                  <td className="py-2.5 px-3">
                    {/* stopPropagation everywhere: the row itself opens the record. */}
                    <span className="flex items-center gap-0.5">
                      {/* A person badge, not a generic external-link glyph —
                          this opens a profile, and the icon should say so. */}
                      <RowAction
                        icon={UserSquare}
                        label={t('row.profile')}
                        onClick={() => onOpenProfile(s)}
                      />
                      <RowAction
                        icon={MessageSquare}
                        label={t('row.message')}
                        onClick={() => onMessage(s)}
                      />
                      <RowAction
                        icon={IdCard}
                        label={t('row.card')}
                        onClick={() => onPrintCard(s)}
                      />
                      <RowAction
                        icon={KeyRound}
                        label={t('reset.title')}
                        onClick={() => onResetPassword(s)}
                      />
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
          <span className="text-[11px] font-bold text-slate-400 font-cairo tabular-nums">
            {students.length} {t('page.count')}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500"
            >
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <span className="px-3 text-[11px] font-bold text-slate-600 font-cairo tabular-nums">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
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
  );
};

export default StudentsTable;
