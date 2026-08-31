import type { Bilingual } from './spaces';
import { CURRICULUM } from './content/curriculum';

export interface Lesson {
  id: string;
  title: Bilingual;
  meta: Bilingual;
  /** Drafts are visible to staff only. */
  published: boolean;
  /** Shown in place of the generic lesson glyph when the source supplies one. */
  emoji?: string;
}

export interface SpaceUnit {
  id: string;
  title: Bilingual;
  lessons: Lesson[];
  /** Public path to the unit's textbook PDF, when one was exported. */
  pdf?: string;
}

/** Units for a space, or an empty list if nothing was generated for it. */
export const unitsForSpace = (spaceId?: string): SpaceUnit[] =>
  (spaceId && CURRICULUM[spaceId]) || [];
