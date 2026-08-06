/**
 * The filter bar — active pills, `+ Filter`, sort, and saved views.
 *
 * Progressive disclosure is the whole design: an unfiltered roster shows one
 * button. Complexity only appears once the user asks for it, so the page stays
 * approachable while still reaching ten filter fields.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, Bookmark, ChevronDown, Plus, Search, Star, X } from 'lucide-react';
import { FilterPill } from './FilterPill';
import {
  FILTER_FIELDS,
  activeFields,
  derivedOptions,
  facetCounts,
  fieldDef,
  type FilterField,
  type FilterState,
  type SavedView,
} from './studentFilters';
import type { Locale } from './studentsI18n';
import { fill } from './studentsI18n';
import type { StudentRecord } from './studentTypes';

export type SortKey =
  | 'name'
  | 'studentId'
  | 'grade'
  | 'section'
  | 'campusId'
  | 'dateOfBirth'
  | 'createdAt'
  | 'gender';

export const SORT_KEYS: SortKey[] = [
  'name', 'studentId', 'grade', 'section', 'campusId', 'dateOfBirth', 'createdAt', 'gender',
];

interface FilterBarProps {
  /** All students, pre-filter — facet counts are computed from this. */
  students: StudentRecord[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onSortChange: (key: SortKey, dir: 'asc' | 'desc') => void;
  views: SavedView[];
  onSaveView: (name: string) => void;
  onApplyView: (view: SavedView) => void;
  onDeleteView: (id: string) => void;
  locale: Locale;
  t: (key: string) => string;
  /** Bumped by the expandable search's "all advanced filters" link. */
  openMenuSignal?: number;
}

/* ─── Small dropdown shell, shared by the three menus here ────────────── */

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

const MENU_BASE =
  'absolute top-full mt-1.5 z-50 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden';

