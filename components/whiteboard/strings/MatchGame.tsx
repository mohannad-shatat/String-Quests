import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, RotateCcw, Trophy } from 'lucide-react';
import { useBoardCopy } from './../copy';
import type { LessonArtifactData } from './../content/types';
import { EASE } from './../tokens';

/**
 * Pair each term with its definition. Built from the worksheet's `match`
 * section, whose left-hand column is short enough to play with.
 */
export const MatchGame: React.FC<{ data: LessonArtifactData; tint: string }> = ({
  data,
  tint,
}) => {
  const { t } = useBoardCopy();

  const pairs = useMemo(() => {
    const section = data.worksheet?.sections.find((s) => s.pairs?.length);
    return (section?.pairs ?? []).slice(0, 6);
  }, [data]);

  const [shuffled, setShuffled] = useState(() =>
    pairs.map((_, i) => i).sort(() => Math.random() - 0.5),
  );
  const [pickedLeft, setPickedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const [tries, setTries] = useState(0);

  if (!pairs.length) {
    return <p className="text-sm font-medium text-[#6882a9]">{t('str.noData')}</p>;
  }

  const done = matched.size === pairs.length;

  const choose = (rightIndex: number) => {
    if (pickedLeft === null || matched.has(rightIndex)) return;
    setTries((n) => n + 1);

    if (pickedLeft === rightIndex) {
      setMatched((prev) => new Set(prev).add(rightIndex));
      setPickedLeft(null);
    } else {
      setWrong(rightIndex);
      window.setTimeout(() => setWrong(null), 500);
      setPickedLeft(null);
    }
  };

  const restart = () => {
    setShuffled(pairs.map((_, i) => i).sort(() => Math.random() - 0.5));
    setMatched(new Set());
    setPickedLeft(null);
    setTries(0);
  };

  const accuracy = tries ? Math.round((pairs.length / tries) * 100) : 100;

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 py-12 text-center"
        style={{ borderColor: tint, backgroundColor: `${tint}0f` }}
      >
        <Trophy className="h-12 w-12" style={{ color: tint }} />
        <p className="text-xl font-extrabold text-[#091e42]">{t('str.done')}</p>
        <p className="text-sm font-bold text-[#6882a9]">
          {t('str.tries')}: {tries} · {t('str.accuracy')}: {accuracy}%
        </p>
        <button
          type="button"
          onClick={restart}
          className="mt-2 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
          style={{ backgroundColor: tint }}
        >
          <RotateCcw className="h-4 w-4" />
          {t('str.again')}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#6882a9]">{t('str.matchHint')}</p>
        <p className="shrink-0 text-sm font-extrabold tabular-nums" style={{ color: tint }}>
          {matched.size} / {pairs.length}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Terms */}
        <div className="space-y-2">
          {pairs.map((pair, i) => {
            const isMatched = matched.has(i);
            const isPicked = pickedLeft === i;
            return (
              <button
                key={i}
                type="button"
                disabled={isMatched}
                onClick={() => setPickedLeft(i)}
                className="w-full rounded-2xl border-2 px-3 py-3 text-right text-sm font-bold transition-all disabled:cursor-default"
                style={{
                  borderColor: isMatched ? '#10b981' : isPicked ? tint : '#e2e8f0',
                  backgroundColor: isMatched ? '#e3f8f0' : isPicked ? `${tint}14` : '#fff',
                  color: isMatched ? '#0f766e' : '#091e42',
                }}
              >
                <span className="flex items-center gap-2">
                  {isMatched && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
                  <span className="flex-1">{pair.left}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Definitions, in a scrambled order */}
        <div className="space-y-2">
          {shuffled.map((idx) => {
            const isMatched = matched.has(idx);
            const isWrong = wrong === idx;
            return (
              <motion.button
                key={idx}
                type="button"
                disabled={isMatched || pickedLeft === null}
                onClick={() => choose(idx)}
                animate={isWrong ? { x: [0, -6, 6, -4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full rounded-2xl border-2 px-3 py-3 text-right text-xs leading-relaxed transition-colors disabled:cursor-default"
                style={{
                  borderColor: isMatched ? '#10b981' : isWrong ? '#f43f5e' : '#e2e8f0',
                  backgroundColor: isMatched ? '#e3f8f0' : isWrong ? '#ffe9ed' : '#fff',
                  color: isMatched ? '#0f766e' : '#334155',
                  opacity: pickedLeft === null && !isMatched ? 0.65 : 1,
                }}
              >
                {pairs[idx].right}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
