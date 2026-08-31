/**
 * Shapes shared by every generated subject artifact file.
 */

export interface MindNode {
  label: string;
  details?: string;
  children?: MindNode[];
}

export interface Flashcard {
  front: string;
  back: string;
  level?: string;
}

export interface QuizQuestion {
  text: string;
  options: string[];
  /** Zero-based index into options. */
  answer: number;
  hint?: string;
  explanation?: string;
}

export interface WorksheetSection {
  type: string;
  title?: string;
  prompt?: string;
  text?: string;
  mcq?: { prompt: string; options: string[]; answer: number; hint?: string }[];
  tf?: { statement: string; answer: boolean }[];
  pairs?: { left: string; right: string }[];
  blanks?: { text: string; answer: string[] }[];
  groups?: { label: string; items: string[] }[];
  modelAnswer?: string;
  ordered?: string[];
  compare?: { items: string[]; dimensions: string[] };
}

export interface LessonArtifactData {
  summary?: string;
  keyPoints: string[];
  mindMap?: MindNode;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  worksheet?: { title?: string; sections: WorksheetSection[] };
}
