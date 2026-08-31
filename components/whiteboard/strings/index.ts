import type { LucideIcon } from 'lucide-react';
import { Puzzle, Timer } from 'lucide-react';
import type { Bilingual } from './../spaces';
import type { LessonArtifactData } from './../content/types';

export type StringId = 'match-game' | 'speed-round';

/**
 * A "String" is a small interactive app built on top of a lesson's own content.
 * Each declares whether the lesson has enough data for it to run.
 */
export interface StringApp {
  id: StringId;
  title: Bilingual;
  description: Bilingual;
  Icon: LucideIcon;
  tint: string;
  soft: string;
  available: (data: LessonArtifactData) => boolean;
}

export const STRINGS: StringApp[] = [
  {
    id: 'match-game',
    title: { en: 'Term Match', ar: 'طابِق المصطلح' },
    description: {
      en: 'Pair each term with its definition, against the clock or not.',
      ar: 'صل كل مصطلح بتعريفه، ثم تحقّق من دقّتك.',
    },
    Icon: Puzzle,
    tint: '#8243ea',
    soft: '#f0e9fd',
    available: (d) => !!d.worksheet?.sections.some((s) => s.pairs?.length),
  },
  {
    id: 'speed-round',
    title: { en: 'Speed Round', ar: 'الجولة السريعة' },
    description: {
      en: 'Sixty seconds, ten questions — play it with the whole class.',
      ar: 'ستون ثانية وعشرة أسئلة — العبها مع الصف كله.',
    },
    Icon: Timer,
    tint: '#f59e0b',
    soft: '#fef4e2',
    available: (d) => d.quiz.length > 0,
  },
];

export { MatchGame } from './MatchGame';
export { SpeedRound } from './SpeedRound';
