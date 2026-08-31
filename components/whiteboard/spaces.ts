import type { LucideIcon } from 'lucide-react';
import { SUBJECT_SPACES } from './content/subjects';
import { ROSTER } from './roster';

/** A bilingual string. The UI picks the side matching the active locale. */
export interface Bilingual {
  en: string;
  ar: string;
}

export type AccentKey = 'pink' | 'cyan' | 'amber' | 'violet' | 'teal' | 'indigo';

/** Card accents, drawn from the platform palette plus two neighbours. */
export const ACCENTS: Record<AccentKey, { base: string; soft: string }> = {
  pink: { base: '#ed3b91', soft: '#fdeaf3' },
  cyan: { base: '#08b8fb', soft: '#e4f6fe' },
  amber: { base: '#fbc442', soft: '#fef6e4' },
  violet: { base: '#8243ea', soft: '#f0e9fd' },
  teal: { base: '#12b3a8', soft: '#e3f7f5' },
  indigo: { base: '#4f5bd5', soft: '#eaebfa' },
};

export interface Space {
  id: string;
  name: Bilingual;
  subject: Bilingual;
  /** Grade, shown as the corner badge. */
  badge: string;
  grade: string;
  members: number;
  /** Lessons available in this space. */
  lessons: number;
  accent: AccentKey;
  Icon: LucideIcon;
}

/**
 * One space per subject per grade, built from the generated curriculum. The
 * roster is a shared placeholder, so every space reports the same class size.
 */
export const SPACES: Space[] = SUBJECT_SPACES.map((subject) => ({
  id: subject.id,
  name: subject.name,
  subject: subject.subject,
  badge: subject.grade,
  grade: subject.grade,
  members: ROSTER.length,
  lessons: subject.lessons,
  accent: subject.accent,
  Icon: subject.Icon,
}));
