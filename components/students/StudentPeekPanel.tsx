/**
 * Notion-style peek panel.
 *
 * Three geometries, one mounted component — the form never unmounts as you
 * expand or collapse, so nothing typed is lost:
 *   peek     — full-height side panel, drag-resizable, roster still visible
 *   expanded — same panel at 100% width (so "expand" is a width tween, not a
 *              remount into a different tree)
 *   sheet    — mobile bottom sheet, drag down to dismiss
 *
 * RTL: the panel docks to the inline-end edge — left in Arabic, right in
 * English — and the enter transform's sign is chosen from the locale.
 * Framer's `x` is a physical transform and is NOT flipped by `dir`; pairing a
 * logical `start-0` with `x: '-100%'` (as MarkAttendancePanel does) slides the
 * panel the wrong way under RTL.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const WIDTH_KEY = 'string-quests-student-panel-width';
const MODE_KEY = 'string-quests-student-panel-mode';

const MIN_WIDTH = 380;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 480;
/** Below this the vertical rail has no room — the form goes compact. */
const COMPACT_BELOW = 560;

const SWIPE_DISTANCE = 90;
const SWIPE_VELOCITY = 500;

export type PanelMode = 'peek' | 'expanded';

export function loadPanelWidth(): number {
  try {
    const raw = localStorage.getItem(WIDTH_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n)) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

export function loadPanelMode(): PanelMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'expanded' ? 'expanded' : 'peek';
  } catch {
    return 'peek';
  }
}

/** True when the viewport is narrow enough to warrant the bottom sheet. */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);
  return isMobile;
}

interface StudentPeekPanelProps {
  open: boolean;
  title: string;
  subtitle?: string;
  locale: 'ar' | 'en';
  mode: PanelMode;
  onModeChange: (mode: PanelMode) => void;
  onClose: () => void;
  labels: { expand: string; collapse: string; close: string; resize: string };
  /** Receives whether the current geometry is too narrow for the vertical rail. */
  children: (compact: boolean) => React.ReactNode;
}

