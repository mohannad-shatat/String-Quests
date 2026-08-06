/**
 * One active filter, rendered as an editable pill.
 *
 * Clicking reopens the value list with live counts; `×` drops the filter.
 * Counts come from `facetCounts`, computed against the *other* active filters,
 * so a value showing 0 is genuinely unreachable rather than merely hidden by
 * this pill's own selection.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { FilterOption } from './studentFilters';

interface FilterPillProps {
  label: string;
  values: string[];
  options: FilterOption[];
  counts: Record<string, number>;
  onToggle: (value: string) => void;
  onClear: () => void;
  locale: 'ar' | 'en';
  t: (key: string) => string;
  /** Open the popover immediately — used when a filter is just added. */
  autoOpen?: boolean;
}

export const FilterPill: React.FC<FilterPillProps> = ({
  label,
  values,
  options,
  counts,
  onToggle,
  onClear,
  locale,
  t,
  autoOpen,
}) => {
  const [open, setOpen] = useState(!!autoOpen);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const isAr = locale === 'ar';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 40);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    // Selected values stay visible even at count 0, so you can always undo.
    return [...base].sort((a, b) => {
      const aSel = values.includes(a.value) ? 1 : 0;
      const bSel = values.includes(b.value) ? 1 : 0;
      if (aSel !== bSel) return bSel - aSel;
      return (counts[b.value] ?? 0) - (counts[a.value] ?? 0);
    });
  }, [options, query, values, counts]);

  const summary = useMemo(() => {
    // A just-added filter has no values yet — prompt rather than show a
    // dangling "Grade:" with nothing after it.
    if (values.length === 0) return t('f.select');
    const labels = values
      .map((v) => options.find((o) => o.value === v)?.label ?? v)
      .filter(Boolean);
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }, [values, options]);

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <span className="inline-flex items-stretch rounded-lg border border-sq-accent-200 bg-sq-accent-50 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-sq-accent-700 font-cairo hover:bg-sq-accent-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sq-accent-500 transition-colors max-w-[16rem]"
        >
          <span className="text-slate-500 shrink-0">{label}:</span>
          <span className="truncate">{summary}</span>
          <ChevronDown className="w-3 h-3 shrink-0 opacity-60" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label={`${label} — ${t('filter.clear')}`}
          className="px-1.5 border-s border-sq-accent-200 text-sq-accent-600 hover:bg-sq-accent-100 hover:text-sq-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sq-accent-500 transition-colors"
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      </span>

      {open && (
        <div
          className={
            isAr
              ? 'absolute top-full mt-1.5 right-0 z-50 w-64 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden'
              : 'absolute top-full mt-1.5 left-0 z-50 w-64 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden'
          }
        >
          {options.length > 6 && (
            <div className="relative border-b border-slate-100">
              <Search
                aria-hidden="true"
                className="absolute top-1/2 -translate-y-1/2 start-3 w-3.5 h-3.5 text-slate-400 pointer-events-none"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('filter.searchValues')}
                dir={isAr ? 'rtl' : 'ltr'}
                className="w-full ps-9 pe-3 py-2.5 text-xs font-medium text-slate-700 placeholder:text-slate-400 font-cairo focus:outline-none"
              />
            </div>
          )}

          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-[11px] font-bold text-slate-400 font-cairo text-center">
                {t('filter.noResults')}
              </li>
            )}
            {filtered.map((o) => {
              const selected = values.includes(o.value);
              const count = counts[o.value] ?? 0;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => onToggle(o.value)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-start hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 transition-colors"
                  >
                    <span
                      className={
                        selected
                          ? 'w-4 h-4 rounded border-2 border-sq-accent-500 bg-sq-accent-500 flex items-center justify-center shrink-0'
                          : 'w-4 h-4 rounded border-2 border-slate-300 shrink-0'
                      }
                    >
                      {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} aria-hidden="true" />}
                    </span>
                    <span className="flex-1 min-w-0 text-[11px] font-bold text-slate-700 font-cairo truncate">
                      {o.label}
                    </span>
                    <span
                      className={
                        count === 0
                          ? 'text-[10px] font-bold text-slate-300 font-cairo tabular-nums shrink-0'
                          : 'text-[10px] font-bold text-slate-400 font-cairo tabular-nums shrink-0'
                      }
                    >
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FilterPill;
