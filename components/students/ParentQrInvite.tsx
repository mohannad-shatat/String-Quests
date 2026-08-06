/**
 * Parent invite via WhatsApp QR.
 *
 * IMPORTANT — the QR here is a **mock**. It draws a convincing QR silhouette
 * (finder patterns, timing rows, a deterministic module field) but encodes
 * nothing; scanning it will not open WhatsApp. It exists so the flow can be
 * demoed and reviewed. To make it real, render an actual encoder over
 * `buildInviteUrl()` below — that function already produces the correct
 * wa.me link, so only the pixels need replacing.
 *
 * The module field is derived from a seeded PRNG keyed on the student, so a
 * given student always draws the same pattern instead of flickering on every
 * render.
 */

import React, { useMemo } from 'react';
import { MessageCircle, Copy, Check, Maximize2 } from 'lucide-react';
import type { Locale } from './studentsI18n';

/** TODO: replace with String's real WhatsApp business number. */
export const STRING_WHATSAPP_NUMBER = '+962700000000';

/** The message the parent sends so we can link them to their child. */
export function buildInviteMessage(
  studentName: string,
  studentId: string,
  locale: Locale,
): string {
  const name = studentName.trim() || (locale === 'ar' ? '(اسم الطالب)' : '(student name)');
  const id = studentId.trim() || (locale === 'ar' ? '(الرقم الأكاديمي)' : '(student ID)');
  return locale === 'ar'
    ? `مرحبًا String، أرغب بربط حسابي كوليّ أمر بالطالب:\nالاسم: ${name}\nالرقم الأكاديمي: ${id}`
    : `Hello String, I'd like to link my parent account to this student:\nName: ${name}\nStudent ID: ${id}`;
}

