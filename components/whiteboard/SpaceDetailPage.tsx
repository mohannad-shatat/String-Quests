import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { AppChrome } from './AppChrome';
import { SpaceHeader } from './SpaceHeader';
import { useBoardCopy } from './copy';
import { ACCENTS, SPACES, type Space } from './spaces';
import { unitsForSpace, type Lesson } from './spaceContent';
import { EASE } from './tokens';

interface SpaceDetailPageProps {
  spaceId?: string;
  onBack?: () => void;
  onOpenLesson?: (lesson: Lesson) => void;
  onAttendance?: () => void;
}

const LessonRow: React.FC<{
  lesson: Lesson;
  accent: { base: string; soft: string };
  onOpen?: (lesson: Lesson) => void;
}> = ({ lesson, accent, onOpen }) => {
  const { t, locale, dir } = useBoardCopy();
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(lesson)}
      className="flex w-full items-center gap-3 px-4 py-3 text-start outline-none transition-colors hover:bg-slate-50 focus-visible:bg-slate-50"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ backgroundColor: accent.soft, color: accent.base }}
      >
        {lesson.emoji ? lesson.emoji : <BookOpen className="h-5 w-5" strokeWidth={1.8} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-[#091e42]">{lesson.title[locale]}</span>
          {!lesson.published && (
            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6882a9]">
              {t('item.draft')}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs font-medium text-[#6882a9]">
          {lesson.meta[locale]}
        </span>
      </span>

      <Chevron className="h-4 w-4 shrink-0 text-[#6882a9]" />
    </button>
  );
};

export const SpaceDetailPage: React.FC<SpaceDetailPageProps> = ({
  spaceId,
  onBack,
  onOpenLesson,
  onAttendance,
}) => {
  const { t, locale, dir } = useBoardCopy();
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const space: Space | undefined = SPACES.find((s) => s.id === spaceId);

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

  const accent = ACCENTS[space.accent];
  const units = unitsForSpace(space.id);

  return (
    <AppChrome canRecord>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        <SpaceHeader
          space={space}
          active="lessons"
          onBack={onBack}
          onTab={(tab) => {
            if (tab === 'attendance') onAttendance?.();
          }}
        />

        <div className="mt-5 space-y-4">
          {units.map((unit, i) => (
            <motion.section
              key={unit.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 * i, ease: EASE }}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="truncate text-sm font-extrabold text-[#091e42]">
                  {unit.title[locale]}
                </h3>
                <span className="shrink-0 text-xs font-semibold text-[#6882a9]">
                  {unit.lessons.length} {t('unit.lessons')}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {unit.lessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    accent={accent}
                    onOpen={onOpenLesson}
                  />
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      </div>
    </AppChrome>
  );
};

export default SpaceDetailPage;
