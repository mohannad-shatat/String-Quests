/**
 * Reset password — reachable from inside the form and from a roster row, so
 * staff can help a locked-out student without opening the full record.
 *
 * Two states in one dialog: confirm, then reveal. The new password is shown
 * in plain text on purpose — it exists to be read aloud or written down, and
 * the reset has already happened by the time it's on screen.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { KeyRound, Copy, Check, X } from 'lucide-react';
import { generatePassword } from '../../utils/studentStorage';
import type { StudentRecord } from './studentTypes';

interface ResetPasswordDialogProps {
  /** The student to reset, or null when closed. */
  student: StudentRecord | null;
  locale: 'ar' | 'en';
  t: (key: string) => string;
  /** Persist the new password. Returns once saved. */
  onConfirm: (student: StudentRecord, newPassword: string) => void;
  onClose: () => void;
}

export const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({
  student,
  locale,
  t,
  onConfirm,
  onClose,
}) => {
  const reduce = useReducedMotion();
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const isAr = locale === 'ar';

  // Fresh state per student, so a second reset never shows the first result.
  useEffect(() => {
    setNewPassword(null);
    setCopied(false);
  }, [student?.id]);

  useEffect(() => {
    if (!student) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => confirmRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [student, onClose]);

  const handleConfirm = () => {
    if (!student) return;
    const pwd = generatePassword();
    onConfirm(student, pwd);
    setNewPassword(pwd);
  };

  const handleCopy = () => {
    if (!student || !newPassword) return;
    navigator.clipboard?.writeText(`${student.loginEmail}\n${newPassword}`).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => {
        /* clipboard blocked */
      },
    );
  };

  const name = student ? (isAr ? student.name : student.nameEn || student.name) : '';

  return (
    <AnimatePresence>
      {student && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.18 }}
          onClick={onClose}
          dir={isAr ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <motion.div
            initial={reduce ? false : { scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 10 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('reset.title')}
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden font-cairo"
          >
            <header className="relative flex flex-col items-center gap-2 px-6 pt-7 pb-5 bg-sq-accent-50">
              <button
                type="button"
                onClick={onClose}
                aria-label={t('panel.close')}
                className="absolute top-3 end-3 p-1.5 rounded-lg text-slate-400 hover:bg-white/70 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="w-12 h-12 rounded-2xl bg-sq-accent-500 flex items-center justify-center shadow-sm shadow-pink-500/30">
                <KeyRound className="w-5 h-5 text-white" aria-hidden="true" />
              </span>
              <h2 className="text-sm font-bold text-sq-ink">{t('reset.title')}</h2>
              <p className="text-[11px] font-bold text-slate-500 text-center truncate max-w-full">
                {name}
              </p>
            </header>

            <div className="px-6 py-5">
              {newPassword ? (
                <>
                  <p className="text-[11px] font-bold text-sq-success-700 text-center mb-3">
                    {t('reset.done')}
                  </p>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {t('f.loginEmail')}
                      </span>
                      <span dir="ltr" className="block text-xs font-bold text-sq-ink truncate">
                        {student.loginEmail}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {t('reset.new')}
                      </span>
                      <span dir="ltr" className="block font-mono text-sm font-bold text-sq-ink tracking-wide">
                        {newPassword}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-sq-ink hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-sq-success-600" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {t('reset.copy')}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 rounded-xl bg-sq-ink px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-ink transition-colors"
                    >
                      {t('reset.close')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-500 text-center leading-relaxed">
                    {t('reset.body')}
                  </p>
                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
                    >
                      {t('panel.cancel')}
                    </button>
                    <button
                      ref={confirmRef}
                      type="button"
                      onClick={handleConfirm}
                      className="flex-1 rounded-xl bg-sq-accent-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
                    >
                      {t('reset.action')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ResetPasswordDialog;