export const FilterBar: React.FC<FilterBarProps> = ({
  students,
  filters,
  onFiltersChange,
  sortKey,
  sortDir,
  onSortChange,
  views,
  onSaveView,
  onApplyView,
  onDeleteView,
  locale,
  t,
  openMenuSignal = 0,
}) => {
  const isAr = locale === 'ar';
  const [addOpen, setAddOpen] = useState(false);

  // Skip the initial render — only a *bump* should open the menu.
  const lastSignal = useRef(openMenuSignal);
  useEffect(() => {
    if (openMenuSignal !== lastSignal.current) {
      lastSignal.current = openMenuSignal;
      setAddOpen(true);
    }
  }, [openMenuSignal]);
  const [addQuery, setAddQuery] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [justAdded, setJustAdded] = useState<FilterField | null>(null);

  const addRef = useDismiss(addOpen, () => setAddOpen(false));
  const sortRef = useDismiss(sortOpen, () => setSortOpen(false));
  const viewsRef = useDismiss(viewsOpen, () => setViewsOpen(false));

  const active = activeFields(filters);

  /**
   * A freshly-added filter has no values yet, and `activeFields` (rightly)
   * ignores empty selections — so it needs to be rendered explicitly or the
   * pill would vanish the instant it was created.
   */
  const shown = useMemo(
    () => (justAdded && !active.includes(justAdded) ? [...active, justAdded] : active),
    [active, justAdded],
  );

  const inactive = FILTER_FIELDS.filter((f) => !shown.includes(f.field));

  const addable = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (!q) return inactive;
    return inactive.filter((f) => t(f.labelKey).toLowerCase().includes(q));
  }, [inactive, addQuery, t]);

  // One counts map per active field. Each excludes its own field so
  // multi-select within a pill doesn't zero out its siblings.
  const countsByField = useMemo(() => {
    const out: Partial<Record<FilterField, Record<string, number>>> = {};
    for (const f of shown) out[f] = facetCounts(students, filters, f);
    return out;
  }, [students, filters, shown]);

  const optionsFor = (field: FilterField) => {
    const def = fieldDef(field);
    const base = def.options(locale);
    return base.length > 0 ? base : derivedOptions(field, t);
  };

  const menuSide = isAr ? 'right-0' : 'left-0';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Active filters */}
      {shown.map((field) => (
        <FilterPill
          key={field}
          label={t(fieldDef(field).labelKey)}
          values={filters[field] ?? []}
          options={optionsFor(field)}
          counts={countsByField[field] ?? {}}
          onToggle={(value) => {
            const current = filters[field] ?? [];
            const next = current.includes(value)
              ? current.filter((v) => v !== value)
              : [...current, value];
            const updated = { ...filters };
            if (next.length === 0) delete updated[field];
            else updated[field] = next;
            onFiltersChange(updated);
          }}
          onClear={() => {
            const updated = { ...filters };
            delete updated[field];
            onFiltersChange(updated);
            if (justAdded === field) setJustAdded(null);
          }}
          locale={locale}
          t={t}
          autoOpen={justAdded === field}
        />
      ))}

      {/* + Filter */}
      {inactive.length > 0 && (
        <div ref={addRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setAddOpen((v) => !v);
              setAddQuery('');
            }}
            aria-expanded={addOpen}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 text-[11px] font-bold text-slate-500 font-cairo hover:border-sq-accent-500 hover:text-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
          >
            <Plus className="w-3 h-3" aria-hidden="true" />
            {t('filter.add')}
          </button>

          {addOpen && (
            <div className={`${MENU_BASE} ${menuSide} w-60`}>
              <div className="relative border-b border-slate-100">
                <Search
                  aria-hidden="true"
                  className="absolute top-1/2 -translate-y-1/2 start-3 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                />
                <input
                  autoFocus
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  placeholder={t('filter.search')}
                  dir={isAr ? 'rtl' : 'ltr'}
                  className="w-full ps-9 pe-3 py-2.5 text-xs font-medium text-slate-700 placeholder:text-slate-400 font-cairo focus:outline-none"
                />
              </div>
              <ul className="max-h-64 overflow-y-auto py-1">
                {addable.length === 0 && (
                  <li className="px-3 py-3 text-[11px] font-bold text-slate-400 font-cairo text-center">
                    {t('filter.noResults')}
                  </li>
                )}
                {addable.map((f) => {
                  const count = optionsFor(f.field).length;
                  return (
                    <li key={f.field}>
                      <button
                        type="button"
                        onClick={() => {
                          // Seed with no values; the pill opens straight away
                          // so the next click is a value, not another menu.
                          onFiltersChange({ ...filters, [f.field]: [] });
                          setJustAdded(f.field);
                          setAddOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-start hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 transition-colors"
                      >
                        <span className="flex-1 text-[11px] font-bold text-slate-700 font-cairo truncate">
                          {t(f.labelKey)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 tabular-nums">{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="px-3 py-2 border-t border-slate-100 text-[10px] font-bold text-slate-400 font-cairo leading-snug">
                {t('filter.hint')}
              </p>
            </div>
          )}
        </div>
      )}

      {active.length > 0 && (
        <button
          type="button"
          onClick={() => {
            onFiltersChange({});
            setJustAdded(null);
          }}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 font-cairo hover:text-sq-danger-600 hover:bg-sq-danger-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-danger-500 transition-colors"
        >
          <X className="w-3 h-3" aria-hidden="true" />
          {t('filter.clear')}
        </button>
      )}

      <span className="flex-1" />

      {/* Saved views */}
      <div ref={viewsRef} className="relative">
        <button
          type="button"
          onClick={() => setViewsOpen((v) => !v)}
          aria-expanded={viewsOpen}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 font-cairo hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
        >
          <Bookmark className="w-3 h-3" aria-hidden="true" />
          {t('view.saved')}
          <ChevronDown className="w-3 h-3 opacity-60" aria-hidden="true" />
        </button>

        {viewsOpen && (
          <div className={`${MENU_BASE} ${isAr ? 'left-0' : 'right-0'} w-64`}>
            <ul className="max-h-56 overflow-y-auto py-1">
              {views.length === 0 && (
                <li className="px-3 py-3 text-[11px] font-bold text-slate-400 font-cairo text-center">
                  {t('filter.noResults')}
                </li>
              )}
              {views.map((v) => (
                <li key={v.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      onApplyView(v);
                      setViewsOpen(false);
                    }}
                    className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 text-start hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 transition-colors"
                  >
                    <Star className="w-3 h-3 text-sq-accent-500 shrink-0" aria-hidden="true" />
                    <span className="text-[11px] font-bold text-slate-700 font-cairo truncate">{v.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteView(v.id)}
                    aria-label={t('view.delete')}
                    className="px-2 py-2 text-slate-300 hover:text-sq-danger-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-danger-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-slate-100 p-2 flex gap-1.5">
              <input
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder={t('view.namePh')}
                dir={isAr ? 'rtl' : 'ltr'}
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 placeholder:text-slate-400 font-cairo focus:outline-none focus:border-sq-accent-500"
              />
              <button
                type="button"
                disabled={!viewName.trim()}
                onClick={() => {
                  onSaveView(viewName.trim());
                  setViewName('');
                  setViewsOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-sq-accent-500 text-white text-[11px] font-bold font-cairo hover:bg-sq-accent-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
              >
                {t('view.save')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sort */}
      <div ref={sortRef} className="relative">
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          aria-expanded={sortOpen}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 font-cairo hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
        >
          {sortDir === 'asc' ? (
            <ArrowUpAZ className="w-3 h-3" aria-hidden="true" />
          ) : (
            <ArrowDownAZ className="w-3 h-3" aria-hidden="true" />
          )}
          {t('sort.label')}: {t(`sort.${sortKey}`)}
          <ChevronDown className="w-3 h-3 opacity-60" aria-hidden="true" />
        </button>

        {sortOpen && (
          <div className={`${MENU_BASE} ${isAr ? 'left-0' : 'right-0'} w-52`}>
            <ul className="py-1">
              {SORT_KEYS.map((k) => (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => {
                      // Re-picking the active key flips direction — the same
                      // affordance as clicking a column header twice.
                      onSortChange(k, k === sortKey ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc');
                      setSortOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-start hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 transition-colors"
                  >
                    <span
                      className={
                        k === sortKey
                          ? 'flex-1 text-[11px] font-bold text-sq-accent-700 font-cairo'
                          : 'flex-1 text-[11px] font-bold text-slate-600 font-cairo'
                      }
                    >
                      {t(`sort.${k}`)}
                    </span>
                    {k === sortKey && (
                      <span className="text-[10px] font-bold text-slate-400 font-cairo">
                        {sortDir === 'asc' ? t('sort.asc') : t('sort.desc')}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

/** Shared label helper so the count chip and the table agree on wording. */
export function resultSummary(n: number, t: (k: string) => string): string {
  return fill('{n}', { n }) + ' ' + t('page.count');
}

export default FilterBar;