export function buildInviteUrl(studentName: string, studentId: string, locale: Locale): string {
  const digits = STRING_WHATSAPP_NUMBER.replace(/\D+/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(
    buildInviteMessage(studentName, studentId, locale),
  )}`;
}

/* ─── Mock QR renderer ────────────────────────────────────────────────── */

const GRID = 29; // a real v3 QR is 29×29, so the density reads correctly
const QUIET = 2;

/** Deterministic PRNG (mulberry32) so the same seed always draws the same code. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** True for cells belonging to a finder pattern (the three big corner eyes). */
function inFinder(r: number, c: number): boolean {
  const corners = [
    [0, 0],
    [0, GRID - 7],
    [GRID - 7, 0],
  ];
  return corners.some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);
}

/** Finder + one cell of separator, where modules must not be drawn. */
function inFinderZone(r: number, c: number): boolean {
  const corners = [
    [0, 0],
    [0, GRID - 8],
    [GRID - 8, 0],
  ];
  return corners.some(([fr, fc]) => r >= fr - 1 && r < fr + 8 && c >= fc - 1 && c < fc + 8);
}

function inAlignment(r: number, c: number): boolean {
  const ar = GRID - 9;
  const ac = GRID - 9;
  return r >= ar && r < ar + 5 && c >= ac && c < ac + 5;
}

interface MockQrProps {
  /** Anything stable about the student — drives the pattern. */
  seed: string;
  size?: number;
  className?: string;
}

export const MockQrCode: React.FC<MockQrProps> = ({ seed, size = 190, className }) => {
  const cells = useMemo(() => {
    const rng = makeRng(hashString(seed || 'string-education'));
    const out: { r: number; c: number }[] = [];

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (inFinderZone(r, c) || inAlignment(r, c)) continue;
        // Timing patterns: the alternating row/column every real QR has.
        if (r === 6) {
          if (c % 2 === 0) out.push({ r, c });
          continue;
        }
        if (c === 6) {
          if (r % 2 === 0) out.push({ r, c });
          continue;
        }
        // Leave the middle clear for the logo.
        const mid = GRID / 2;
        if (Math.abs(r - mid) < 4.5 && Math.abs(c - mid) < 4.5) continue;
        if (rng() > 0.5) out.push({ r, c });
      }
    }
    return out;
  }, [seed]);

  const total = GRID + QUIET * 2;

  const Finder: React.FC<{ r: number; c: number }> = ({ r, c }) => (
    <>
      <rect x={c} y={r} width={7} height={7} rx={1.6} fill="currentColor" />
      <rect x={c + 1} y={r + 1} width={5} height={5} rx={1.1} fill="#fff" />
      <rect x={c + 2} y={r + 2} width={3} height={3} rx={0.7} fill="currentColor" />
    </>
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      className={className}
      role="img"
      aria-label="QR"
      shapeRendering="crispEdges"
    >
      <rect width={total} height={total} fill="#fff" rx={1.5} />
      <g transform={`translate(${QUIET}, ${QUIET})`} className="text-sq-ink">
        <Finder r={0} c={0} />
        <Finder r={0} c={GRID - 7} />
        <Finder r={GRID - 7} c={0} />

        {/* Alignment pattern */}
        <rect x={GRID - 9} y={GRID - 9} width={5} height={5} rx={1} fill="currentColor" />
        <rect x={GRID - 8} y={GRID - 8} width={3} height={3} rx={0.6} fill="#fff" />
        <rect x={GRID - 7} y={GRID - 7} width={1} height={1} fill="currentColor" />

        {cells.map(({ r, c }) => (
          <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} rx={0.22} fill="currentColor" />
        ))}
      </g>
    </svg>
  );
};

/* ─── The invite card ─────────────────────────────────────────────────── */

interface ParentQrInviteProps {
  studentName: string;
  studentId: string;
  locale: Locale;
  t: (key: string) => string;
  onCopyMessage: () => void;
  copied: boolean;
  onExpand: () => void;
}

export const ParentQrInvite: React.FC<ParentQrInviteProps> = ({
  studentName,
  studentId,
  locale,
  t,
  onCopyMessage,
  copied,
  onExpand,
}) => {
  const url = buildInviteUrl(studentName, studentId, locale);
  const steps = [t('qr.step1'), t('qr.step2'), t('qr.step3'), t('qr.step4')];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col sm:flex-row gap-5">
        {/* QR + logo */}
        <div className="shrink-0 mx-auto sm:mx-0">
          {/* The whole code is the expand target — a parent squinting at a
              190px code on someone else's laptop is the common case. */}
          <button
            type="button"
            onClick={onExpand}
            aria-label={t('qr.expand')}
            title={t('qr.expand')}
            className="group relative w-[190px] h-[190px] rounded-2xl bg-white border border-slate-200 p-2 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors hover:border-sq-accent-500"
          >
            <MockQrCode seed={studentId || studentName || 'string'} size={174} />
            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="w-[52px] h-[52px] rounded-xl bg-white flex items-center justify-center shadow-sm ring-1 ring-slate-200">
                <img src="/string-logo.svg" alt="" className="w-10 h-10" />
              </span>
            </span>
            <span className="absolute top-1 end-1 w-7 h-7 rounded-lg bg-sq-ink/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </button>
          <button
            type="button"
            onClick={onExpand}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-[10px] font-bold text-sq-accent-600 hover:text-sq-accent-700 font-cairo focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 rounded py-0.5"
          >
            <Maximize2 className="w-3 h-3" aria-hidden="true" />
            {t('qr.expand')}
          </button>
          <p className="mt-1 text-center text-[10px] font-bold text-slate-400 font-cairo">
            {t('qr.demoNote')}
          </p>
        </div>

        {/* Instructions */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-sq-ink font-cairo">{t('qr.title')}</h4>
          <p className="mt-1 text-[11px] font-bold text-slate-400 font-cairo leading-relaxed">
            {t('qr.subtitle')}
          </p>

          <ol className="mt-3 space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-px w-4 h-4 rounded-full bg-sq-accent-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                  {i + 1}
                </span>
                <span className="text-[11px] font-bold text-slate-600 font-cairo leading-relaxed">
                  {step}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sq-success-500 text-white text-[11px] font-bold font-cairo hover:bg-sq-success-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-success-500 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
              {t('qr.open')}
            </a>
            <button
              type="button"
              onClick={onCopyMessage}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-sq-ink font-cairo hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-sq-success-600" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {copied ? t('msg.copied') : t('qr.copyMessage')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentQrInvite;
