/**
 * Floating toolbar shown while students are selected in Edit mode.
 *
 * "Select all N matching" deliberately means *matching the current filters*,
 * not all 2,300 students — so the bulk action and the visible roster can never
 * disagree about what's being acted on.
 */

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Archive, Download, FolderInput, IdCard, Trash2, X } from 'lucide-react';
import { fill, type Locale } from './directoryI18n';

interface BulkActionBarProps {
  selectedCount: number;
  /** Number of students the current filters yield — the "select all" target. */
  matchingCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onMove: () => void;
  onDelete: () => void;
  onExport: () => void;
  /** Omit to hide the button entirely rather than show a dead one. */
  onPrintCards?: () => void;
  /**
   * When set, Move is disabled and this explains why — a selection spanning
   * types has nowhere coherent to move to.
   */
  moveDisabledReason?: string;
  locale: Locale;
  t: (key: string) => string;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  matchingCount,
  onSelectAll,
  onClear,
  onMove,
  onDelete,
  onExport,
  onPrintCards,
  moveDisabledReason,
  locale,
  t,
}) => {
  const reduce = useReducedMotion();
  const allSelected = selectedCount >= matchingCount;

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={reduce ? { duration: 0 } : { duration: 0.18 }}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          role="toolbar"
          aria-label={t('edit.mode')}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] max-w-[calc(100vw-2rem)]"
        >
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-sq-ink text-white shadow-xl px-3 py-2.5 font-cairo">
            <span className="px-1.5 text-xs font-bold tabular-nums whitespace-nowrap">
              {selectedCount} {t('bulk.selected')}
            </span>

            {!allSelected && matchingCount > selectedCount && (
              <button
                type="button"
                onClick={onSelectAll}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-colors whitespace-nowrap"
              >
                {fill(t('bulk.selectAll'), { n: matchingCount })}
              </button>
            )}

            <span className="w-px h-5 bg-white/20 mx-0.5" aria-hidden="true" />

            <button
              type="button"
              onClick={onMove}
              disabled={!!moveDisabledReason}
              title={moveDisabledReason}
              className={
                moveDisabledReason
                  ? 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white/40 cursor-not-allowed whitespace-nowrap'
                  : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-colors whitespace-nowrap'
              }
            >
              <FolderInput className="w-3.5 h-3.5" aria-hidden="true" />
              {t('bulk.move')}
            </button>

            {onPrintCards && (
              <button
                type="button"
                onClick={onPrintCards}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-colors whitespace-nowrap"
              >
                <IdCard className="w-3.5 h-3.5" aria-hidden="true" />
                {t('bulk.cards')}
              </button>
            )}

            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {t('bulk.export')}
            </button>

            {/* Discoverable before it exists, per the brief. */}
            <button
              type="button"
              disabled
              title={t('bulk.soon')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white/40 cursor-not-allowed whitespace-nowrap"
            >
              <Archive className="w-3.5 h-3.5" aria-hidden="true" />
              {t('bulk.archive')}
              <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] font-bold">
                {t('bulk.soon')}
              </span>
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              {t('bulk.delete')}
            </button>

            <span className="w-px h-5 bg-white/20 mx-0.5" aria-hidden="true" />

            <button
              type="button"
              onClick={onClear}
              aria-label={t('bulk.clear')}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BulkActionBar;
