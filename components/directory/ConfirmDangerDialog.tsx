/**
 * Destructive-action confirmation, in two strengths.
 *
 * `typed`    — you must type a word (DELETE) before the button enables.
 *              Used for deleting one record.
 * `password` — you must enter the account password. Used for bulk deletes,
 *              where one click could remove hundreds of records.
 *
 * The friction is proportional to the blast radius: a slip that costs one
 * record gets a word, a slip that costs two hundred gets a credential.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Eye, EyeOff, X } from 'lucide-react';
import type { Locale, Translate } from './directoryI18n';

export type DangerMode = 'typed' | 'password';

interface ConfirmDangerDialogProps {
  open: boolean;
  mode: DangerMode;
  title: string;
  body: string;
  /** Extra warning shown in an amber panel, e.g. skipped demo records. */
  note?: string;
  /** The word the user must type. Only used when mode === 'typed'. */
  confirmWord: string;
  confirmLabel: string;
  locale: Locale;
  t: Translate;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDangerDialog: React.FC<ConfirmDangerDialogProps> = ({
  open,
  mode,
  title,
  body,
  note,
  confirmWord,
  confirmLabel,
  locale,
  t,
  onConfirm,
  onClose,
}) => {
  const reduce = useReducedMotion();
  const isAr = locale === 'ar';
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue('');
    setVisible(false);
    setError('');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  // Typed mode compares case-insensitively — shouting DELETE and typing
  // delete are the same intent.
  const canConfirm =
    mode === 'typed'
      ? value.trim().toLowerCase() === confirmWord.toLowerCase()
      : value.length > 0;

  const submit = () => {
    if (!canConfirm) {
      setError(mode === 'typed' ? t('danger.typeToConfirm') : t('danger.passwordRequired'));
      return;
    }
    // TODO: wire to real auth. There is no authentication in this app yet, so
    // any non-empty password is accepted — this gate is deliberate friction,
    // not a security control.
    onConfirm();
  };

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
            initial={reduce ? false : { scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 10 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden font-cairo"
          >
            <header className="relative flex flex-col items-center gap-2 px-6 pt-7 pb-5 bg-sq-danger-50">
              <button
                type="button"
                onClick={onClose}
                aria-label={t('panel.close')}
                className="absolute top-3 end-3 p-1.5 rounded-lg text-slate-400 hover:bg-white/70 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-danger-500"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="w-12 h-12 rounded-2xl bg-sq-danger-500 flex items-center justify-center shadow-sm">
                <AlertTriangle className="w-5 h-5 text-white" aria-hidden="true" />
              </span>
              <h2 className="text-sm font-bold text-sq-ink text-center">{title}</h2>
            </header>

            <div className="px-6 py-5 space-y-4">
              <p className="text-xs font-bold text-slate-600 leading-relaxed text-center">{body}</p>

              {note && (
                <p className="rounded-xl border border-sq-warning-500/30 bg-sq-warning-50 px-3 py-2 text-[11px] font-bold text-amber-700 leading-relaxed">
                  {note}
                </p>
              )}

              <div>
                <label
                  htmlFor="danger-confirm"
                  className="block mb-1.5 text-xs font-bold text-slate-600"
                >
                  {mode === 'typed'
                    ? t('danger.typeLabel').replace('{word}', confirmWord)
                    : t('danger.passwordLabel')}
                </label>
                <div className="relative">
                  <input
                    id="danger-confirm"
                    ref={inputRef}
                    type={mode === 'password' && !visible ? 'password' : 'text'}
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      if (error) setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    dir="ltr"
                    autoComplete={mode === 'password' ? 'current-password' : 'off'}
                    placeholder={mode === 'typed' ? confirmWord : '••••••••'}
                    aria-invalid={!!error}
                    className={
                      error
                        ? 'w-full px-4 py-3 rounded-xl bg-rose-50 border border-sq-danger-500 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sq-danger-500/20'
                        : 'w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sq-danger-500 focus:ring-2 focus:ring-sq-danger-500/20 transition-colors'
                    }
                  />
                  {mode === 'password' && (
                    <button
                      type="button"
                      onClick={() => setVisible((v) => !v)}
                      aria-label={visible ? t('f.password.hide') : t('f.password.show')}
                      className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-danger-500"
                    >
                      {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {error && (
                  <p className="mt-1.5 text-[11px] font-bold text-sq-danger-600" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </div>

            <footer className="flex gap-2 px-6 py-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
              >
                {t('panel.cancel')}
              </button>
              <button
                type="button"
                disabled={!canConfirm}
                onClick={submit}
                className="flex-1 rounded-xl bg-sq-danger-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-sq-danger-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-danger-500 transition-colors"
              >
                {confirmLabel}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDangerDialog;
