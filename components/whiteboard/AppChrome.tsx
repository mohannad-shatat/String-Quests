import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, Circle, Square } from 'lucide-react';
import { useBoardCopy } from './copy';

/** The three-mark logo, rebuilt rather than lifted: ring, orbit, spark. */
const BrandMark: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
    <circle cx="27.5" cy="27.5" r="14.9" stroke="#fbc442" strokeWidth="1.6" />
    <ellipse
      cx="27.5"
      cy="27.5"
      rx="15.6"
      ry="10.4"
      transform="rotate(-42 27.5 27.5)"
      stroke="#ed3b91"
      strokeWidth="1.6"
    />
    <path
      d="M27.5 8.4c1.6 8.3 3.3 15.4 11.6 17s-8.3 3.3-11.6 11.6c-1.6-8.3-3.3-15.4-11.6-17s8.3-3.3 11.6-11.6Z"
      stroke="#08b8fb"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

interface AppChromeProps {
  /** Organisation shown in the top bar. */
  org?: string;
  /** Show the record control — only once the user is inside a space. */
  canRecord?: boolean;
  /** Drop the top bar to give the screen over to the content. */
  hideHeader?: boolean;
  children: React.ReactNode;
}

const mmss = (total: number) => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Session recorder. Presentational for now — it tracks elapsed time and nothing
 * else; no audio, video, or board strokes are captured.
 */
const RecordButton: React.FC = () => {
  const { t } = useBoardCopy();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (recording) {
      timer.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [recording]);

  return (
    <button
      type="button"
      aria-pressed={recording}
      aria-label={recording ? t('rec.stop') : t('rec.start')}
      onClick={() => {
        if (recording) setElapsed(0);
        setRecording((r) => !r);
      }}
      className={`flex min-h-[64px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#ed3b91]/25 ${
        recording ? 'bg-[#fee2e2]' : 'hover:bg-slate-100'
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
          recording ? 'border-[#dc2626]' : 'border-[#dc2626]/40'
        }`}
      >
        {recording ? (
          <Square className="h-3.5 w-3.5 fill-[#dc2626] text-[#dc2626]" />
        ) : (
          <Circle className="h-4 w-4 fill-[#dc2626] text-[#dc2626]" />
        )}
      </span>

      {recording ? (
        <span className="flex items-center gap-1 text-[10px] font-extrabold tabular-nums text-[#dc2626]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#dc2626]" />
          {mmss(elapsed)}
        </span>
      ) : (
        <span className="text-[10px] font-semibold leading-tight text-[#29343d]">
          {t('rec.start')}
        </span>
      )}
    </button>
  );
};

/**
 * Shared chrome: top bar plus the rail. The rail carries Spaces and nothing
 * else — this module has no other destinations — so it stays visible at every
 * breakpoint rather than collapsing into a drawer with one item in it.
 */
export const AppChrome: React.FC<AppChromeProps> = ({
  org = 'Al-Khadr Modern Schools',
  canRecord = false,
  hideHeader = false,
  children,
}) => {
  const { t, toggleLocale } = useBoardCopy();

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#f5f9fe] text-[#29343d]">
      {!hideHeader && (
        <header className="z-30 shrink-0 border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-[72px] items-center justify-between px-3 sm:px-6 md:px-8">
            <div className="flex items-center gap-3">
              <BrandMark />
              <p className="max-w-[160px] truncate text-sm font-bold sm:max-w-[260px]">{org}</p>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                aria-label={t('top.notifications')}
                className="relative rounded-xl p-2.5 transition-colors hover:bg-slate-50"
              >
                <Bell className="h-5 w-5" strokeWidth={1.6} />
                <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-[#ed3b91] ring-2 ring-white" />
              </button>

              <button
                type="button"
                onClick={toggleLocale}
                className="rounded-lg px-2 py-1.5 text-sm font-bold transition-colors hover:bg-slate-100"
              >
                {t('lang')}
              </button>

              <button
                type="button"
                className="flex items-center gap-1 rounded-lg p-1 transition-colors hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#091e42] text-xs font-bold text-white">
                  AK
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#526b7a]" />
              </button>
            </div>
          </div>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        <nav
          aria-label={t('spaces.title')}
          className="flex w-[76px] shrink-0 flex-col items-center border-e border-slate-200 bg-white px-2 py-4 sm:w-[96px]"
        >
          {canRecord && <RecordButton />}
        </nav>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
