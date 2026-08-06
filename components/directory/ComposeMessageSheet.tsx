/**
 * Quick message — recipients resolved from context, never asked for.
 *
 * Opened from a row, you are already looking at a person, so the chips arrive
 * pre-selected: [Student] [Parent · Omar's father] [Both]. Changing them is
 * one tap. The old "who is this for?" dialog made you answer a question the
 * app could already answer.
 *
 * Chips with no contact detail on file are shown disabled with the reason,
 * rather than hidden — "why can't I message the mother?" is worth answering.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, MessageSquare, Send, X } from 'lucide-react';
import { fill, type Locale, type Translate } from './directoryI18n';

export interface Recipient {
  id: string;
  /** Display name. */
  name: string;
  /** i18n key for the role chip: 'msg.role.student' | 'msg.role.parent' | … */
  roleKey: string;
  /** Phone or email — absent means we can't reach them. */
  contact?: string;
  /** Why this recipient is unreachable, when `contact` is missing. */
  unavailableKey?: string;
}

interface ComposeMessageSheetProps {
  open: boolean;
  /** Who the message is about — shown in the header. */
  subjectName: string;
  recipients: Recipient[];
  locale: Locale;
  t: Translate;
  onSend: (recipientIds: string[], body: string) => void;
  onClose: () => void;
}

export const ComposeMessageSheet: React.FC<ComposeMessageSheetProps> = ({
  open,
  subjectName,
  recipients,
  locale,
  t,
  onSend,
  onClose,
}) => {
  const reduce = useReducedMotion();
  const isAr = locale === 'ar';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [body, setBody] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const reachable = useMemo(() => recipients.filter((r) => r.contact), [recipients]);

  useEffect(() => {
    if (!open) return;
    // Pre-select every reachable recipient — the common case is "tell the
    // people connected to this student", not "pick one".
    setSelected(new Set(reachable.map((r) => r.id)));
    setBody('');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 80);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [open, onClose, reachable]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSend = selected.size > 0 && body.trim().length > 0;

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
            aria-label={t('msg.title')}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden font-cairo"
          >
            <header className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <span className="w-9 h-9 rounded-xl bg-sq-accent-50 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-sq-accent-600" aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-sq-ink truncate">{t('msg.title')}</h2>
                <p className="text-[11px] font-bold text-slate-400 truncate">
                  {fill(t('msg.about'), { name: subjectName })}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('panel.close')}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="px-5 py-5 space-y-4">
              <div>
                <span className="block mb-2 text-xs font-bold text-slate-600">{t('msg.to')}</span>
                <div className="flex flex-wrap gap-2">
                  {recipients.map((r) => {
                    const on = selected.has(r.id);
                    const disabled = !r.contact;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggle(r.id)}
                        aria-pressed={on}
                        title={disabled && r.unavailableKey ? t(r.unavailableKey) : r.contact}
                        className={
                          disabled
                            ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-300 cursor-not-allowed'
                            : on
                              ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sq-accent-500 bg-sq-accent-500 text-[11px] font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors'
                              : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors'
                        }
                      >
                        {on && !disabled && (
                          <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
                        )}
                        <span className="truncate max-w-[12rem]">
                          {t(r.roleKey)}
                          {r.name ? ` · ${r.name}` : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {reachable.length === 0 && (
                  <p className="mt-2 text-[11px] font-bold text-amber-700">{t('msg.noRecipients')}</p>
                )}
              </div>

              <div>
                <label htmlFor="msg-body" className="block mb-1.5 text-xs font-bold text-slate-600">
                  {t('msg.body')}
                </label>
                <textarea
                  id="msg-body"
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder={t('msg.bodyPh')}
                  dir={isAr ? 'rtl' : 'ltr'}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 placeholder:text-slate-400 resize-y min-h-[96px] focus:outline-none focus:bg-white focus:border-sq-accent-500 focus:ring-2 focus:ring-sq-accent-500/20 transition-colors"
                />
              </div>
            </div>

            <footer className="flex items-center gap-2 px-5 py-4 border-t border-slate-100">
              <span className="flex-1 text-[11px] font-bold text-slate-400">
                {fill(t('msg.count'), { n: selected.size })}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
              >
                {t('panel.cancel')}
              </button>
              <button
                type="button"
                disabled={!canSend}
                onClick={() => onSend([...selected], body.trim())}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sq-accent-500 text-xs font-bold text-white shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                {t('msg.send')}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ComposeMessageSheet;
