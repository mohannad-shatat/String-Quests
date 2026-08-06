/**
 * The not-found screen.
 *
 * An empty roster is where a search feels broken or feels good. This offers
 * four distinct recoveries instead of a shrug: fix the typo, widen the
 * filters, create the student, or bulk import. It names *which* filters are
 * hiding results — by far the most common cause of "the search doesn't work".
 */

import React from 'react';
import { FileUp, Search, UserPlus, X } from 'lucide-react';
import { fieldDef, type FilterField, type FilterState } from './studentFilters';
import type { Locale } from './studentsI18n';
import { fill } from './studentsI18n';
import type { StudentRecord } from './studentTypes';

interface StudentsEmptyStateProps {
  query: string;
  suggestions: StudentRecord[];
  activeFilters: FilterField[];
  filters: FilterState;
  filterLabel: (field: FilterField) => string;
  onClearFilter: (field: FilterField) => void;
  onClearAll: () => void;
  onOpenStudent: (id: string) => void;
  onAddStudent: () => void;
  onImportCsv: () => void;
  locale: Locale;
  t: (key: string) => string;
}

export const StudentsEmptyState: React.FC<StudentsEmptyStateProps> = ({
  query,
  suggestions,
  activeFilters,
  filters,
  filterLabel,
  onClearFilter,
  onClearAll,
  onOpenStudent,
  onAddStudent,
  onImportCsv,
  locale,
  t,
}) => {
  const isAr = locale === 'ar';
  const trimmed = query.trim();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-12">
      <div className="max-w-md mx-auto text-center">
        <span className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Search className="w-6 h-6 text-slate-400" aria-hidden="true" />
        </span>

        <h2 className="text-sm font-bold text-sq-ink font-cairo">
          {trimmed ? (
            <>
              {t('empty.title')} <span className="text-sq-accent-600">«{trimmed}»</span>
            </>
          ) : (
            t('empty.titleNoQuery')
          )}
        </h2>

        {/* 1 — fix the typo */}
        {suggestions.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-bold text-slate-400 font-cairo mb-2">
              {t('empty.didYouMean')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onOpenStudent(s.id)}
                  className="px-3 py-1.5 rounded-full border border-sq-accent-200 bg-sq-accent-50 text-[11px] font-bold text-sq-accent-700 font-cairo hover:bg-sq-accent-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
                >
                  {isAr ? s.name : s.nameEn || s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2 — widen the filters */}
        {activeFilters.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-bold text-slate-400 font-cairo mb-2">
              {t('empty.filtersNarrowing')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {activeFilters.map((field) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => onClearFilter(field)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 font-cairo hover:border-sq-danger-500 hover:text-sq-danger-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-danger-500 transition-colors"
                >
                  {filterLabel(field)}
                  <span className="text-slate-400">({filters[field]?.length ?? 0})</span>
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                onClick={onClearAll}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-sq-accent-600 font-cairo hover:bg-sq-accent-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
              >
                {t('filter.clear')}
              </button>
            </div>
          </div>
        )}

        {/* 3 and 4 — create, or bulk import */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            type="button"
            onClick={onAddStudent}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sq-accent-500 text-white text-xs font-bold font-cairo shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
            {trimmed ? fill(t('empty.addNamed'), { q: trimmed }) : t('empty.addPlain')}
          </button>
          <button
            type="button"
            onClick={onImportCsv}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-sq-ink font-cairo hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
          >
            <FileUp className="w-3.5 h-3.5" aria-hidden="true" />
            {t('empty.import')}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Convenience for callers that only have the field id. */
export function makeFilterLabel(t: (k: string) => string) {
  return (field: FilterField) => t(fieldDef(field).labelKey);
}

export default StudentsEmptyState;
