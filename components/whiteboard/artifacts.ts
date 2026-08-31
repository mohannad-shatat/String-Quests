import type { LucideIcon } from 'lucide-react';
import {
  Network,
  BookOpen,
  LayoutGrid,
  CircleQuestionMark,
  FileSpreadsheet,
  BookMarked,
  Blocks,
} from 'lucide-react';
import type { Bilingual } from './spaces';

export interface Artifact {
  id: string;
  label: Bilingual;
  Icon: LucideIcon;
  /** Icon foreground and its tinted tile, used inside the artifact view. */
  tint: string;
  soft: string;
  /** Gradient for the launcher tile. */
  from: string;
  to: string;
}

export const ARTIFACTS: Artifact[] = [
  {
    id: 'strings',
    label: { en: 'Strings', ar: 'سترينغز' },
    Icon: Blocks,
    tint: '#0ea5e9',
    soft: '#e0f2fe',
    from: '#22d3ee',
    to: '#0891b2',
  },
  {
    id: 'textbook',
    label: { en: 'Textbook', ar: 'الكتاب' },
    Icon: BookMarked,
    tint: '#f59e0b',
    soft: '#fef4e2',
    from: '#fbbf24',
    to: '#d97706',
  },
  {
    id: 'mind-map',
    label: { en: 'Mind Map', ar: 'خريطة ذهنية' },
    Icon: Network,
    tint: '#8243ea',
    soft: '#f0e9fd',
    from: '#a78bfa',
    to: '#7c3aed',
  },
  {
    id: 'summary',
    label: { en: 'Summary', ar: 'ملخّص' },
    Icon: BookOpen,
    tint: '#d6257a',
    soft: '#fce7f0',
    from: '#f472b6',
    to: '#db2777',
  },
  {
    id: 'flashcards',
    label: { en: 'Flashcards', ar: 'بطاقات تعليمية' },
    Icon: LayoutGrid,
    tint: '#f43f5e',
    soft: '#ffe9ed',
    from: '#fb7185',
    to: '#e11d48',
  },
  {
    id: 'quiz',
    label: { en: 'Quiz', ar: 'اختبار قصير' },
    Icon: CircleQuestionMark,
    tint: '#08b8fb',
    soft: '#e4f6fe',
    from: '#38bdf8',
    to: '#0284c7',
  },
  {
    id: 'worksheet',
    label: { en: 'Worksheet', ar: 'ورقة عمل' },
    Icon: FileSpreadsheet,
    tint: '#10b981',
    soft: '#e3f8f0',
    from: '#34d399',
    to: '#059669',
  },
];
