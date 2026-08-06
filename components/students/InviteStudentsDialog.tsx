/**
 * Invite students — Send Email / Copy Link, rebuilt from the old system's
 * dialog with the piece it was missing: a quick message.
 *
 * The message carries a sensible default so an invite is never a bare link,
 * and it persists across tab switches — writing a welcome then losing it by
 * flipping to "Copy Link" would be a small betrayal.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, Link2, Mail, Send, Users, X } from 'lucide-react';
import { fill, type Locale } from './studentsI18n';

type Tab = 'email' | 'link';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface InviteStudentsDialogProps {
  open: boolean;
  locale: Locale;
  t: (key: string) => string;
  onSend: (emails: string[], message: string) => void;
  onCopyLink: (link: string, message: string) => void;
  onClose: () => void;
}

export const InviteStudentsDialog: React.FC<InviteStudentsDialogProps> = ({
  open,
  locale,
  t,
  onSend,
  onCopyLink,
  onClose,
}) => {
  const reduce = useReducedMotion();
  const isAr = locale === 'ar';
  const [tab, setTab] = useState<Tab>('email');
  const [draft, setDraft] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const joinLink = useMemo(
    () => `${window.location.origin}/join?school=al-khadr`,
    [],
  );

  useEffect(() => {
    if (!open) return;
    setTab('email');
    setDraft('');
    setEmails([]);
    setError('');
    setCopied(false);
    setMessage(t('invite.messageDefault'));
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
  }, [open, onClose, t]);

  /** Accepts one address or a pasted list — commas, semicolons, newlines. */
  const addEmails = (raw: string) => {
    const candidates = raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (candidates.length === 0) return;

    const accepted: string[] = [];
    let firstError = '';

    for (const c of candidates) {
      if (!EMAIL_RE.test(c)) {
        if (!firstError) firstError = t('invite.invalidEmail');
        continue;
      }
      if (emails.includes(c) || accepted.includes(c)) {
        if (!firstError) firstError = t('invite.duplicateEmail');
        continue;
      }
      accepted.push(c);
    }

    if (accepted.length > 0) setEmails((prev) => [...prev, ...accepted]);
    setError(accepted.length > 0 ? '' : firstError);
    if (accepted.length > 0) setDraft('');
  };

  const handleCopy = () => {
    onCopyLink(joinLink, message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const TabButton: React.FC<{ id: Tab; icon: React.ElementType; label: string }> = ({
    id,
    icon: Icon,
    label,
  }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      aria-selected={tab === id}
      role="tab"
      className={
        tab === id
          ? 'inline-flex items-center gap-2 px-1 pb-2.5 border-b-2 border-sq-accent-500 text-xs font-bold text-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 rounded-t'
          : 'inline-flex items-center gap-2 px-1 pb-2.5 border-b-2 border-transparent text-xs font-bold text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 rounded-t'
      }
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {label}
    </button>
  );

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
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <motion.div
            initial={reduce ? false : { scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('invite.title')}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden font-cairo"
          >
            <header className="flex items-center gap-3 px-6 pt-5 pb-0">
              <Users className="w-5 h-5 text-sq-accent-600 shrink-0" aria-hidden="true" />
              <h2 className="flex-1 text-base font-bold text-sq-ink">{t('invite.title')}</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t('panel.close')}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div role="tablist" className="flex items-center gap-6 px-6 pt-4 border-b border-slate-200">
              <TabButton id="email" icon={Mail} label={t('invite.email')} />
              <TabButton id="link" icon={Link2} label={t('invite.link')} />
            </div>

            <div className="px-6 py-5 space-y-4">
              {tab === 'email' ? (
                <>
                  <div className="flex items-stretch gap-2">
                    <input
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        if (error) setError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addEmails(draft);
                        }
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData('text');
                        if (/[,;\s]/.test(text)) {
                          e.preventDefault();
                          addEmails(text);
                        }
                      }}
                      type="email"
                      dir="ltr"
                      placeholder={t('invite.emailPh')}
                      aria-invalid={!!error}
                      className={
                        error
                          ? 'flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-rose-50 border border-sq-danger-500 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sq-danger-500/20'
                          : 'flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sq-accent-500 focus:ring-2 focus:ring-sq-accent-500/20 transition-colors'
                      }
                    />
                    <button
                      type="button"
                      onClick={() => addEmails(draft)}
                      disabled={!draft.trim()}
                      className="px-5 rounded-xl border border-sq-accent-500 text-xs font-bold text-sq-accent-600 hover:bg-sq-accent-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
                    >
                      {t('invite.add')}
                    </button>
                  </div>

                  {error && (
                    <p className="text-[11px] font-bold text-sq-danger-600" role="alert">
                      {error}
                    </p>
                  )}

                  {emails.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {emails.map((e) => (
                        <li
                          key={e}
                          className="inline-flex items-center gap-1.5 ps-2.5 pe-1.5 py-1 rounded-full bg-sq-accent-50 border border-sq-accent-200"
                        >
                          <span dir="ltr" className="text-[11px] font-bold text-sq-accent-700">
                            {e}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEmails((prev) => prev.filter((x) => x !== e))}
                            aria-label={`${t('bulk.clear')} ${e}`}
                            className="p-0.5 rounded-full text-sq-accent-600 hover:bg-sq-accent-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="text-[11px] font-bold text-slate-400">
                    {fill(t('invite.added'), { n: emails.length })}
                  </p>
                </>
              ) : (
                <div>
                  <label
                    htmlFor="invite-link"
                    className="block mb-1.5 text-xs font-bold text-slate-600"
                  >
                    {t('invite.linkLabel')}
                  </label>
                  <div className="flex items-stretch gap-2">
                    <input
                      id="invite-link"
                      readOnly
                      value={joinLink}
                      dir="ltr"
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-700 focus:outline-none focus:border-sq-accent-500"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 px-4 rounded-xl border border-sq-accent-500 text-xs font-bold text-sq-accent-600 hover:bg-sq-accent-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-sq-success-600" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {t('invite.copyLink')}
                    </button>
                  </div>
                </div>
              )}

              {/* Shared across both tabs on purpose — switching tabs must not
                  discard a message the user already wrote. */}
              <div>
                <label
                  htmlFor="invite-message"
                  className="block mb-1.5 text-xs font-bold text-slate-600"
                >
                  {t('invite.message')}
                </label>
                <textarea
                  id="invite-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder={t('invite.messagePh')}
                  dir={isAr ? 'rtl' : 'ltr'}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 placeholder:text-slate-400 resize-y min-h-[76px] focus:outline-none focus:bg-white focus:border-sq-accent-500 focus:ring-2 focus:ring-sq-accent-500/20 transition-colors"
                />
              </div>
            </div>

            <footer className="flex items-center gap-2 px-6 py-4 border-t border-slate-100">
              <span className="flex-1" />
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
              >
                {t('panel.cancel')}
              </button>
              {tab === 'email' ? (
                <button
                  type="button"
                  disabled={emails.length === 0}
                  onClick={() => onSend(emails, message)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sq-accent-500 text-xs font-bold text-white shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('invite.send')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sq-accent-500 text-xs font-bold text-white shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('invite.copyLink')}
                </button>
              )}
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InviteStudentsDialog;
