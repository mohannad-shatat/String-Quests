/**
 * CSV import — upload, preview, resolve conflicts, then apply.
 *
 * Nothing is written until the final button. Every row is classified as New,
 * Duplicate or Error, and duplicates default to *skip* so a careless import
 * can't quietly overwrite good records — the user has to opt into each update.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Check, Download, FileUp, Upload, X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import {
  classifyRows,
  downloadCsv,
  parseCsv,
  templateCsv,
  type ParsedRow,
  type RowResolution,
} from './studentCsv';
import { fill, type Locale } from './studentsI18n';
import type { StudentRecord } from './studentTypes';

interface ImportCsvDialogProps {
  open: boolean;
  existing: StudentRecord[];
  locale: Locale;
  t: (key: string) => string;
  onApply: (rows: ParsedRow[]) => void;
  onClose: () => void;
}

export const ImportCsvDialog: React.FC<ImportCsvDialogProps> = ({
  open,
  existing,
  locale,
  t,
  onApply,
  onClose,
}) => {
  const reduce = useReducedMotion();
  const isAr = locale === 'ar';
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setRows(null);
    setFileError('');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  const readFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setFileError(isAr ? 'يجب اختيار ملف CSV' : 'Please choose a .csv file');
        return;
      }
      setFileError('');
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return;
        setRows(classifyRows(parseCsv(reader.result), existing));
      };
      reader.onerror = () =>
        setFileError(isAr ? 'تعذّر قراءة الملف' : 'Could not read that file');
      reader.readAsText(file, 'utf-8');
    },
    [existing, isAr],
  );

  const summary = useMemo(() => {
    if (!rows) return { new: 0, dupe: 0, err: 0 };
    return {
      new: rows.filter((r) => r.status === 'new').length,
      dupe: rows.filter((r) => r.status === 'duplicate').length,
      err: rows.filter((r) => r.status === 'error').length,
    };
  }, [rows]);

  const applyCount = useMemo(
    () => (rows ?? []).filter((r) => r.resolution !== 'skip').length,
    [rows],
  );

  const setResolution = (index: number, resolution: RowResolution) => {
    setRows((prev) =>
      prev ? prev.map((r) => (r.index === index ? { ...r, resolution } : r)) : prev,
    );
  };

  const statusChip = (r: ParsedRow) => {
    if (r.status === 'new') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sq-success-50 border border-sq-success-200 text-[9px] font-bold text-sq-success-700">
          <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />
          {t('csv.new')}
        </span>
      );
    }
    if (r.status === 'duplicate') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sq-warning-50 border border-sq-warning-500/30 text-[9px] font-bold text-amber-700">
          <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
          {t('csv.duplicate')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sq-danger-50 border border-sq-danger-500/30 text-[9px] font-bold text-sq-danger-700">
        <X className="w-2.5 h-2.5" aria-hidden="true" />
        {t('csv.error')}
      </span>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.18 }}
          onClick={onClose}
          dir={isAr ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <motion.div
            initial={reduce ? false : { scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.96, opacity: 0, y: 10 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('csv.title')}
            className="w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden font-cairo flex flex-col"
          >
            <header className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <span className="w-9 h-9 rounded-xl bg-sq-accent-50 flex items-center justify-center shrink-0">
                <FileUp className="w-4 h-4 text-sq-accent-600" aria-hidden="true" />
              </span>
              <h2 className="flex-1 text-sm font-bold text-sq-ink truncate">{t('csv.title')}</h2>
              <button
                type="button"
                onClick={() => downloadCsv('students_template.csv', templateCsv())}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
              >
                <Download className="w-3 h-3" aria-hidden="true" />
                {t('csv.template')}
              </button>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t('panel.close')}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {!rows ? (
                <>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      readFile(e.dataTransfer.files?.[0]);
                    }}
                    className={
                      dragOver
                        ? 'w-full rounded-2xl border-2 border-dashed border-sq-accent-500 bg-sq-accent-50 py-14 flex flex-col items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500'
                        : 'w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-14 flex flex-col items-center gap-2 transition-colors hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500'
                    }
                  >
                    <Upload
                      className={dragOver ? 'w-6 h-6 text-sq-accent-500' : 'w-6 h-6 text-slate-400'}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-bold text-slate-500">{t('csv.drop')}</span>
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      readFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  {fileError && (
                    <p className="mt-3 text-[11px] font-bold text-sq-danger-600 text-center" role="alert">
                      {fileError}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-xs font-bold text-sq-ink">{t('csv.preview')}</h3>
                    <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                      {fill(t('csv.summary'), summary)}
                    </span>
                  </div>

                  {rows.length === 0 ? (
                    <p className="py-10 text-center text-xs font-bold text-slate-400">
                      {t('csv.nothing')}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {rows.map((r) => (
                        <li
                          key={r.index}
                          className={
                            r.resolution === 'skip'
                              ? 'rounded-xl border border-slate-200 bg-slate-50 p-3 opacity-60'
                              : 'rounded-xl border border-slate-200 bg-white p-3'
                          }
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="shrink-0 mt-0.5">{statusChip(r)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-sq-ink truncate">
                                {r.raw.name || '—'}
                                {r.raw.nameEn ? ` · ${r.raw.nameEn}` : ''}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 truncate">
                                {r.raw.grade ? `${t('f.grade')} ${r.raw.grade}` : ''}
                                {r.raw.section ? ` · ${r.raw.section}` : ''}
                                {r.raw.loginEmail ? ` · ${r.raw.loginEmail}` : ''}
                              </p>
                              {r.errors.length > 0 && (
                                <p className="mt-1 text-[10px] font-bold text-sq-danger-600">
                                  {r.errors.map((e) => t(e)).join(' · ')}
                                </p>
                              )}
                              {r.duplicateOf && (
                                <p className="mt-1 text-[10px] font-bold text-amber-700 truncate">
                                  {t('dup.title')}: {isAr ? r.duplicateOf.name : r.duplicateOf.nameEn || r.duplicateOf.name}
                                </p>
                              )}
                            </div>

                            {r.status === 'duplicate' && (
                              <div className="shrink-0 flex rounded-lg border border-slate-200 overflow-hidden">
                                {(['skip', 'update'] as const).map((res) => (
                                  <button
                                    key={res}
                                    type="button"
                                    onClick={() => setResolution(r.index, res)}
                                    className={
                                      r.resolution === res
                                        ? 'px-2.5 py-1 text-[10px] font-bold bg-sq-accent-500 text-white'
                                        : 'px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50'
                                    }
                                  >
                                    {t(`csv.${res}`)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            {rows && (
              <footer className="shrink-0 flex gap-2 px-5 py-4 border-t border-slate-100">
                {/* Cancel closes, as users expect. Swapping the file is a
                    separate, explicitly-labelled action. */}
                <button
                  type="button"
                  onClick={() => setRows(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors shrink-0"
                >
                  {t('csv.another')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
                >
                  {t('panel.cancel')}
                </button>
                <button
                  type="button"
                  disabled={applyCount === 0}
                  onClick={() => onApply(rows)}
                  className="flex-1 rounded-xl bg-sq-accent-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
                >
                  {fill(t('csv.apply'), { n: applyCount })}
                </button>
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImportCsvDialog;
