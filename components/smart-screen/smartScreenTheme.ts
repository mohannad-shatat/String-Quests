/**
 * Smart Screen — the skin, in one file.
 *
 * These values are lifted from String's existing web login (the split screen:
 * white form on one side, grid-and-constellation brand panel on the other).
 * The classroom screen is the *same product*, so it wears the same clothes —
 * navy type, pink primary, azure links, faint grid, soft rounded cards.
 *
 * Everything visual lives here as plain values rather than Tailwind classes,
 * for two reasons:
 *
 *  1. **Reversibility.** Re-skinning is a one-file change; no component is
 *     touched.
 *  2. **The JIT.** This repo already carries a long `safelist` because
 *     dynamically-built Tailwind class names get dropped at build time.
 *     Tokens as values sidestep that entirely.
 *
 * `light` is the real String login, scaled to a wall. `dark` is the same brand
 * inverted for a bright classroom — a wall-sized white rectangle under
 * fluorescent light is genuinely hard to look at for forty minutes. Judge both
 * on the actual glass, then delete the one that loses.
 */

export type ScreenTheme = 'light' | 'dark';

/* ─── Brand constants ───────────────────────────────────────────────────── */

/** String pink — the primary action colour. */
export const STRING_PINK = '#ED3B91';
export const STRING_PINK_DEEP = '#D62F80';
/** String navy — all headline and body type on light grounds. */
export const STRING_NAVY = '#182848';
/** Azure. Reserved: links, the active tab underline, verification ticks. */
export const STRING_AZURE = '#0EA5E9';

export interface ScreenTokens {
  /** The sign-in side — white in the real login. */
  formBg: string;
  /** The brand side — faint grey with the grid over it. */
  brandBg: string;
  /** Grid rule colour on the brand side. */
  grid: string;
  /** Cards: the testimonial, the glyph tile, the QR plate. */
  card: string;
  cardEdge: string;
  cardShadow: string;
  /** Type. */
  ink: string;
  inkMuted: string;
  inkFaint: string;
  /** Input / QR plate chrome — the rounded field look from the login. */
  fieldBg: string;
  fieldEdge: string;
  /** Actions. */
  primary: string;
  primaryDeep: string;
  primaryInk: string;
  primaryShadow: string;
  link: string;
  /** Status. */
  ok: string;
  warn: string;
  danger: string;
  /** The plate QR modules are drawn on. Always near-white — a scanner needs
   *  the contrast, so this is a function, not a taste. */
  qrPlate: string;
  /** Constellation dots on the brand side. */
  dotPink: string;
  dotBlue: string;
}

export const SCREEN_THEMES: Record<ScreenTheme, ScreenTokens> = {
  light: {
    formBg: '#FFFFFF',
    brandBg: '#F7F9FC',
    grid: 'rgba(24,40,72,0.045)',
    card: '#FFFFFF',
    cardEdge: '#EDF1F7',
    cardShadow: '0 24px 60px -32px rgba(24,40,72,0.22)',
    ink: STRING_NAVY,
    inkMuted: '#64748B',
    inkFaint: '#94A3B8',
    fieldBg: '#FFFFFF',
    fieldEdge: '#E6EBF2',
    primary: STRING_PINK,
    primaryDeep: STRING_PINK_DEEP,
    primaryInk: '#FFFFFF',
    primaryShadow: '0 14px 30px -12px rgba(237,59,145,0.5)',
    link: STRING_AZURE,
    ok: '#10B981',
    warn: '#F59E0B',
    danger: '#F43F5E',
    qrPlate: '#FFFFFF',
    dotPink: 'rgba(237,59,145,0.5)',
    dotBlue: 'rgba(14,165,233,0.45)',
  },
  dark: {
    formBg: '#0E1830',
    brandBg: '#0A1226',
    grid: 'rgba(255,255,255,0.045)',
    card: 'rgba(255,255,255,0.045)',
    cardEdge: 'rgba(255,255,255,0.10)',
    cardShadow: '0 40px 110px -50px rgba(0,0,0,0.9)',
    ink: '#F8FAFC',
    inkMuted: '#9FADC6',
    inkFaint: '#5D6C88',
    fieldBg: 'rgba(255,255,255,0.05)',
    fieldEdge: 'rgba(255,255,255,0.12)',
    primary: STRING_PINK,
    primaryDeep: STRING_PINK_DEEP,
    primaryInk: '#FFFFFF',
    primaryShadow: '0 14px 34px -12px rgba(237,59,145,0.55)',
    link: '#38BDF8',
    ok: '#34D399',
    warn: '#FBBF24',
    danger: '#FB7185',
    qrPlate: '#FFFFFF',
    dotPink: 'rgba(237,59,145,0.55)',
    dotBlue: 'rgba(56,189,248,0.5)',
  },
};

/**
 * Type scale for a wall.
 *
 * A classroom screen is read from two to eight metres, and the same build has
 * to survive a 43" TV and a 98" panel. Every size is a `clamp()` against the
 * viewport rather than a fixed rem, so the screen scales with the glass
 * instead of with a browser font setting nobody will ever change.
 *
 * The ratios match the web login — hero roughly 2.4× the sign-in heading —
 * so the two surfaces read as one family at very different sizes.
 */
export const WALL_TYPE = {
  logo: 'clamp(15px, 1.05vw, 22px)',
  heading: 'clamp(28px, 2.5vw, 54px)',
  hero: 'clamp(34px, 3.5vw, 76px)',
  sub: 'clamp(14px, 1.05vw, 23px)',
  label: 'clamp(12px, 0.82vw, 17px)',
  body: 'clamp(13px, 0.95vw, 20px)',
  quote: 'clamp(14px, 1.1vw, 24px)',
  code: 'clamp(24px, 2.3vw, 48px)',
  micro: 'clamp(11px, 0.72vw, 15px)',
} as const;

/** Corner radii, matching the login's soft-rounded field and card language. */
export const RADIUS = {
  field: 14,
  card: 22,
  tile: 20,
  pill: 999,
} as const;
