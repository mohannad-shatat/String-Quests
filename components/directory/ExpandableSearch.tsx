/**
 * Search field that expands into a panel of quick filters.
 *
 * Focusing the input drops a panel beneath it: one-tap chips for the common
 * cuts, a link to the full filter set, and — importantly — the live result
 * status. You learn the search found nothing (and what you probably meant)
 * without moving your eyes to the table.
 *
 * Quick filters write into the same filter state as the pills above the
 * table. One source of truth, two ways in.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { fill, type Locale, type Translate } from './directoryI18n';

export interface QuickFilterGroup {
  /** Filter field id this group writes to. */
  field: string;
  label: string;
  /** Capped by the caller — this is a shortcut, not the full list. */
  options: { value: string; label: string; count: number }[];
}

export interface SuggestionItem {
  id: string;
  label: string;
}

interface ExpandableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Open state is owned by the caller so ⌘K and Esc can drive it too. */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  quickFilters: QuickFilterGroup[];
  /** Currently selected values per field, for chip state. */
  activeValues: Record<string, string[]>;
  onToggleQuick: (field: string, value: string) => void;
  onOpenAdvanced: () => void;
  onOpenPalette: () => void;
  /** Rows matching the current query + filters. */
  resultCount: number;
  suggestions: SuggestionItem[];
  onPickSuggestion: (id: string) => void;
  locale: Locale;
  t: Translate;
}

export const ExpandableSearch: React.FC<ExpandableSearchProps> = ({
  value,
  onChange,
  placeholder,
  expanded,
  onExpandedChange,
  quickFilters,
  activeValues,
  onToggleQuick,
  onOpenAdvanced,
  onOpenPalette,
  resultCount,
  suggestions,
  onPickSuggestion,
  locale,
  t,
}) => {
  const reduce = useReducedMotion();
  const isAr = locale === 'ar';
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const close = useCallback(() => onExpandedChange(false), [onExpandedChange]);

  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        inputRef.current?.blur();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [expanded, close]);

  // `/` focuses search from anywhere, as long as you aren't already typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement | null)?.isContentEditable;
      if (typing) return;
      e.preventDefault();
      inputRef.current?.focus();
      onExpandedChange(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExpandedChange]);

  const hasQuery = value.trim().length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <Search
        aria-hidden="true"
        className="absolute top-1/2 -translate-y-1/2 start-4 w-4 h-4 text-slate-400 pointer-events-none z-10"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => onExpandedChange(true)}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-expanded={expanded}
        dir={isAr ? 'rtl' : 'ltr'}
        className={
          expanded
            ? 'relative w-full ps-11 pe-24 py-3 rounded-xl bg-white border border-sq-accent-500 ring-2 ring-sq-accent-500/20 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors'
            : 'relative w-full ps-11 pe-24 py-3 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors'
        }
      />

      <button
        type="button"
        onClick={onOpenPalette}
        className="absolute top-1/2 -translate-y-1/2 end-3 z-10 px-2 py-1 rounded-md border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 font-mono hover:text-slate-600 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
      >
        ⌘K
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={reduce ? { duration: 0 } : { duration: 0.15 }}
            className="absolute top-full inset-x-0 mt-2 z-40 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden"
          >
            {/* Status first — the answer to "did that work?" */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
              <span
                className={
                  resultCount === 0 && hasQuery
                    ? 'text-[11px] font-bold text-sq-danger-600 font-cairo'
                    : 'text-[11px] font-bold text-slate-500 font-cairo'
                }
              >
                {resultCount === 0 && hasQuery
                  ? fill(t('search.none'), { q: value.trim() })
                  : fill(t('search.count'), { n: resultCount })}
              </span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={close}
                aria-label={t('panel.close')}
                className="p-1 rounded text-slate-300 hover:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {suggestions.length > 0 && (
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                    {t('empty.didYouMean')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          onPickSuggestion(s.id);
                          close();
                        }}
                        className="px-2.5 py-1 rounded-full border border-sq-accent-200 bg-sq-accent-50 text-[11px] font-bold text-sq-accent-700 font-cairo hover:bg-sq-accent-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {quickFilters.map((group) => (
                <div key={group.field} className="px-4 py-3 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.options.map((o) => {
                      const on = (activeValues[group.field] ?? []).includes(o.value);
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => onToggleQuick(group.field, o.value)}
                          aria-pressed={on}
                          className={
                            on
                              ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-sq-accent-500 bg-sq-accent-500 text-[11px] font-bold text-white font-cairo focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors'
                              : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-bold text-slate-600 font-cairo hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors'
                          }
                        >
                          {o.label}
                          <span className={on ? 'text-white/70 tabular-nums' : 'text-slate-400 tabular-nums'}>
                            {o.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                onOpenAdvanced();
                close();
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-start hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <span className="text-[11px] font-bold text-slate-600 font-cairo">
                {t('search.advanced')}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpandableSearch;