export const StudentPeekPanel: React.FC<StudentPeekPanelProps> = ({
  open,
  title,
  subtitle,
  locale,
  mode,
  onModeChange,
  onClose,
  labels,
  children,
}) => {
  const reduce = useReducedMotion();
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [width, setWidth] = useState<number>(loadPanelWidth);
  const [resizing, setResizing] = useState(false);

  const isAr = locale === 'ar';
  const isSheet = isMobile;
  const isExpanded = !isSheet && mode === 'expanded';

  // Peek leaves the roster scrollable on purpose; only the two full-bleed
  // geometries freeze the page behind.
  useBodyScrollLock(open && (isSheet || isExpanded));
  useFocusTrap(panelRef, open, { initialFocusRef: closeRef });

  /* ESC — the host decides whether a dirty form may close. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const toggleMode = useCallback(() => {
    const next: PanelMode = mode === 'peek' ? 'expanded' : 'peek';
    onModeChange(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* ignore */
    }
  }, [mode, onModeChange]);

  /* ─── Drag-to-resize ─── */

  const startResize = useCallback(
    (e: React.PointerEvent) => {
      if (isSheet || isExpanded) return;
      e.preventDefault();
      setResizing(true);
      const startX = e.clientX;
      const startWidth = width;

      const onMove = (ev: PointerEvent) => {
        // Panel is on the left in RTL, so dragging right grows it; on the
        // right in LTR, dragging left grows it.
        const delta = isAr ? ev.clientX - startX : startX - ev.clientX;
        const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
        setWidth(next);
      };
      const onUp = () => {
        setResizing(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        setWidth((w) => {
          try {
            localStorage.setItem(WIDTH_KEY, String(w));
          } catch {
            /* ignore */
          }
          return w;
        });
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [isSheet, isExpanded, width, isAr],
  );

  const handleSheetDragEnd = useCallback(
    (_e: unknown, info: PanInfo) => {
      if (info.offset.y > SWIPE_DISTANCE || info.velocity.y > SWIPE_VELOCITY) onClose();
    },
    [onClose],
  );

  /* ─── Geometry ─── */

  const effectiveWidth = isExpanded ? '100%' : `${width}px`;
  const compact = isSheet || (!isExpanded && width < COMPACT_BELOW);

  const sheetGeometry =
    'fixed inset-x-0 bottom-0 z-[111] bg-slate-50 rounded-t-3xl shadow-2xl border-t border-slate-200 flex flex-col max-h-[88vh]';
  const sideGeometry = isAr
    ? 'fixed top-0 bottom-0 left-0 z-[111] bg-slate-50 shadow-2xl border-e border-slate-200 flex flex-col'
    : 'fixed top-0 bottom-0 right-0 z-[111] bg-slate-50 shadow-2xl border-s border-slate-200 flex flex-col';

  const enterX = isAr ? '-100%' : '100%';

  const motionProps = isSheet
    ? {
        initial: reduce ? { opacity: 0 } : { y: '100%' },
        animate: reduce ? { opacity: 1 } : { y: 0 },
        exit: reduce ? { opacity: 0 } : { y: '100%' },
        transition: reduce
          ? { duration: 0.15 }
          : ({ type: 'spring', stiffness: 260, damping: 28 } as const),
        drag: 'y' as const,
        dragConstraints: { top: 0, bottom: 0 },
        dragElastic: { top: 0, bottom: 0.3 },
        onDragEnd: handleSheetDragEnd,
      }
    : {
        initial: reduce ? { opacity: 0 } : { x: enterX },
        animate: reduce ? { opacity: 1 } : { x: 0 },
        exit: reduce ? { opacity: 0 } : { x: enterX },
        transition: reduce
          ? { duration: 0.15 }
          : ({ type: 'spring', stiffness: 260, damping: 30 } as const),
      };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim — lighter in peek so the roster stays readable behind it. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
            className={
              isSheet || isExpanded
                ? 'fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm'
                : 'fixed inset-0 z-[110] bg-slate-900/20'
            }
          />

          <motion.div
            ref={panelRef}
            {...motionProps}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
            style={isSheet ? undefined : { width: effectiveWidth }}
            className={
              isSheet
                ? sheetGeometry
                : resizing || reduce
                  ? `${sideGeometry} font-cairo`
                  : `${sideGeometry} font-cairo transition-[width] duration-300 ease-out`
            }
          >
            {/* Grab handle (mobile only) */}
            {isSheet && (
              <div className="shrink-0 flex justify-center pt-2.5 pb-1">
                <span className="h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
              </div>
            )}

            {/* Header */}
            <header className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white">
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={labels.close}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>

              {!isSheet && (
                <button
                  type="button"
                  onClick={toggleMode}
                  aria-label={isExpanded ? labels.collapse : labels.expand}
                  title={isExpanded ? labels.collapse : labels.expand}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              )}

              <div className="flex-1 min-w-0 text-center sm:text-start">
                <h2 className="text-sm font-bold text-sq-ink font-cairo truncate">{title}</h2>
                {subtitle && (
                  <p className="text-[11px] font-bold text-slate-400 font-cairo truncate">{subtitle}</p>
                )}
              </div>
            </header>

            {children(compact)}

            {/* Resize grip, on the panel's inner edge */}
            {!isSheet && !isExpanded && (
              <div
                onPointerDown={startResize}
                role="separator"
                aria-orientation="vertical"
                aria-label={labels.resize}
                className={
                  isAr
                    ? 'absolute top-0 bottom-0 right-0 w-1.5 cursor-col-resize hover:bg-sq-accent-500/30 active:bg-sq-accent-500/50 transition-colors'
                    : 'absolute top-0 bottom-0 left-0 w-1.5 cursor-col-resize hover:bg-sq-accent-500/30 active:bg-sq-accent-500/50 transition-colors'
                }
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default StudentPeekPanel;
