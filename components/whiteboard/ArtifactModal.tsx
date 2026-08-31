import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  Circle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Lightbulb,
  Shuffle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useBoardCopy } from './copy';
import type { Artifact } from './artifacts';
import type { LessonArtifactData } from './content/types';
import { loadArtifacts } from './content/loader';
import { WorksheetView } from './WorksheetView';
import { STRINGS, MatchGame, SpeedRound, type StringId } from './strings';
import { MindMapTree } from './MindMapTree';
import { EASE } from './tokens';

interface ArtifactModalProps {
  artifact: Artifact | null;
  spaceId?: string;
  lessonId?: string;
  /** Public path to the unit's PDF, when the lesson's unit has one. */
  pdfUrl?: string;
  onClose: () => void;
}

/* ------------------------------------------------------------------ shared */

const Body: React.FC<{ children: React.ReactNode; full?: boolean }> = ({ children, full }) => (
  <div
    dir="rtl"
    className={full ? 'h-full text-right' : 'mx-auto max-w-3xl space-y-4 text-right'}
  >
    {children}
  </div>
);

const Bullets: React.FC<{ items: string[]; tint: string }> = ({ items, tint }) => (
  <ul className="space-y-2.5">
    {items.map((item, i) => (
      <li key={i} className="flex gap-2.5 text-base leading-relaxed text-[#091e42]">
        <span
          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: tint }}
        />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

/** Prev / counter / next, laid out so the arrows follow reading order in RTL. */
const Stepper: React.FC<{
  index: number;
  total: number;
  tint: string;
  onPrev: () => void;
  onNext: () => void;
  extra?: React.ReactNode;
}> = ({ index, total, tint, onPrev, onNext, extra }) => (
  <div className="flex items-center justify-between gap-3 pt-1">
    <button
      type="button"
      onClick={onPrev}
      disabled={index === 0}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-[#6882a9] transition-colors enabled:hover:border-slate-300 enabled:hover:text-[#091e42] disabled:opacity-30"
    >
      <ChevronRight className="h-5 w-5" />
    </button>

    <div className="flex items-center gap-3">
      {extra}
      <span className="text-sm font-extrabold tabular-nums" style={{ color: tint }}>
        {index + 1} / {total}
      </span>
    </div>

    <button
      type="button"
      onClick={onNext}
      disabled={index >= total - 1}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-[#6882a9] transition-colors enabled:hover:border-slate-300 enabled:hover:text-[#091e42] disabled:opacity-30"
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  </div>
);

/* -------------------------------------------------------------- flashcards */

/** One card at a time, sized for projecting to a room. */
const Flashcards: React.FC<{ data: LessonArtifactData; tint: string; soft: string }> = ({
  data,
  tint,
  soft,
}) => {
  const { t } = useBoardCopy();
  const [i, setI] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [order, setOrder] = useState(() => data.flashcards.map((_, n) => n));

  if (!data.flashcards.length) {
    return <p className="text-sm font-medium text-[#6882a9]">{t('art.empty')}</p>;
  }

  const card = data.flashcards[order[i]];
  const go = (next: number) => {
    setI(next);
    setShowBack(false);
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setShowBack((v) => !v)}
        className="flex min-h-[260px] w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 px-6 py-8 text-center transition-colors sm:min-h-[300px]"
        style={{
          borderColor: showBack ? tint : '#e2e8f0',
          backgroundColor: showBack ? soft : '#fff',
        }}
      >
        <span
          className="rounded-full px-3 py-1 text-[11px] font-bold"
          style={{ backgroundColor: showBack ? '#fff' : soft, color: tint }}
        >
          {showBack ? t('art.answer') : t('art.question')}
        </span>

        <p className="text-xl font-extrabold leading-relaxed text-[#091e42] sm:text-2xl">
          {showBack ? card.back : card.front}
        </p>

        <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: tint }}>
          <RotateCcw className="h-3.5 w-3.5" />
          {showBack ? t('art.showQuestion') : t('art.reveal')}
        </span>
      </button>

      <Stepper
        index={i}
        total={data.flashcards.length}
        tint={tint}
        onPrev={() => go(i - 1)}
        onNext={() => go(i + 1)}
        extra={
          <button
            type="button"
            aria-label={t('art.shuffle')}
            onClick={() => {
              const shuffled = [...order];
              for (let n = shuffled.length - 1; n > 0; n -= 1) {
                const m = Math.floor(Math.random() * (n + 1));
                [shuffled[n], shuffled[m]] = [shuffled[m], shuffled[n]];
              }
              setOrder(shuffled);
              go(0);
            }}
            className="rounded-lg p-2 text-[#6882a9] transition-colors hover:bg-slate-100 hover:text-[#091e42]"
          >
            <Shuffle className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
};

/* -------------------------------------------------------------------- quiz */

/** One question at a time, so the class answers together before moving on. */
const Quiz: React.FC<{ data: LessonArtifactData; tint: string }> = ({ data, tint }) => {
  const { t } = useBoardCopy();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [hinted, setHinted] = useState<Record<number, boolean>>({});

  if (!data.quiz.length) {
    return <p className="text-sm font-medium text-[#6882a9]">{t('art.empty')}</p>;
  }

  const q = data.quiz[i];
  const choice = picked[i];
  const answered = choice !== undefined;

  return (
    <div className="space-y-4">
      <p className="text-lg font-extrabold leading-relaxed text-[#091e42] sm:text-xl">{q.text}</p>

      <div className="space-y-2.5">
        {q.options.map((opt, oi) => {
          const isAnswer = oi === q.answer;
          const isChoice = choice === oi;
          let style: React.CSSProperties = {};
          if (answered && isAnswer) style = { borderColor: '#10b981', backgroundColor: '#e3f8f0' };
          else if (answered && isChoice) style = { borderColor: '#f43f5e', backgroundColor: '#ffe9ed' };
          return (
            <button
              key={oi}
              type="button"
              disabled={answered}
              onClick={() => setPicked((p) => ({ ...p, [i]: oi }))}
              style={style}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-right text-base font-medium text-[#091e42] transition-colors enabled:hover:border-slate-300 disabled:cursor-default"
            >
              {answered && isAnswer ? (
                <Check className="h-5 w-5 shrink-0 text-[#10b981]" strokeWidth={3} />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-[#cbd5e1]" />
              )}
              <span className="flex-1">{opt}</span>
            </button>
          );
        })}
      </div>

      {!answered && q.hint && (
        <button
          type="button"
          onClick={() => setHinted((p) => ({ ...p, [i]: true }))}
          className="flex items-center gap-1.5 text-xs font-bold"
          style={{ color: tint }}
        >
          <Lightbulb className="h-3.5 w-3.5" />
          {hinted[i] ? q.hint : t('art.hint')}
        </button>
      )}

      {answered && q.explanation && (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-[#6882a9]">
          {q.explanation}
        </p>
      )}

      <Stepper
        index={i}
        total={data.quiz.length}
        tint={tint}
        onPrev={() => setI(i - 1)}
        onNext={() => setI(i + 1)}
      />
    </div>
  );
};

/* --------------------------------------------------------------- worksheet */

/* --------------------------------------------------------------- the modal */

export const ArtifactModal: React.FC<ArtifactModalProps> = ({
  artifact,
  spaceId,
  lessonId,
  pdfUrl,
  onClose,
}) => {
  const { t, locale } = useBoardCopy();
  const [openString, setOpenString] = useState<StringId | null>(null);
  const [data, setData] = useState<LessonArtifactData | undefined>();
  const [loading, setLoading] = useState(false);

  // Each subject's artifacts are a separate chunk, fetched the first time one
  // of its lessons is opened and then cached by the loader.
  useEffect(() => {
    if (!artifact || !spaceId || !lessonId) return;
    let live = true;
    setLoading(true);
    loadArtifacts(spaceId)
      .then((all) => {
        if (live) setData(all?.[lessonId]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [artifact, spaceId, lessonId]);

  const render = () => {
    if (!artifact) return null;

    // The textbook is a file, not generated content, so it is handled first.
    if (artifact.id === 'textbook') {
      return pdfUrl ? (
        <div dir="rtl" className="flex h-full flex-col gap-3">
          <iframe
            src={pdfUrl}
            title={artifact.label[locale]}
            className="min-h-0 w-full flex-1 rounded-2xl border border-slate-200 bg-slate-50"
          />
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
            style={{ backgroundColor: artifact.tint }}
          >
            <ExternalLink className="h-4 w-4" />
            {t('art.openTab')}
          </a>
        </div>
      ) : (
        <p className="text-sm font-medium text-[#6882a9]">{t('art.noPdf')}</p>
      );
    }

    if (loading) {
      return (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#6882a9]" />
        </div>
      );
    }
    if (!data) return <p className="text-sm font-medium text-[#6882a9]">{t('art.none')}</p>;

    const { tint, soft } = artifact;

    switch (artifact.id) {
      case 'summary':
        return (
          <Body>
            {data.summary && (
              <p className="text-base leading-relaxed text-[#091e42]">{data.summary}</p>
            )}
            {data.keyPoints.length > 0 && (
              <>
                <h3 className="pt-1 text-sm font-extrabold" style={{ color: tint }}>
                  {t('art.keyPoints')}
                </h3>
                <Bullets items={data.keyPoints} tint={tint} />
              </>
            )}
          </Body>
        );

      case 'mind-map':
        return (
          <Body full>
            {data.mindMap ? (
              <MindMapTree root={data.mindMap} tint={tint} />
            ) : (
              <p className="text-sm font-medium text-[#6882a9]">{t('art.empty')}</p>
            )}
          </Body>
        );

      case 'flashcards':
        return (
          <Body>
            <Flashcards data={data} tint={tint} soft={soft} />
          </Body>
        );

      case 'quiz':
        return (
          <Body>
            <Quiz data={data} tint={tint} />
          </Body>
        );

      case 'worksheet':
        return (
          <Body>
            <WorksheetView data={data} tint={tint} />
          </Body>
        );

      case 'strings': {
        const available = STRINGS.filter((app) => app.available(data));

        if (openString) {
          const app = STRINGS.find((a) => a.id === openString);
          if (!app) return null;
          return (
            <Body>
              <button
                type="button"
                onClick={() => setOpenString(null)}
                className="mb-3 flex items-center gap-1.5 text-xs font-bold text-[#6882a9] transition-colors hover:text-[#08b8fb]"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                {t('str.back')}
              </button>
              {app.id === 'match-game' ? (
                <MatchGame data={data} tint={app.tint} />
              ) : (
                <SpeedRound data={data} tint={app.tint} />
              )}
            </Body>
          );
        }

        return (
          <Body>
            {available.length ? (
              <div className="space-y-2.5">
                {available.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setOpenString(app.id)}
                    className="flex w-full items-center gap-3.5 rounded-2xl border-2 border-slate-200 p-4 text-right transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: app.soft, color: app.tint }}
                    >
                      <app.Icon className="h-6 w-6" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-extrabold text-[#091e42]">
                        {app.title[locale]}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-[#6882a9]">
                        {app.description[locale]}
                      </span>
                    </span>
                    <ChevronLeft className="h-4 w-4 shrink-0 text-[#6882a9]" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-[#6882a9]">{t('str.none')}</p>
            )}
          </Body>
        );
      }

      default:
        return <p className="text-sm font-medium text-[#6882a9]">{t('art.empty')}</p>;
    }
  };

  return (
    <AnimatePresence>
      {artifact && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setOpenString(null);
              onClose();
            }}
            className="fixed inset-0 z-40 bg-[#091e42]/45 backdrop-blur-[2px]"
          />
          {/* Padded wrapper keeps an equal gap on all four sides at every width.
              It ignores pointer events so clicks fall through to the overlay. */}
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: artifact.soft, color: artifact.tint }}
              >
                <artifact.Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <h2 className="min-w-0 flex-1 truncate text-base font-extrabold text-[#091e42]">
                {artifact.label[locale]}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setOpenString(null);
                  onClose();
                }}
                aria-label={t('art.close')}
                className="rounded-lg p-2 text-[#6882a9] transition-colors hover:bg-slate-100 hover:text-[#091e42]"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div
              className={`min-h-0 flex-1 px-5 py-5 ${
                artifact.id === 'mind-map' || artifact.id === 'textbook'
                  ? 'overflow-hidden'
                  : 'overflow-y-auto'
              }`}
            >
              {render()}
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
