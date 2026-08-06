/**
 * Student adapter over the shared directory search engine.
 *
 * The ranking, edit distance, highlighting and "did you mean" logic all live
 * in components/directory/directorySearch.ts so teachers and parents use the
 * same engine. This file only declares *which* student fields are searchable
 * and how much each is worth.
 */

import {
  buildSearchIndex as buildGenericIndex,
  didYouMean as genericDidYouMean,
  pushField,
  searchEntries,
  type IndexedField,
  type SearchEntry,
  type SearchHit as GenericHit,
} from '../directory/directorySearch';
import type { StudentRecord } from './studentTypes';

export { highlight, boundedEditDistance } from '../directory/directorySearch';
export type { HighlightSegment } from '../directory/directorySearch';

/** Which field a hit landed on, so the UI can explain *why* a row matched. */
export type MatchField =
  | 'name'
  | 'nameEn'
  | 'studentId'
  | 'loginEmail'
  | 'nationalId'
  | 'guardianName'
  | 'guardianPhone';

export type StudentSearchEntry = SearchEntry<StudentRecord>;

/**
 * Hit shape kept as `{ student }` rather than the generic `{ item }` so the
 * existing table and palette call sites read naturally.
 */
export interface SearchHit {
  student: StudentRecord;
  score: number;
  matchedField: MatchField;
  fuzzy: boolean;
}

/** A name hit beats a guardian-phone hit when scores tie. */
function extractStudentFields(s: StudentRecord): IndexedField[] {
  const out: IndexedField[] = [];
  pushField(out, 'name', s.name, { weight: 10, suggestable: true });
  pushField(out, 'nameEn', s.nameEn, { weight: 9, suggestable: true });
  pushField(out, 'studentId', s.studentId, { weight: 8 });
  pushField(out, 'loginEmail', s.loginEmail, { weight: 5 });
  pushField(out, 'nationalId', s.nationalId, { weight: 5, digits: true, exactOnly: true });
  for (const g of s.guardians) {
    pushField(out, 'guardianName', g.name, { weight: 3 });
    pushField(out, 'guardianPhone', g.phone, { weight: 2, digits: true, exactOnly: true });
  }
  return out;
}

export function buildSearchIndex(students: StudentRecord[]): StudentSearchEntry[] {
  return buildGenericIndex(students, extractStudentFields);
}

function adapt(hit: GenericHit<StudentRecord>): SearchHit {
  return {
    student: hit.item,
    score: hit.score,
    matchedField: hit.matchedField as MatchField,
    fuzzy: hit.fuzzy,
  };
}

export function searchStudents(
  index: StudentSearchEntry[],
  rawQuery: string,
): SearchHit[] | null {
  const hits = searchEntries(index, rawQuery);
  return hits ? hits.map(adapt) : null;
}

export function didYouMean(
  index: StudentSearchEntry[],
  rawQuery: string,
  limit = 3,
): StudentRecord[] {
  return genericDidYouMean(index, rawQuery, limit);
}
