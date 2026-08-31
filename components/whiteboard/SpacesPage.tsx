import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, BookOpen, ArrowRight, ArrowLeft, Inbox } from 'lucide-react';
import { AppChrome } from './AppChrome';
import { useBoardCopy } from './copy';
import { SPACES, ACCENTS, type Space } from './spaces';
import { EASE } from './tokens';

type Filter = 'all' | '11' | '12';

interface SpacesPageProps {
  onOpenSpace?: (space: Space) => void;
}

const SpaceCard: React.FC<{
  space: Space;
  index: number;
  onOpen?: (space: Space) => void;
}> = ({ space, index, onOpen }) => {
  const { t, locale, dir } = useBoardCopy();
  const accent = ACCENTS[space.accent];
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const { Icon } = space;

  return (
    <motion.button
      type="button"
      onClick={() => onOpen?.(space)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.3), ease: EASE }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-start shadow-sm outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-[#08b8fb]/25"
    >
      {/* Cover */}
      <div className="relative h-24 shrink-0" style={{ backgroundColor: accent.base }}>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />
        <span className="absolute end-3 top-3 rounded-lg bg-white/25 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
          {space.badge}
        </span>
        <span
          className="absolute -bottom-6 start-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-900/5"
          style={{ color: accent.base }}
        >
          <Icon className="h-6 w-6" strokeWidth={1.8} />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-9">
        <h3 className="truncate text-base font-extrabold text-[#091e42]">
          {space.name[locale]}
        </h3>
        <p className="mt-1 truncate text-xs font-semibold text-[#6882a9]">
          {space.subject[locale]}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-[#6882a9]">
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

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <span className="text-[11px] font-medium text-[#6882a9]">
          {t('space.grade')} {space.grade}
        </span>
        <span
          className="flex items-center gap-1 text-xs font-bold transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
          style={{ color: accent.base }}
        >
          {t('space.open')}
          <Arrow className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.button>
  );
};

export const SpacesPage: React.FC<SpacesPageProps> = ({ onOpenSpace }) => {
  const { t, locale } = useBoardCopy();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SPACES.filter((space) => {
      if (filter !== 'all' && space.grade !== filter) return false;
      if (!needle) return true;
      return [space.name[locale], space.subject[locale], space.badge]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [query, filter, locale]);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: t('filter.all') },
    { id: '11', label: `${t('space.grade')} 11` },
    { id: '12', label: `${t('space.grade')} 12` },
  ];

  return (
    <AppChrome>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#091e42] sm:text-3xl">
            {t('spaces.title')}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-[#6882a9]">{t('spaces.subtitle')}</p>
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6882a9]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('spaces.search')}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pe-4 ps-10 text-sm font-medium outline-none transition-all placeholder:text-[#6882a9]/70 focus:border-[#08b8fb] focus:ring-4 focus:ring-[#08b8fb]/10"
            />
          </div>

          <div role="tablist" className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
            {filters.map((f) => (
              <button
                key={f.id}
                role="tab"
                type="button"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`relative rounded-lg px-3.5 py-2 text-xs font-bold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#08b8fb]/25 ${
                  filter === f.id ? 'text-white' : 'text-[#6882a9] hover:text-[#091e42]'
                }`}
              >
                {filter === f.id && (
                  <motion.span
                    layoutId="spaces-filter"
                    className="absolute inset-0 rounded-lg bg-[#091e42]"
                    transition={{ duration: 0.25, ease: EASE }}
                  />
                )}
                <span className="relative">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-[#6882a9]">
          {visible.length} {t('spaces.count')}
        </p>

        {visible.length > 0 ? (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((space, i) => (
              <SpaceCard key={space.id} space={space} index={i} onOpen={onOpenSpace} />
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-[#6882a9]">
              <Inbox className="h-7 w-7" strokeWidth={1.6} />
            </span>
            <h2 className="mt-4 text-base font-extrabold text-[#091e42]">
              {t('spaces.empty.title')}
            </h2>
            <p className="mt-1.5 max-w-sm text-sm font-medium text-[#6882a9]">
              {t('spaces.empty.body')}
            </p>
          </div>
        )}
      </div>
    </AppChrome>
  );
};

export default SpacesPage;
