/**
 * Fullscreen QR — so a parent can scan from across a desk rather than
 * leaning into the teacher's laptop.
 *
 * Deliberately high-contrast and light-themed regardless of surroundings:
 * phone cameras need a bright, unobstructed code, so this never dims.
 */

import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, MessageCircle } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { MockQrCode, buildInviteUrl, inviteSeed, type InviteRelation } from './ParentQrInvite';
import type { Locale } from './studentsI18n';

interface QrFullscreenProps {
  open: boolean;
  studentName: string;
  studentId: string;
  /** Which parent's code is on screen — father and mother carry different messages. */
  relation: InviteRelation;
  locale: Locale;
  t: (key: string) => string;
  onClose: () => void;
}

export const QrFullscreen: React.FC<QrFullscreenProps> = ({
  open,
  studentName,
  studentId,
  relation,
  locale,
  t,
  onClose,
}) => {
  const reduce = useReducedMotion();
  const isAr = locale === 'ar';

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
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const steps = [t('qr.step1'), t('qr.step2'), t('qr.step3'), t('qr.step4')];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.2 }}
          dir={isAr ? 'rtl' : 'ltr'}
          role="dialog"
          aria-modal="true"
          aria-label={t('qr.title')}
          className="fixed inset-0 z-[150] bg-white flex flex-col font-cairo"
        >
          <header className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-slate-200">
            <button
              type="button"
              onClick={onClose}
              aria-label={t('panel.close')}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-sq-ink truncate">
                {t('qr.title')} — {t(`qr.for.${relation}`)}
              </h2>
              <p className="text-[11px] font-bold text-slate-400 truncate">
                {studentName.trim() || t('panel.new')}
                {studentId ? ` · ${studentId}` : ''}
              </p>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-14 max-w-4xl w-full">
              {/* The code, as large as the viewport allows */}
              <div className="shrink-0">
                <div className="relative rounded-3xl bg-white border-2 border-slate-200 p-4 shadow-lg">
                  <MockQrCode
                    seed={inviteSeed(studentId, studentName, relation)}
                    size={Math.min(400, typeof window !== 'undefined' ? window.innerWidth - 96 : 400)}
                  />
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-[104px] h-[104px] rounded-2xl bg-white flex items-center justify-center shadow-md ring-1 ring-slate-200">
                      <img src="/string-logo.svg" alt="" className="w-20 h-20" />
                    </span>
                  </span>
                </div>
                <p className="mt-3 text-center text-[11px] font-bold text-slate-400">
                  {t('qr.demoNote')}
                </p>
              </div>

              {/* Instructions, sized for reading at arm's length */}
              <div className="flex-1 min-w-0 max-w-md">
                <span
                  className={
                    relation === 'mother'
                      ? 'inline-flex items-center px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold'
                      : 'inline-flex items-center px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold'
                  }
                >
                  {t(`qr.for.${relation}`)}
                </span>
                <h3 className="mt-3 text-lg font-bold text-sq-ink">{t('qr.subtitle')}</h3>
                <ol className="mt-5 space-y-4">
                  {steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 w-6 h-6 rounded-full bg-sq-accent-500 text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-sm font-bold text-slate-600 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>

                <a
                  href={buildInviteUrl(studentName, studentId, locale, relation)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sq-success-500 text-white text-sm font-bold hover:bg-sq-success-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-success-500 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  {t('qr.open')}
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QrFullscreen;
