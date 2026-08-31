import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  Clock3,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  CheckCheck,
} from 'lucide-react';
import { AppChrome } from './AppChrome';
import { SpaceHeader } from './SpaceHeader';
import { useBoardCopy, type BoardCopyKey } from './copy';
import { SPACES, type Space } from './spaces';
import {
  ROSTER,
  STATUS_STYLE,
  CYCLE,
  nextStatus,
  initials,
  type AttendanceStatus,
} from './roster';
import { EASE } from './tokens';

interface AttendancePageProps {
  spaceId?: string;
  onBack?: () => void;
  onLessons?: () => void;
}

const LABEL: Record<AttendanceStatus, BoardCopyKey> = {
  present: 'att.present',
  absent: 'att.absent',
  late: 'att.late',
};

const ICON: Record<AttendanceStatus, typeof Check> = {
  present: Check,
  absent: X,
  late: Clock3,
};

/** Every student starts present; a tap cycles through the exceptions. */
const allPresent = (): Record<string, AttendanceStatus> =>
  Object.fromEntries(ROSTER.map((s) => [s.id, 'present'] as [string, AttendanceStatus]));

const ROWS = Math.max(...ROSTER.map((s) => s.row));
const COLS = Math.max(...ROSTER.map((s) => s.col));

export const AttendancePage: React.FC<AttendancePageProps> = ({
  spaceId,
  onBack,
  onLessons,
}) => {
  const { t, locale, dir } = useBoardCopy();
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const space: Space | undefined = SPACES.find((s) => s.id === spaceId);

  const [offset, setOffset] = useState(0);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(allPresent);

  const date = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  }, [offset]);

  const dateLabel = date.toLocaleDateString(locale === 'ar' ? 'ar-JO' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const counts = useMemo(() => {
    const base: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0 };
    for (const student of ROSTER) base[marks[student.id]] += 1;
    return base;
  }, [marks]);

  if (!space) {
    return (
      <AppChrome canRecord>
        <div className="mx-auto flex w-full max-w-3xl flex-col items-start px-4 py-10 sm:px-6">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-[#6882a9] transition-colors hover:text-[#08b8fb]"
          >
            <BackArrow className="h-3.5 w-3.5" />
            {t('space.back')}
          </button>
          <h1 className="mt-6 text-xl font-extrabold text-[#091e42]">{t('space.missing.title')}</h1>
          <p className="mt-1.5 text-sm font-medium text-[#6882a9]">{t('space.missing.body')}</p>
        </div>
      </AppChrome>
    );
  }

  return (
    <AppChrome canRecord>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        <SpaceHeader
          space={space}
          active="attendance"
          onBack={onBack}
          onTab={(tab) => {
            if (tab === 'lessons') onLessons?.();
          }}
        />

        {/* Day picker */}
        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5">
          <button
            type="button"
            aria-label={t('att.prevDay')}
            onClick={() => setOffset((o) => o - 1)}
            className="rounded-lg p-2 text-[#6882a9] transition-colors hover:bg-slate-100 hover:text-[#091e42]"
          >
            <PrevIcon className="h-4 w-4" />
          </button>

          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-extrabold text-[#091e42]">{dateLabel}</p>
            {offset === 0 && (
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#08b8fb]">
                {t('att.today')}
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label={t('att.nextDay')}
            disabled={offset >= 0}
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            className="rounded-lg p-2 text-[#6882a9] transition-colors hover:bg-slate-100 hover:text-[#091e42] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <NextIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Tally + legend */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {CYCLE.map((status) => {
            const style = STATUS_STYLE[status];
            const Icon = ICON[status];
            return (
              <div
                key={status}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2 py-2.5"
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-lg"
                  style={{ backgroundColor: style.soft, color: style.tint }}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="text-lg font-extrabold" style={{ color: style.tint }}>
                  {counts[status]}
                </span>
                <span className="truncate text-[11px] font-bold text-[#6882a9]">
                  {t(LABEL[status])}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[#6882a9]">
            {t('att.tapHint')}
          </h2>
          <button
            type="button"
            onClick={() => setMarks(allPresent())}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#10b981] transition-colors hover:bg-[#e3f8f0]"
          >
            <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t('att.allPresent')}
          </button>
        </div>

        {/* Seating plan */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="mt-2 rounded-2xl border border-slate-200/80 bg-white p-4"
        >
          <div className="mb-4 rounded-lg bg-[#091e42] py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white">
            {t('att.board')}
          </div>

          <div
            className="grid gap-2 sm:gap-3"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: ROWS }, (_, r) =>
              Array.from({ length: COLS }, (_, c) => {
                const student = ROSTER.find((s) => s.row === r + 1 && s.col === c + 1);

                if (!student) {
                  return (
                    <div
                      key={`empty-${r}-${c}`}
                      aria-hidden
                      className="rounded-xl border border-dashed border-slate-200/70"
                    />
                  );
                }

                const status = marks[student.id];
                const style = STATUS_STYLE[status];
                const Icon = ICON[status];

                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() =>
                      setMarks((prev) => ({ ...prev, [student.id]: nextStatus(prev[student.id]) }))
                    }
                    aria-label={`${student.name[locale]} — ${t(LABEL[status])}`}
                    className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-2 text-center transition-all duration-150 outline-none active:scale-[0.97] focus-visible:ring-4 focus-visible:ring-[#08b8fb]/25"
                    style={{ borderColor: style.tint, backgroundColor: style.soft }}
                  >
                    <span
                      className="relative flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                      style={{ backgroundColor: style.tint }}
                    >
                      {initials(student)}
                      <span
                        className="absolute -bottom-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white"
                        style={{ color: style.tint }}
                      >
                        <Icon className="h-2.5 w-2.5" strokeWidth={4} />
                      </span>
                    </span>

                    <span className="line-clamp-2 text-[11px] font-bold leading-tight text-[#091e42]">
                      {student.name[locale]}
                    </span>
                    <span className="text-[10px] font-bold" style={{ color: style.tint }}>
                      {t(LABEL[status])}
                    </span>
                  </button>
                );
              }),
            )}
          </div>
        </motion.div>

        <p className="mt-3 text-center text-[11px] font-medium text-[#6882a9]">
          {t('att.notSaved')}
        </p>
      </div>
    </AppChrome>
  );
};

export default AttendancePage;
