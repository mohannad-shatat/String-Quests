/**
 * ⌘K palette — jump to a student, apply a filter, or run an action.
 *
 * Deliberately invisible until summoned: keyboard users get everything in one
 * keystroke, and everyone else never has to know it exists. That's what lets
 * the page carry ten filters and five dialogs while still looking simple.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CornerDownLeft, Search, UserRound, type LucideIcon } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { searchStudents, type StudentSearchEntry } from './studentSearch';
import type { Locale } from './studentsI18n';
import type { StudentRecord } from './studentTypes';

export interface PaletteAction {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
}

interface Row {
  key: string;
  group: 'students' | 'actions';
  label: string;
  hint?: string;
  icon?: LucideIcon;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  index: StudentSearchEntry[];
  actions: PaletteAction[];
  locale: Locale;
  t: (key: string) => string;
  onOpenStudent: (student: StudentRecord) => void;
  onClose: () => void;
}

const MAX_STUDENTS = 6;

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  index,
  actions,
  locale,
  t,
  onOpenStudent,
  onClose,
}) => {
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

    const hits = q ? searchStudents(index, q) : null;
    const students = (hits ?? []).slice(0, MAX_STUDENTS);
    for (const h of students) {
      out.push({
        key: `s-${h.student.id}`,
        group: 'students',
        label: isAr ? h.student.name : h.student.nameEn || h.student.name,
        hint: [
          h.student.studentId,
          h.student.grade !== null ? `${t('f.grade')} ${h.student.grade}` : '',
          h.student.section,
        ]
          .filter(Boolean)
          .join(' · '),
        icon: UserRound,
        run: () => onOpenStudent(h.student),
      });
    }

    const ql = q.toLowerCase();
    for (const a of actions) {
      if (ql && !a.label.toLowerCase().includes(ql)) continue;
      out.push({ key: `a-${a.id}`, group: 'actions', label: a.label, icon: a.icon, run: a.run });
    }

    return out;
  }, [query, index, actions, isAr, t, onOpenStudent]);

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
                        {row.group === 'students' ? t('cmd.students') : t('cmd.actions')}
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
};

export default CommandPalette;
