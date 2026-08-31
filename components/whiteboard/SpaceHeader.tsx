import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Users, BookOpen } from 'lucide-react';
import { useBoardCopy } from './copy';
import { ACCENTS, type Space } from './spaces';
import { EASE } from './tokens';

export type SpaceTab = 'lessons' | 'attendance';

interface SpaceHeaderProps {
  space: Space;
  active: SpaceTab;
  onBack?: () => void;
  onTab?: (tab: SpaceTab) => void;
}

/** Identity card plus the two-way tab switch, shared by both space screens. */
export const SpaceHeader: React.FC<SpaceHeaderProps> = ({ space, active, onBack, onTab }) => {
  const { t, locale, dir } = useBoardCopy();
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const accent = ACCENTS[space.accent];
  const { Icon } = space;

  const tabs: { id: SpaceTab; label: string }[] = [
    { id: 'lessons', label: t('space.lessons') },
    { id: 'attendance', label: t('space.attendance') },
  ];

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold text-[#6882a9] transition-colors hover:text-[#08b8fb]"
      >
        <BackArrow className="h-3.5 w-3.5" />
        {t('space.back')}
      </button>

      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mt-4 flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5"
      >
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: accent.soft, color: accent.base }}
        >
          <Icon className="h-7 w-7" strokeWidth={1.8} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-lg font-extrabold leading-snug text-[#091e42] sm:text-xl">
              {space.name[locale]}
            </h1>
            <span
              className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: accent.base }}
            >
              {space.badge}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[#6882a9]">{space.subject[locale]}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-[#6882a9]">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" strokeWidth={2} />
              {space.members} {t('space.members')}
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
              {space.lessons} {t('space.lessonsCount')}
            </span>
          </div>
        </div>
      </motion.header>

      <div
        role="tablist"
        className="mt-5 flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200 sm:w-fit"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active === tab.id}
            onClick={() => onTab?.(tab.id)}
            className={`relative flex-1 rounded-lg px-5 py-2 text-xs font-bold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#08b8fb]/25 sm:flex-none ${
              active === tab.id ? 'text-white' : 'text-[#6882a9] hover:text-[#091e42]'
            }`}
          >
            {active === tab.id && (
              <motion.span
                layoutId="space-tab"
                className="absolute inset-0 rounded-lg bg-[#091e42]"
                transition={{ duration: 0.25, ease: EASE }}
              />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};
