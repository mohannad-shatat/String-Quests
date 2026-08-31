import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Timer, RotateCcw, Trophy, Play } from 'lucide-react';
import { useBoardCopy } from './../copy';
import type { LessonArtifactData } from './../content/types';
import { EASE } from './../tokens';

const ROUND_SECONDS = 60;

/**
 * A timed run through the lesson's questions. Answering advances immediately,
 * so a class can play it against the clock on the board.
 */
export const SpeedRound: React.FC<{ data: LessonArtifactData; tint: string }> = ({
  data,
  tint,
}) => {
  const { t } = useBoardCopy();
  const questions = useMemo(() => data.quiz.slice(0, 10), [data]);

  const [phase, setPhase] = useState<'idle' | 'playing' | 'over'>('idle');
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(ROUND_SECONDS);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          setPhase('over');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  if (!questions.length) {
    return <p className="text-sm font-medium text-[#6882a9]">{t('str.noData')}</p>;
  }

  const start = () => {
    setPhase('playing');
    setIndex(0);
    setScore(0);
    setLeft(ROUND_SECONDS);
    setPicked(null);
  };

  const answer = (choice: number) => {
    if (picked !== null) return;
    setPicked(choice);
    if (choice === questions[index].answer) setScore((s) => s + 1);

    window.setTimeout(() => {
      setPicked(null);
      if (index + 1 >= questions.length) setPhase('over');
      else setIndex((i) => i + 1);
    }, 700);
  };

  if (phase === 'idle' || phase === 'over') {
    const finished = phase === 'over';
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 py-12 text-center"
        style={{ borderColor: tint, backgroundColor: `${tint}0f` }}
      >
        {finished ? (
          <Trophy className="h-12 w-12" style={{ color: tint }} />
        ) : (
          <Timer className="h-12 w-12" style={{ color: tint }} />
        )}

        <p className="text-xl font-extrabold text-[#091e42]">
          {finished ? `${score} / ${questions.length}` : t('str.speedTitle')}
        </p>
        <p className="max-w-sm text-sm font-medium text-[#6882a9]">
          {finished
            ? `${t('str.timeLeft')}: ${left}${t('str.sec')}`
            : t('str.speedHint').replace('{n}', String(questions.length))}
        </p>

        <button
          type="button"
          onClick={start}
          className="mt-2 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
          style={{ backgroundColor: tint }}
        >
          {finished ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {finished ? t('str.again') : t('str.start')}
        </button>
      </motion.div>
    );
  }

  const q = questions[index];
  const urgent = left <= 10;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold tabular-nums"
          style={{
            backgroundColor: urgent ? '#ffe9ed' : `${tint}14`,
            color: urgent ? '#e11d48' : tint,
          }}
        >
          <Timer className="h-4 w-4" />
          {left}
          {t('str.sec')}
        </span>

        <span className="text-sm font-extrabold tabular-nums text-[#091e42]">
          {index + 1} / {questions.length} · {score}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${(left / ROUND_SECONDS) * 100}%`, backgroundColor: tint }}
        />
      </div>

      <p className="text-lg font-extrabold leading-relaxed text-[#091e42]">{q.text}</p>

      <div className="space-y-2.5">
        {q.options.map((opt, oi) => {
          let style: React.CSSProperties = {};
          if (picked !== null && oi === q.answer)
            style = { borderColor: '#10b981', backgroundColor: '#e3f8f0' };
          else if (picked === oi) style = { borderColor: '#f43f5e', backgroundColor: '#ffe9ed' };
          return (
            <button
              key={oi}
              type="button"
              disabled={picked !== null}
              onClick={() => answer(oi)}
              style={style}
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-right text-base font-medium text-[#091e42] transition-colors enabled:hover:border-slate-300 disabled:cursor-default"
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};
