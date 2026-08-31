import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  QrCode,
  ScanLine,
  Loader2,
  Command,
  Users,
} from 'lucide-react';
import { BoardBackdrop } from './BoardBackdrop';
import { useBoardCopy } from './copy';
import { EASE } from './tokens';

type Mode = 'email' | 'qr';

export interface BoardLoginSubmit {
  mode: 'email';
  email?: string;
  password?: string;
}

interface WhiteboardLoginPageProps {
  /** Wire this to the auth call. Without it the form validates and then stops. */
  onSubmit?: (payload: BoardLoginSubmit) => void | Promise<void>;
  onScan?: () => void;
  onBack?: () => void;
}

/** Labelled input shell with a leading icon and an optional trailing link. */
const Field: React.FC<{
  label: string;
  htmlFor: string;
  trailing?: React.ReactNode;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, htmlFor, trailing, icon, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between px-1">
      <label htmlFor={htmlFor} className="text-xs font-bold text-[#6882a9]">
        {label}
      </label>
      {trailing}
    </div>
    <div className="relative rounded-2xl border border-slate-200 bg-white transition-all duration-200 focus-within:border-[#08b8fb] focus-within:ring-4 focus-within:ring-[#08b8fb]/10">
      <span className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[#6882a9]">
        {icon}
      </span>
      {children}
    </div>
  </div>
);

export const WhiteboardLoginPage: React.FC<WhiteboardLoginPageProps> = ({
  onSubmit,
  onScan,
  onBack,
}) => {
  const { t, dir, toggleLocale } = useBoardCopy();
  const isRtl = dir === 'rtl';
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'email') {
      if (!email.trim()) return setError(t('err.email'));
      if (!password) return setError(t('err.password'));
    }
    if (!onSubmit) return setNotice(t('notice.notWired'));

    try {
      setPending(true);
      await onSubmit({ mode: 'email', email: email.trim(), password });
    } finally {
      setPending(false);
    }
  };

  const tabs: { id: Mode; label: string }[] = [
    { id: 'email', label: t('tab.email') },
    { id: 'qr', label: t('tab.qr') },
  ];

  const ctaLabel = mode === 'qr' ? t('cta.scan') : t('cta.login');

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-white text-[#091e42]">
      <BoardBackdrop />

      <header className="relative z-20 flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#091e42] text-white shadow-lg shadow-[#091e42]/15">
            <Command className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-extrabold">{t('brand.name')}</p>
            <p className="hidden text-xs font-medium text-[#6882a9] sm:block">
              {t('brand.tagline')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleLocale}
          className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-bold text-[#091e42] backdrop-blur transition-colors hover:border-[#08b8fb] hover:text-[#08b8fb]"
        >
          {t('lang')}
        </button>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-5.5rem)] w-full max-w-7xl flex-col justify-center gap-14 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10 sm:px-8 lg:flex-row lg:items-center lg:gap-20 lg:px-12">
        {/* Pitch — desktop only. */}
        <section className="hidden flex-1 lg:block">
          <div className="max-w-lg">
              <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="text-4xl font-extrabold leading-[1.15] tracking-tight xl:text-5xl"
            >
              {t('pitch.title')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
              className="mt-5 text-lg font-medium leading-relaxed text-[#6882a9]"
            >
              {t('pitch.body')}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-bold text-[#6882a9] backdrop-blur">
                <Users className="h-4 w-4 text-[#ed3b91]" />
                {t('pitch.badge')}
              </span>
            </motion.div>
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
          className="mx-auto w-full max-w-[440px] rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(9,30,66,0.12)] ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-8 lg:mx-0"
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-5 flex items-center gap-1.5 text-xs font-bold text-[#6882a9] transition-colors hover:text-[#08b8fb]"
            >
              <BackArrow className="h-3.5 w-3.5" />
              {t('back')}
            </button>
          )}

          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('title')}</h2>
          <p className="mt-2 text-sm font-medium text-[#6882a9]">{t('subtitle')}</p>

          <div
            role="tablist"
            aria-label={t('title')}
            className="mt-6 flex gap-1 rounded-2xl bg-slate-100/80 p-1"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={mode === tab.id}
                onClick={() => switchMode(tab.id)}
                className={`relative flex-1 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#08b8fb]/25 ${
                  mode === tab.id ? 'text-[#091e42]' : 'text-[#6882a9] hover:text-[#091e42]'
                }`}
              >
                {mode === tab.id && (
                  <motion.span
                    layoutId="board-login-tab"
                    className="absolute inset-0 rounded-xl bg-white shadow-sm"
                    transition={{ duration: 0.25, ease: EASE }}
                  />
                )}
                <span className="relative">{tab.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="min-h-[228px] space-y-4"
              >
                {mode === 'email' && (
                  <>
                    <Field
                      label={t('label.email')}
                      htmlFor="board-email"
                      icon={<Mail className="h-4 w-4" />}
                    >
                      <input
                        id="board-email"
                        type="text"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('ph.email')}
                        className="w-full bg-transparent py-3.5 pe-4 ps-11 text-sm font-medium outline-none placeholder:text-[#6882a9]/60"
                      />
                    </Field>

                    <Field
                      label={t('label.password')}
                      htmlFor="board-password"
                      icon={<Lock className="h-4 w-4" />}
                      trailing={
                        <a
                          href="/auth/reset-password"
                          className="text-xs font-bold text-[#08b8fb] hover:underline"
                        >
                          {t('forgot')}
                        </a>
                      }
                    >
                      <input
                        id="board-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('ph.password')}
                        className="w-full bg-transparent py-3.5 pe-11 ps-11 text-sm font-medium outline-none placeholder:text-[#6882a9]/60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t('hide') : t('show')}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-[#6882a9] transition-colors hover:text-[#091e42]"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </Field>
                  </>
                )}

                {mode === 'qr' && (
                  <div className="flex flex-col items-center gap-4 pt-2 text-center">
                    <div className="relative h-40 w-40 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                      <QrCode
                        className="absolute inset-0 m-auto h-16 w-16 text-[#6882a9]/40"
                        strokeWidth={1.25}
                      />
                      {['top-3 start-3', 'top-3 end-3', 'bottom-3 start-3', 'bottom-3 end-3'].map(
                        (pos) => (
                          <span
                            key={pos}
                            className={`absolute ${pos} h-5 w-5 rounded-md border-2 border-[#08b8fb]/70`}
                          />
                        ),
                      )}
                      <motion.span
                        className="absolute inset-x-6 h-0.5 rounded-full bg-[#08b8fb]"
                        initial={{ top: '12%', opacity: 0 }}
                        animate={{ top: ['12%', '88%', '12%'], opacity: [0, 1, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{t('qr.title')}</p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-[#6882a9]">
                        {t('qr.hint')}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {(error || notice) && (
              <p
                role="alert"
                className={`mt-4 rounded-xl px-3.5 py-2.5 text-xs font-bold ${
                  error ? 'bg-[#ed3b91]/10 text-[#d6257a]' : 'bg-slate-100 text-[#6882a9]'
                }`}
              >
                {error ?? notice}
              </p>
            )}

            <button
              type={mode === 'qr' ? 'button' : 'submit'}
              onClick={mode === 'qr' ? onScan : undefined}
              disabled={pending}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ed3b91] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#ed3b91]/25 outline-none transition-all hover:bg-[#d6257a] focus-visible:ring-4 focus-visible:ring-[#ed3b91]/30 active:scale-[0.99] disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {ctaLabel}
                  {mode === 'qr' ? (
                    <ScanLine className="h-4 w-4" />
                  ) : (
                    <Arrow className="h-4 w-4" />
                  )}
                </>
              )}
            </button>

          </form>

          <p className="mt-6 text-center text-xs font-medium text-[#6882a9]">
            {t('new')}{' '}
            <a
              href="/auth/choose/register"
              className="font-bold text-[#ed3b91] hover:underline"
            >
              {t('register')}
            </a>
          </p>
        </motion.section>
      </main>
    </div>
  );
};

export default WhiteboardLoginPage;
