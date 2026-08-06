/**
 * ⌘K palette — jump to a person, or run an action. Generic over any indexed
 * record, so students, teachers and the people hub all summon the same thing.
 *
 * Deliberately invisible until summoned: keyboard users get everything in one
 * keystroke, and everyone else never has to know it exists. That's what lets
 * these pages carry ten filters and five dialogs while still looking simple.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CornerDownLeft, Search, UserRound, type LucideIcon } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { searchEntries, type HasId, type SearchEntry } from './directorySearch';
import type { Locale, Translate } from './directoryI18n';

export interface PaletteAction {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
}

interface Row {
  key: string;
  group: 'items' | 'actions';
  label: string;
  hint?: string;
  icon?: LucideIcon;
  run: () => void;
}

interface CommandPaletteProps<T extends HasId> {
  open: boolean;
  index: SearchEntry<T>[];
  actions: PaletteAction[];
  getLabel: (item: T) => string;
  getHint: (item: T) => string;
  /** Heading above the record results, e.g. "Students". */
  itemsGroupLabel: string;
  locale: Locale;
  t: Translate;
  onOpenItem: (item: T) => void;
  onClose: () => void;
}

const MAX_ITEMS = 6;

export function CommandPalette<T extends HasId>({
  open,
  index,
  actions,
  getLabel,
  getHint,
  itemsGroupLabel,
  locale,
  t,
  onOpenItem,
  onClose,
}: CommandPaletteProps<T>) {
  const reduce = useReducedMotion();
  const isAr = locale === 'ar';
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const q = query.trim();

    const hits = q ? searchEntries(index, q) : null;
    for (const h of (hits ?? []).slice(0, MAX_ITEMS)) {
      out.push({
        key: `i-${h.item.id}`,
        group: 'items',
        label: getLabel(h.item),
        hint: getHint(h.item),
        icon: UserRound,
        run: () => onOpenItem(h.item),
      });
    }

    const ql = q.toLowerCase();
    for (const a of actions) {
      if (ql && !a.label.toLowerCase().includes(ql)) continue;
      out.push({ key: `a-${a.id}`, group: 'actions', label: a.label, icon: a.icon, run: a.run });
    }

    return out;
  }, [query, index, actions, getLabel, getHint, onOpenItem]);

  // Clamp the cursor whenever the result set shrinks under it.
  useEffect(() => {
    setActive((a) => (a >= rows.length ? Math.max(0, rows.length - 1) : a));
  }, [rows.length]);

  const runActive = useCallback(() => {
    const row = rows[active];
    if (!row) return;
    row.run();
    onClose();
  }, [rows, active, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => (rows.length === 0 ? 0 : (a + 1) % rows.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => (rows.length === 0 ? 0 : (a - 1 + rows.length) % rows.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        runActive();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, rows.length, runActive, onClose]);

  // Keep the highlighted row in view while arrowing through.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let lastGroup: Row['group'] | null = null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.15 }}
          onClick={onClose}
          dir={isAr ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-[160] flex items-start justify-center pt-[12vh] px-4 bg-slate-900/50 backdrop-blur-sm"
        >
          <motion.div
            initial={reduce ? false : { scale: 0.97, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.97, opacity: 0, y: -8 }}
            transition={reduce ? { duration: 0 } : { duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('cmd.placeholder')}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden font-cairo"
          >
            <div className="relative border-b border-slate-100">
              <Search
                aria-hidden="true"
                className="absolute top-1/2 -translate-y-1/2 start-4 w-4 h-4 text-slate-400 pointer-events-none"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder={t('cmd.placeholder')}
                dir={isAr ? 'rtl' : 'ltr'}
                role="combobox"
                aria-expanded
                aria-controls="cmd-list"
                className="w-full ps-11 pe-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <ul ref={listRef} id="cmd-list" role="listbox" className="max-h-80 overflow-y-auto py-1.5">
              {rows.length === 0 && (
                <li className="px-4 py-8 text-center text-xs font-bold text-slate-400">
                  {t('cmd.empty')}
                </li>
              )}
              {rows.map((row, i) => {
                const showHeader = row.group !== lastGroup;
                lastGroup = row.group;
                const Icon = row.icon;
                return (
                  <React.Fragment key={row.key}>
                    {showHeader && (
                      <li
                        aria-hidden="true"
                        className="px-4 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide"
                      >
                        {row.group === 'items' ? itemsGroupLabel : t('cmd.actions')}
                      </li>
                    )}
                    <li role="option" aria-selected={i === active} data-idx={i}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => {
                          row.run();
                          onClose();
                        }}
                        className={
                          i === active
                            ? 'w-full flex items-center gap-3 px-4 py-2.5 text-start bg-sq-accent-50 focus:outline-none'
                            : 'w-full flex items-center gap-3 px-4 py-2.5 text-start hover:bg-slate-50 focus:outline-none'
                        }
                      >
                        {Icon && (
                          <Icon
                            className={
                              i === active
                                ? 'w-4 h-4 text-sq-accent-600 shrink-0'
                                : 'w-4 h-4 text-slate-400 shrink-0'
                            }
                            aria-hidden="true"
                          />
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-bold text-sq-ink truncate">
                            {row.label}
                          </span>
                          {row.hint && (
                            <span className="block text-[10px] font-bold text-slate-400 truncate">
                              {row.hint}
                            </span>
                          )}
                        </span>
                        {i === active && (
                          <CornerDownLeft className="w-3.5 h-3.5 text-slate-300 shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  </React.Fragment>
                );
              })}
            </ul>

            <p className="px-4 py-2 border-t border-slate-100 text-[10px] font-bold text-slate-400">
              {t('cmd.hint')}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CommandPalette;
