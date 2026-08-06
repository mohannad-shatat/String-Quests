/**
 * "Select Member Type" — the picker the Add button opens.
 *
 * Rebuilt from the old system's grid, with one difference that matters: every
 * tile carries a one-line description of what that account actually does. The
 * old one gave you a label and expected you to already know.
 *
 * Picking a type routes straight to the right screen with its create panel
 * already open — one click, not two. Parent is the exception: you can't author
 * one, so its tile says where parents actually come from and lands on the
 * student form.
 */

import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { MEMBER_TYPES, typeDescKey, typeLabelKey, type MemberType } from './memberTypes';
import type { Locale, Translate } from '../directory/directoryI18n';

interface AddMemberDialogProps {
  open: boolean;
  locale: Locale;
  t: Translate;
  onPick: (type: MemberType) => void;
  onClose: () => void;
}

export const AddMemberDialog: React.FC<AddMemberDialogProps> = ({
  open,
  locale,
  t,
  onPick,
  onClose,
}) => {
  const reduce = useReducedMotion();
  const isAr = locale === 'ar';
  const closeRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.18 }}
          onClick={onClose}
          dir={isAr ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <motion.div
            initial={reduce ? false : { scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('add.title')}
            className="w-full max-w-3xl max-h-[88vh] bg-white rounded-3xl shadow-2xl overflow-hidden font-cairo flex flex-col"
          >
            <header className="relative shrink-0 px-6 pt-7 pb-4">
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t('panel.close')}
                className="absolute top-4 end-4 p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <h2 className="text-xl font-bold text-sq-ink text-center">{t('add.title')}</h2>
              <p className="mt-1 text-[11px] font-bold text-slate-400 text-center">
                {t('types.subtitle')}
              </p>
            </header>

            <div className="flex-1 overflow-y-auto px-6 pb-4">
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {MEMBER_TYPES.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onPick(m)}
                      className={`w-full h-full flex flex-col items-center text-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:shadow-sm ${m.ringHover} focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500`}
                    >
                      <span
                        className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${m.iconBg}`}
                      >
                        <m.icon className={`w-5 h-5 ${m.iconColor}`} aria-hidden="true" />
                      </span>

                      <span className="text-sm font-bold text-sq-ink">{t(typeLabelKey(m.id))}</span>

                      {/* The old grid gave you a label and nothing else. */}
                      <span className="text-[10px] font-bold text-slate-400 leading-snug">
                        {t(typeDescKey(m.id))}
                      </span>

                      {/* Not "coming soon" — parents exist, they're just not
                          authored here. Saying where they come from is more
                          useful than saying no. */}
                      {m.derived && (
                        <span className="mt-auto px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">
                          {t('add.viaStudent')}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <footer className="shrink-0 px-6 py-3 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 text-center">
                {t('type.guessNote')}
              </p>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddMemberDialog;
