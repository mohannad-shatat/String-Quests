/**
 * CSV import/export for the roster.
 *
 * The parser handles quoted fields rather than a bare `split(',')` — Arabic
 * addresses and "Family, Jr." style names contain commas, and a naive split
 * silently shifts every column after the first one that does.
 *
 * Exports carry a UTF-8 BOM so Excel opens Arabic correctly, matching what
 * BulkActionsPanel already does for attendance.
 */

import { findDuplicates } from './studentMatching';
import { emptyGuardian, emptyStudent, type StudentRecord } from './studentTypes';
import { generatePassword, generateRecordId, generateStudentId } from '../../utils/studentStorage';

/** Column order for both the template and the export. */
export const CSV_COLUMNS = [
  'name',
  'nameEn',
  'studentId',
  'gender',
  'dateOfBirth',
  'nationalId',
  'grade',
  'section',
  'campusId',
  'email',
  'phone',
  'loginEmail',
  'guardianName',
  'guardianPhone',
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

/* ─── Parsing ─────────────────────────────────────────────────────────── */

/** RFC-4180-ish: quoted fields, doubled quotes, embedded commas and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  // Strip a BOM if the file came back out of Excel.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      // Swallow the \n of a \r\n pair.
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop trailing blank lines.
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/* ─── Row classification ──────────────────────────────────────────────── */

export type RowStatus = 'new' | 'duplicate' | 'error';
/** What to do with a row on apply. Duplicates default to skip. */
export type RowResolution = 'create' | 'skip' | 'update';

export interface ParsedRow {
  index: number;
  raw: Record<string, string>;
  status: RowStatus;
  /** i18n keys describing why the row is invalid. */
  errors: string[];
  /** The existing record a duplicate collides with. */
  duplicateOf?: StudentRecord;
  resolution: RowResolution;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Maps header cells to our column names, tolerating case, spaces and
 * underscores — nobody re-types a header row exactly.
 */
function normalizeHeader(cell: string): string {
  return cell.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

const HEADER_LOOKUP: Record<string, CsvColumn> = CSV_COLUMNS.reduce(
  (acc, col) => {
    acc[normalizeHeader(col)] = col;
    return acc;
  },
  {} as Record<string, CsvColumn>,
);

export function classifyRows(rows: string[][], existing: StudentRecord[]): ParsedRow[] {
  if (rows.length === 0) return [];

  const header = rows[0].map(normalizeHeader);
  const body = rows.slice(1);

  return body.map((cells, i) => {
    const raw: Record<string, string> = {};
    header.forEach((h, idx) => {
      const col = HEADER_LOOKUP[h];
      if (col) raw[col] = (cells[idx] ?? '').trim();
    });

    const errors: string[] = [];
    if (!raw.name) errors.push('csv.errRequired');
    if (raw.grade && Number.isNaN(Number(raw.grade))) errors.push('csv.errGrade');
    if (raw.loginEmail && !EMAIL_RE.test(raw.loginEmail)) errors.push('csv.errEmail');
    if (raw.email && !EMAIL_RE.test(raw.email)) errors.push('csv.errEmail');

    if (errors.length > 0) {
      return { index: i, raw, status: 'error', errors, resolution: 'skip' };
    }

    // Reuse the same duplicate rules the form uses, so import and manual
    // entry can never disagree about what counts as the same person.
    const probe: StudentRecord = {
      ...emptyStudent(),
      id: `csv-${i}`,
      name: raw.name ?? '',
      nameEn: raw.nameEn ?? '',
      nationalId: raw.nationalId ?? '',
    };
    const dupes = findDuplicates(probe, existing);

    if (dupes.length > 0) {
      return {
        index: i,
        raw,
        status: 'duplicate',
        errors: [],
        duplicateOf: dupes[0].student,
        resolution: 'skip',
      };
    }

    return { index: i, raw, status: 'new', errors: [], resolution: 'create' };
  });
}

/** Turns an approved row into a record ready for `saveStudent`. */
export function rowToStudent(row: ParsedRow, base?: StudentRecord): StudentRecord {
  const r = row.raw;
  const guardians = [...(base?.guardians ?? [])];

  if (r.guardianName || r.guardianPhone) {
    guardians.length = 0;
    guardians.push({
      ...emptyGuardian('other'),
      name: r.guardianName ?? '',
      phone: r.guardianPhone ?? '',
    });
  }

  const merged: StudentRecord = {
    ...(base ?? emptyStudent()),
    id: base?.id || generateRecordId(),
    name: r.name || base?.name || '',
    nameEn: r.nameEn || base?.nameEn || '',
    studentId: r.studentId || base?.studentId || generateStudentId(),
    gender: (r.gender as StudentRecord['gender']) || base?.gender || '',
    dateOfBirth: r.dateOfBirth || base?.dateOfBirth || '',
    nationalId: r.nationalId || base?.nationalId || '',
    grade: r.grade ? Number(r.grade) : (base?.grade ?? null),
    section: r.section || base?.section || '',
    campusId: r.campusId || base?.campusId || '',
    email: r.email || base?.email || '',
    phone: r.phone || base?.phone || '',
    loginEmail: r.loginEmail || base?.loginEmail || '',
    password: base?.password || generatePassword(),
    guardians,
    isLocal: true,
  };

  return merged;
}

/* ─── Writing ─────────────────────────────────────────────────────────── */

function escapeCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function studentsToCsv(students: StudentRecord[]): string {
  const header = CSV_COLUMNS.join(',');
  const lines = students.map((s) => {
    const g = s.guardians[0];
    const row: Record<CsvColumn, string> = {
      name: s.name,
      nameEn: s.nameEn,
      studentId: s.studentId,
      gender: s.gender,
      dateOfBirth: s.dateOfBirth,
      nationalId: s.nationalId,
      grade: s.grade === null ? '' : String(s.grade),
      section: s.section,
      campusId: s.campusId,
      email: s.email,
      phone: s.phone,
      loginEmail: s.loginEmail,
      guardianName: g?.name ?? '',
      guardianPhone: g?.phone ?? '',
    };
    return CSV_COLUMNS.map((c) => escapeCell(row[c] ?? '')).join(',');
  });
  return [header, ...lines].join('\n');
}

/** BOM so Excel reads the UTF-8 Arabic instead of mojibake. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function templateCsv(): string {
  const sample = [
    'أحمد السالم', 'Ahmed Al-Salem', '', 'male', '2015-04-12', '9990012345',
    '3', 'A', 'camp-1', 'ahmed@example.com', '0790000000', 'ahmed@school.edu',
    'سالم السالم', '0791111111',
  ];
  return [CSV_COLUMNS.join(','), sample.map(escapeCell).join(',')].join('\n');
}
