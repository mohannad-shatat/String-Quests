/**
 * Printable access card — A5 portrait, one person per sheet.
 *
 * Carries the String logo, the holder's name and String ID, a login QR, and
 * the steps to sign in. Handed to a student or teacher on paper, which is
 * still how a school distributes credentials.
 *
 * Print plumbing follows components/proposal/MabadiProposal.tsx (`@page`
 * sizing, a screen "desk" behind the sheet) and the `print:hidden` vocabulary
 * already used across admin-hub/attendance/AttendanceReport.tsx.
 *
 * The QR is the same labelled mock as the parent invite — it draws a
 * convincing code but encodes nothing. See ParentQrInvite.tsx.
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, School, X } from 'lucide-react';
import { MockQrCode } from '../students/ParentQrInvite';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import type { Locale, Translate } from './directoryI18n';

/** Where the card tells people to sign in. */
export const STRING_DOMAIN = 'string.education';

/**
 * School branding on the card. Swap `logoUrl` for the school's own asset —
 * it's left blank by default so the placeholder is visibly a placeholder
 * rather than silently shipping the wrong school's mark.
 */
export interface SchoolBrand {
  nameAr: string;
  nameEn: string;
  logoUrl?: string;
}

export const DEFAULT_SCHOOL: SchoolBrand = {
  nameAr: 'مدارس الخضر الحديثة',
  nameEn: 'Al-Khadr Modern Schools',
};

export interface AccessCardHolder {
  id: string;
  name: string;
  nameEn: string;
  /** The permanent String ID. */
  stringId: string;
  loginEmail: string;
  password: string;
  /** Free-text line under the name, e.g. "Grade 3 · A" or "Math · Grades 1-3". */
  subtitle: string;
  photoDataUrl?: string;
}

/** Injected once while the overlay is open; scoped so it can't leak. */
const PRINT_CSS = `
  @page { size: A5 portrait; margin: 0; }
  @media print {
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    body > *:not(.sq-card-print-root) { display: none !important; }
    .sq-card-print-root { position: static !important; inset: auto !important; background: #fff !important; }
    .sq-card-print-root .sq-card-chrome { display: none !important; }
    .sq-card-print-root .sq-card-scroll { overflow: visible !important; padding: 0 !important; }
    .sq-card-sheet {
      width: 148mm !important; height: 210mm !important;
      margin: 0 !important; box-shadow: none !important; border: none !important;
      border-radius: 0 !important; break-after: page; page-break-after: always;
    }
    .sq-card-sheet:last-child { break-after: auto; page-break-after: auto; }
  }
`;

const Sheet: React.FC<{
  holder: AccessCardHolder;
  school: SchoolBrand;
  locale: Locale;
  t: Translate;
}> = ({ holder, school, locale, t }) => {
  const isAr = locale === 'ar';
  const name = isAr ? holder.name : holder.nameEn || holder.name;
  const schoolName = isAr ? school.nameAr : school.nameEn;
  const steps = [t('card.step1'), t('card.step2'), t('card.step3')];

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="sq-card-sheet bg-white mx-auto shadow-lg border border-slate-200 flex flex-col font-cairo"
      style={{ width: '148mm', height: '210mm', padding: '14mm' }}
    >
      {/* Masthead — String on one side, the school on the other. */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <img src="/string-logo.svg" alt="" className="w-10 h-10 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-sq-ink leading-tight">String</p>
          <p dir="ltr" className="text-[10px] font-bold text-sq-accent-600">
            {STRING_DOMAIN}
          </p>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[10px] font-bold text-slate-500 text-end truncate max-w-[38mm]">
            {schoolName}
          </p>
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="" className="w-10 h-10 object-contain shrink-0" />
          ) : (
            /* Placeholder, deliberately visible — drop the school's mark in
               via SchoolBrand.logoUrl. */
            <span className="w-10 h-10 rounded-lg border border-dashed border-slate-300 flex items-center justify-center shrink-0">
              <School className="w-4 h-4 text-slate-300" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>

      <p className="pt-2 text-[10px] font-bold text-slate-400">{t('card.subtitle')}</p>

      {/* Holder */}
      <div className="flex items-center gap-4 py-5">
        {holder.photoDataUrl ? (
          <img
            src={holder.photoDataUrl}
            alt=""
            className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
          />
        ) : (
          <span className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-sq-ink truncate">{name}</p>
          <p className="text-[11px] font-bold text-slate-400 truncate">{holder.subtitle}</p>
        </div>
      </div>

      {/* String ID — the thing they'll be asked for */}
      <div className="rounded-2xl bg-sq-accent-50 border border-sq-accent-200 px-4 py-3">
        <p className="text-[10px] font-bold text-sq-accent-700 uppercase tracking-wide">
          {t('f.stringId')}
        </p>
        <p dir="ltr" className="font-mono text-xl font-bold text-sq-ink tracking-wide">
          {holder.stringId || '—'}
        </p>
      </div>

      {/* QR + steps */}
      <div className="flex items-start gap-4 py-5">
        <div className="shrink-0 rounded-xl border border-slate-200 p-2 bg-white">
          <MockQrCode seed={holder.stringId || holder.id} size={112} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-sq-ink mb-1.5">{t('card.howTo')}</p>
          <ol className="space-y-1">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-px w-3.5 h-3.5 rounded-full bg-sq-accent-500 text-white text-[8px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                  {i + 1}
                </span>
                <span className="text-[10px] font-bold text-slate-500 leading-snug">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Credentials */}
      <div className="rounded-2xl border border-slate-200 px-4 py-3 space-y-1.5">
        <div>
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">
            {t('f.loginEmail')}
          </span>
          <span dir="ltr" className="block text-[11px] font-bold text-sq-ink truncate">
            {holder.loginEmail || '—'}
          </span>
        </div>
        <div>
          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">
            {t('f.password')}
          </span>
          <span dir="ltr" className="block font-mono text-sm font-bold text-sq-ink tracking-wide">
            {holder.password || '—'}
          </span>
        </div>
      </div>

      <div className="flex-1" />

      <p className="text-center text-[9px] font-bold text-slate-300 pt-3 border-t border-slate-100">
        {t('card.footer')}
      </p>
    </div>
  );
};

interface AccessCardOverlayProps {
  open: boolean;
  holders: AccessCardHolder[];
  /** Defaults to DEFAULT_SCHOOL; pass the real brand once it exists. */
  school?: SchoolBrand;
  locale: Locale;
  t: Translate;
  onClose: () => void;
}

export const AccessCardOverlay: React.FC<AccessCardOverlayProps> = ({
  open,
  holders,
  school = DEFAULT_SCHOOL,
  locale,
  t,
  onClose,
}) => {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="sq-card-print-root fixed inset-0 z-[170] bg-slate-200 flex flex-col font-cairo">
      <style>{PRINT_CSS}</style>

      <header className="sq-card-chrome shrink-0 flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('panel.close')}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-sq-ink truncate">{t('card.title')}</h2>
          <p className="text-[11px] font-bold text-slate-400">
            {holders.length} {t('card.sheets')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sq-accent-500 text-white text-xs font-bold shadow-sm shadow-pink-500/30 hover:bg-sq-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" aria-hidden="true" />
          {t('card.print')}
        </button>
      </header>

      <div className="sq-card-scroll flex-1 overflow-y-auto p-6 space-y-6">
        {holders.map((h) => (
          <Sheet key={h.id} holder={h} school={school} locale={locale} t={t} />
        ))}
      </div>
    </div>,
    document.body,
  );
};

export default AccessCardOverlay;
