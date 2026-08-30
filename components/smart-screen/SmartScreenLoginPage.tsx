/**
 * Smart Screen — teacher sign-in.
 *
 * This is the gate to the system: the first surface a teacher meets on the
 * classroom display, before classes, whiteboard, attendance, or exam mode
 * exist. It does exactly one job — get a teacher signed in — and nothing else.
 *
 * ─── Why it looks like String's web login ────────────────────────────────
 * Because it *is* String's login, on different glass. The split holds: the
 * sign-in side keeps the white ground, navy heading, soft-rounded fields and
 * pink primary; the brand side keeps the faint grid, the constellation, the
 * glyph tile, the testimonial and the trust chips. The structure maps almost
 * one-to-one — the QR plate takes the email field's slot, the manual code
 * takes the password field's, and the pink button stays where Log In was.
 *
 * The web login already offers three ways in: Email, Class Code, QR. A wall
 * can only really do one of them, so the tab row is kept and QR is locked
 * active — the other two stay visible so the screen reads as the same product,
 * and disabled so nobody stands there tapping a dead tab.
 *
 * ─── Why QR and not the password field ───────────────────────────────────
 * The teacher is two to four metres from a wall-mounted display in a room full
 * of students. There is no keyboard, and typing a password on a wall shows it
 * to thirty people. So the code goes on the wall, the teacher authenticates on
 * the phone already in their hand, and the screen unlocks. The phone is a key
 * and nothing more — every action after this is taken on the screen itself.
 *
 * ─── What is mocked ──────────────────────────────────────────────────────
 * There is no backend and no auth layer anywhere in this repo — this module
 * introduces the first one. The QR is `MockQrCode`, already used by the parent
 * invite flow: it draws a convincing QR silhouette but encodes nothing.
 * `pairing → authed` is driven by the state switcher, not by a timer, so the
 * screen never plays a demo at you; you choose what to look at.
 *
 * The one live behaviour is the sixty-second code rotation, because that is
 * real product behaviour rather than demo choreography — and because a code
 * that silently renews is the difference between a screen you trust and a
 * screen with a dead QR on it at eight in the morning.
 *
 * ─── Locale ──────────────────────────────────────────────────────────────
 * Language is local state, not `I18nContext`. Nobody is signed in yet, so
 * there is no account whose preference we could read; the app-wide context is
 * bound to `UserContext`, which holds a *student's* game state and has no
 * business being touched here. It opens in Arabic.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Moon,
  RefreshCw,
  ScanLine,
  Sun,
} from 'lucide-react';

import { MockQrCode } from '../students/ParentQrInvite';
import { makeT, fill, type Locale } from './smartScreenI18n';
import {
  RADIUS,
  SCREEN_THEMES,
  STRING_AZURE,
  STRING_PINK,
  WALL_TYPE,
  type ScreenTheme,
  type ScreenTokens,
} from './smartScreenTheme';

/* ─── Screen state ──────────────────────────────────────────────────────── */

type ScreenState = 'waiting' | 'pairing' | 'authed' | 'expired' | 'error';

const STATES: ScreenState[] = ['waiting', 'pairing', 'authed', 'expired', 'error'];

/** How long a sign-in code lives. Short on purpose — it is on a wall. */
const CODE_TTL_SECONDS = 60;

/** TODO: replace with the real screen registry once screens are provisioned. */
const SCREEN_ID = 'SQ-0142';

/** TODO: replace with the signed-in teacher from the real auth response. */
const MOCK_TEACHER = { ar: 'أ. رانية الخطيب', en: 'Ms. Rania Al-Khatib' };

/**
 * The human-readable pairing code, derived from the rotation index so a given
 * cycle always renders the same characters instead of flickering per render.
 * Ambiguous glyphs (0/O, 1/I) are excluded — this is read off a wall.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function codeForCycle(cycle: number): string {
  let a = (cycle * 2654435761 + 0x9e3779b9) >>> 0;
  let out = '';
  for (let i = 0; i < 6; i++) {
    a = (a ^ (a << 13)) >>> 0;
    a = (a ^ (a >>> 17)) >>> 0;
    a = (a ^ (a << 5)) >>> 0;
    out += ALPHABET[a % ALPHABET.length];
    if (i === 2) out += '-';
  }
  return out;
}

/* ─── Brand marks ───────────────────────────────────────────────────────── */

/** The String knot: two rounded squares, offset in rotation, one gradient stroke. */
const StringMark: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-label="String" role="img">
    <defs>
      <linearGradient id="sq-knot" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={STRING_PINK} />
        <stop offset="100%" stopColor={STRING_AZURE} />
      </linearGradient>
    </defs>
    {/* Four overlapping circles on a diamond — the lobed knot. Two rotated
        squircles was the obvious construction and the wrong one: at logo size
        they merge and the mark reads as a plain ring. */}
    <g fill="none" stroke="url(#sq-knot)" strokeWidth={2.2}>
      <circle cx={24} cy={14.5} r={9.5} />
      <circle cx={33.5} cy={24} r={9.5} />
      <circle cx={24} cy={33.5} r={9.5} />
      <circle cx={14.5} cy={24} r={9.5} />
    </g>
  </svg>
);

/** The command glyph from the brand tile. */
const CommandGlyph: React.FC<{ size?: number | string; color?: string }> = ({
  size = 44,
  color = STRING_PINK,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M9 3a3 3 0 1 0 0 6h6a3 3 0 1 0 0-6 3 3 0 0 0-3 3v12a3 3 0 1 0 3-3H9a3 3 0 1 0 3 3"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ─── Small pieces ──────────────────────────────────────────────────────── */

/** The ring that drains as the code ages. Peripheral, silent, non-alarming. */
const CodeTimer: React.FC<{ left: number; tokens: ScreenTokens }> = ({ left, tokens }) => {
  const r = 11;
  const circumference = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, left / CODE_TTL_SECONDS));
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx={14} cy={14} r={r} fill="none" stroke={tokens.fieldEdge} strokeWidth={2.4} />
      <circle
        cx={14}
        cy={14}
        r={r}
        fill="none"
        stroke={left <= 10 ? tokens.warn : tokens.primary}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        transform="rotate(-90 14 14)"
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 300ms ease' }}
      />
    </svg>
  );
};

/** Constellation on the brand side. Fixed coordinates — never random. */
const CONSTELLATION: { x: number; y: number; r: number; blue?: boolean }[] = [
  { x: 18, y: 14, r: 2.4 }, { x: 31, y: 9, r: 1.8, blue: true },
  { x: 9, y: 31, r: 2.1, blue: true }, { x: 26, y: 38, r: 1.6 },
  { x: 44, y: 20, r: 1.7, blue: true }, { x: 63, y: 12, r: 2.2 },
  { x: 78, y: 28, r: 1.9, blue: true }, { x: 88, y: 47, r: 2.3 },
  { x: 71, y: 61, r: 1.7, blue: true }, { x: 93, y: 72, r: 2 },
  { x: 12, y: 66, r: 1.8 }, { x: 34, y: 79, r: 2.1, blue: true },
  { x: 57, y: 88, r: 1.9 }, { x: 82, y: 91, r: 1.7, blue: true },
];

const LINKS: [number, number][] = [
  [0, 1], [0, 2], [2, 3], [1, 4], [4, 5], [5, 6], [6, 7], [7, 8], [7, 9], [10, 11], [11, 12], [12, 13],
];

const Constellation: React.FC<{ tokens: ScreenTokens }> = ({ tokens }) => (
  <svg
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
  >
    {LINKS.map(([a, b], i) => (
      <line
        key={i}
        x1={CONSTELLATION[a].x}
        y1={CONSTELLATION[a].y}
        x2={CONSTELLATION[b].x}
        y2={CONSTELLATION[b].y}
        stroke={tokens.grid}
        strokeWidth={0.18}
        vectorEffect="non-scaling-stroke"
      />
    ))}
    {CONSTELLATION.map((d, i) => (
      <circle
        key={i}
        cx={d.x}
        cy={d.y}
        r={d.r * 0.16}
        fill={d.blue ? tokens.dotBlue : tokens.dotPink}
      />
    ))}
  </svg>
);

/* ─── The screen ────────────────────────────────────────────────────────── */

interface SmartScreenLoginPageProps {
  /** Provided by the route so the screen can be left during a demo. */
  onExit?: () => void;
}

export const SmartScreenLoginPage: React.FC<SmartScreenLoginPageProps> = ({ onExit }) => {
  const [locale, setLocale] = useState<Locale>('ar');
  const [theme, setTheme] = useState<ScreenTheme>('light');
  const [state, setState] = useState<ScreenState>('waiting');
  const [cycle, setCycle] = useState(0);
  const [left, setLeft] = useState(CODE_TTL_SECONDS);

  const t = useMemo(() => makeT(locale), [locale]);
  const tokens = SCREEN_THEMES[theme];
  const rtl = locale === 'ar';
  const code = useMemo(() => codeForCycle(cycle), [cycle]);
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  /**
   * Code rotation. Only runs while a code is actually on display — pairing,
   * signed in, and the two failure states have no live code to age.
   */
  useEffect(() => {
    if (state !== 'waiting') return;
    setLeft(CODE_TTL_SECONDS);
    const id = window.setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) {
          setCycle(c => c + 1);
          return CODE_TTL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state, cycle]);

  const renew = useCallback(() => {
    setCycle(c => c + 1);
    setLeft(CODE_TTL_SECONDS);
    setState('waiting');
  }, []);

  /* ─── Copy per state ─────────────────────────────────────────────────── */

  const heading: Record<ScreenState, { title: string; sub: string }> = {
    waiting: { title: t('hero.title'), sub: t('hero.sub') },
    pairing: { title: t('pairing.title'), sub: t('pairing.sub') },
    authed: {
      title: fill(t('authed.title'), { name: MOCK_TEACHER[locale] }),
      sub: t('authed.sub'),
    },
    expired: { title: t('expired.title'), sub: t('expired.sub') },
    error: { title: t('error.title'), sub: t('error.sub') },
  };

  /* ─── The sign-in body, which is all that changes between states ─────── */

  const signInBody = (() => {
    if (state === 'authed') {
      return (
        <div style={{ display: 'grid', gap: '1.5em', justifyItems: 'center', padding: '1em 0' }}>
          <div
            style={{
              width: 'clamp(76px, 6vw, 116px)',
              height: 'clamp(76px, 6vw, 116px)',
              borderRadius: RADIUS.pill,
              display: 'grid',
              placeItems: 'center',
              background: `${tokens.ok}1A`,
              border: `2px solid ${tokens.ok}`,
            }}
          >
            <Check size="52%" color={tokens.ok} strokeWidth={3} />
          </div>
          <div style={{ display: 'grid', gap: '0.3em', textAlign: 'center' }}>
            <span style={{ fontSize: WALL_TYPE.sub, color: tokens.ink, fontWeight: 700 }}>
              {MOCK_TEACHER[locale]}
            </span>
            <span style={{ fontSize: WALL_TYPE.body, color: tokens.inkMuted }}>
              {t('authed.role')}
            </span>
          </div>
          <Loader2
            size={24}
            color={tokens.inkFaint}
            style={{ animation: 'sq-spin 1.1s linear infinite' }}
          />
        </div>
      );
    }

    if (state === 'expired' || state === 'error') {
      const bad = state === 'error';
      const accent = bad ? tokens.danger : tokens.warn;
      return (
        <div style={{ display: 'grid', gap: '1.6em', justifyItems: 'center', padding: '1em 0' }}>
          <div
            style={{
              width: 'clamp(76px, 6vw, 116px)',
              height: 'clamp(76px, 6vw, 116px)',
              borderRadius: RADIUS.pill,
              display: 'grid',
              placeItems: 'center',
              background: `${accent}1A`,
              border: `2px solid ${accent}`,
            }}
          >
            <AlertTriangle size="46%" color={accent} strokeWidth={2.4} />
          </div>
          <PrimaryButton tokens={tokens} onClick={renew}>
            <RefreshCw size="1.05em" />
            {bad ? t('error.action') : t('expired.action')}
          </PrimaryButton>
        </div>
      );
    }

    /* waiting + pairing — the code is on screen; pairing veils it. */
    return (
      <div style={{ display: 'grid', gap: '1.15em' }}>
        {/* Field 1 — where the email input sits on the web login. */}
        <div style={{ display: 'grid', gap: '0.5em' }}>
          <span style={{ fontSize: WALL_TYPE.label, fontWeight: 700, color: tokens.ink }}>
            {t('panel.title')}
          </span>
          <div
            style={{
              position: 'relative',
              justifySelf: 'center',
              width: '100%',
              display: 'grid',
              placeItems: 'center',
              padding: 'clamp(12px, 1.1vw, 22px)',
              borderRadius: RADIUS.field,
              background: tokens.qrPlate,
              border: `1px solid ${tokens.fieldEdge}`,
            }}
          >
            <div
              style={{
                width: 'clamp(150px, 13vw, 264px)',
                height: 'clamp(150px, 13vw, 264px)',
                filter: state === 'pairing' ? 'blur(5px)' : 'none',
                opacity: state === 'pairing' ? 0.3 : 1,
                transition: 'filter 260ms ease, opacity 260ms ease',
              }}
            >
              <MockQrCode
                seed={`smart-screen:${SCREEN_ID}:${code}`}
                size={264}
                className="w-full h-full"
              />
            </div>

            {state === 'pairing' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  alignContent: 'center',
                  gap: '0.8em',
                }}
              >
                <Loader2
                  size={38}
                  color={tokens.primary}
                  style={{ animation: 'sq-spin 1.1s linear infinite' }}
                />
                <span
                  style={{ fontSize: WALL_TYPE.body, color: '#182848', fontWeight: 600 }}
                >
                  {t('pairing.waiting')}
                </span>
              </div>
            )}
          </div>
          {state === 'waiting' && (
            <span style={{ fontSize: WALL_TYPE.micro, color: tokens.inkFaint }}>
              {t('panel.hint')}
            </span>
          )}
        </div>

        {state === 'waiting' ? (
          <>
            {/* Field 2 — where the password input sits on the web login. */}
            <div style={{ display: 'grid', gap: '0.5em' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: WALL_TYPE.label, fontWeight: 700, color: tokens.ink }}>
                  {t('code.label')}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45em',
                    fontSize: WALL_TYPE.micro,
                    color: tokens.inkFaint,
                  }}
                >
                  <CodeTimer left={left} tokens={tokens} />
                  {fill(t('code.renews'), { n: left })}
                </span>
              </div>
              <div
                style={{
                  padding: '0.55em 0.9em',
                  borderRadius: RADIUS.field,
                  background: tokens.fieldBg,
                  border: `1px solid ${tokens.fieldEdge}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5em',
                }}
              >
                <ScanLine size="1.4em" color={tokens.inkFaint} style={{ flexShrink: 0 }} />
                <span
                  dir="ltr"
                  style={{
                    fontSize: WALL_TYPE.code,
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: tokens.ink,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {code}
                </span>
              </div>
            </div>

            {/* Where Log In sits. */}
            <PrimaryButton tokens={tokens} onClick={renew}>
              {t('code.renewNow')}
              <Arrow size="1.05em" />
            </PrimaryButton>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setState('waiting')}
            style={{
              justifySelf: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: tokens.inkMuted,
              fontSize: WALL_TYPE.body,
              textDecoration: 'underline',
              textUnderlineOffset: '0.3em',
            }}
          >
            {t('pairing.cancel')}
          </button>
        )}
      </div>
    );
  })();

  /* ─── Layout ─────────────────────────────────────────────────────────── */

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="font-cairo"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        overflow: 'hidden',
        background: tokens.formBg,
        color: tokens.ink,
      }}
    >
      <style>{`@keyframes sq-spin { to { transform: rotate(360deg); } }`}</style>

      {/* ─── Sign-in side ───────────────────────────────────────────────── */}
      <aside
        style={{
          flex: '0 0 clamp(340px, 35%, 660px)',
          background: tokens.formBg,
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(20px, 2.2vw, 46px) clamp(24px, 2.6vw, 60px)',
          gap: '1em',
          overflow: 'hidden',
        }}
      >
        {/* Logo row — mark on one side, language on the other. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em' }}>
            <StringMark size={40} />
            <span style={{ fontSize: WALL_TYPE.logo, fontWeight: 800, color: tokens.ink }}>
              {t('brand.name')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLocale(rtl ? 'en' : 'ar')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: WALL_TYPE.sub,
              fontWeight: 700,
              color: tokens.inkMuted,
            }}
          >
            {rtl ? 'EN' : 'ع'}
          </button>
        </div>

        {/* The sign-in block, vertically centred like the web login. */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '1.5em',
          }}
        >
          <div style={{ display: 'grid', gap: '0.35em' }}>
            <h1
              style={{
                margin: 0,
                fontSize: WALL_TYPE.heading,
                fontWeight: 800,
                lineHeight: 1.15,
                color: tokens.ink,
                letterSpacing: rtl ? 0 : '-0.02em',
              }}
            >
              {heading[state].title}
            </h1>
            <p style={{ margin: 0, fontSize: WALL_TYPE.sub, color: tokens.inkMuted, lineHeight: 1.45 }}>
              {heading[state].sub}
            </p>
          </div>

          {signInBody}
        </div>

        {/* Tab row — the three ways into String. Only QR works on a wall. */}
        <div style={{ display: 'grid', gap: '0.7em', justifyItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px, 1.6vw, 34px)' }}>
            {(['email', 'classCode', 'qr'] as const).map(tab => {
              const active = tab === 'qr';
              return (
                <span
                  key={tab}
                  aria-disabled={!active}
                  style={{
                    fontSize: WALL_TYPE.body,
                    fontWeight: active ? 700 : 500,
                    color: active ? tokens.link : tokens.inkFaint,
                    paddingBottom: '0.3em',
                    borderBottom: `2px solid ${active ? tokens.link : 'transparent'}`,
                    cursor: active ? 'default' : 'not-allowed',
                  }}
                >
                  {t(`tab.${tab}`)}
                </span>
              );
            })}
          </div>
          <span style={{ fontSize: WALL_TYPE.micro, color: tokens.inkFaint, textAlign: 'center' }}>
            {t('tab.note')}
          </span>
          <span style={{ fontSize: WALL_TYPE.micro, color: tokens.inkFaint }}>
            {fill(t('footer.screen'), { id: SCREEN_ID })} · {t('footer.unassigned')}
          </span>
        </div>
      </aside>

      {/* ─── Brand side ─────────────────────────────────────────────────── */}
      <section
        style={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
          background: tokens.brandBg,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 'clamp(20px, 2.4vw, 48px)',
          padding: 'clamp(28px, 4vw, 96px)',
          overflow: 'hidden',
        }}
      >
        {/* Grid rules. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `linear-gradient(${tokens.grid} 1px, transparent 1px), linear-gradient(90deg, ${tokens.grid} 1px, transparent 1px)`,
            backgroundSize: 'clamp(48px, 4.4vw, 96px) clamp(48px, 4.4vw, 96px)',
            pointerEvents: 'none',
          }}
        />
        <Constellation tokens={tokens} />

        <div style={{ position: 'relative', display: 'grid', gap: 'clamp(18px, 2vw, 40px)', maxWidth: '20ch' }}>
          <div
            style={{
              width: 'clamp(56px, 4.6vw, 96px)',
              height: 'clamp(56px, 4.6vw, 96px)',
              borderRadius: RADIUS.tile,
              background: tokens.card,
              border: `1px solid ${tokens.cardEdge}`,
              boxShadow: tokens.cardShadow,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <CommandGlyph size="52%" color={tokens.primary} />
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: WALL_TYPE.hero,
              fontWeight: 800,
              lineHeight: 1.08,
              color: tokens.ink,
              letterSpacing: rtl ? 0 : '-0.03em',
            }}
          >
            {t('brand.tagline')}
          </h2>
        </div>

        {/* Testimonial. */}
        <div
          style={{
            position: 'relative',
            maxWidth: '46ch',
            padding: 'clamp(18px, 1.8vw, 38px)',
            borderRadius: RADIUS.card,
            background: tokens.card,
            border: `1px solid ${tokens.cardEdge}`,
            boxShadow: tokens.cardShadow,
            display: 'grid',
            gap: '0.9em',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8em' }}>
            <span
              style={{
                width: 'clamp(38px, 3vw, 62px)',
                height: 'clamp(38px, 3vw, 62px)',
                borderRadius: RADIUS.pill,
                border: `2px solid ${tokens.primary}`,
                display: 'grid',
                placeItems: 'center',
                fontSize: WALL_TYPE.label,
                fontWeight: 800,
                color: tokens.primary,
                flexShrink: 0,
              }}
            >
              {rtl ? 'ج ك' : 'JK'}
            </span>
            <div style={{ display: 'grid', gap: '0.15em' }}>
              <span
                style={{
                  fontSize: WALL_TYPE.sub,
                  fontWeight: 800,
                  color: tokens.ink,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4em',
                }}
              >
                {t('quote.name')}
                <Check size="0.8em" color={tokens.link} strokeWidth={4} />
              </span>
              <span style={{ fontSize: WALL_TYPE.body, color: tokens.inkMuted }}>
                {t('quote.role')}
              </span>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: WALL_TYPE.quote, lineHeight: 1.6, color: tokens.ink }}>
            {t('quote.text')}
          </p>
        </div>

        {/* Trust chips. */}
        <div style={{ position: 'relative', display: 'flex', gap: '0.8em', flexWrap: 'wrap' }}>
          {[
            { key: 'trust.uptime', dot: true },
            { key: 'trust.soc2', dot: false },
          ].map(({ key, dot }) => (
            <span
              key={key}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6em',
                padding: '0.55em 1.1em',
                borderRadius: RADIUS.pill,
                background: tokens.card,
                border: `1px solid ${tokens.cardEdge}`,
                fontSize: WALL_TYPE.body,
                color: tokens.ink,
                fontWeight: 600,
              }}
            >
              {dot ? (
                <span
                  style={{
                    width: '0.55em',
                    height: '0.55em',
                    borderRadius: RADIUS.pill,
                    background: tokens.primary,
                  }}
                />
              ) : (
                <CommandGlyph size="1.1em" color={tokens.ink} />
              )}
              {t(key)}
            </span>
          ))}
        </div>

        {/* Preview controls. Demo chrome — delete once the design is settled. */}
        <div
          style={{
            position: 'absolute',
            insetInlineEnd: 'clamp(16px, 2vw, 40px)',
            bottom: 'clamp(14px, 1.6vw, 30px)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4em',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          {STATES.map(s => (
            <MiniPill key={s} tokens={tokens} active={state === s} onClick={() => setState(s)}>
              {t(`state.${s}`)}
            </MiniPill>
          ))}
          <MiniPill tokens={tokens} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <Moon size="1.1em" /> : <Sun size="1.1em" />}
            {theme === 'light' ? t('dev.theme.dark') : t('dev.theme.light')}
          </MiniPill>
          {onExit && (
            <MiniPill tokens={tokens} onClick={onExit}>
              {rtl ? 'خروج' : 'Exit'}
            </MiniPill>
          )}
        </div>
      </section>
    </div>
  );
};

/* ─── Buttons ───────────────────────────────────────────────────────────── */

const PrimaryButton: React.FC<{
  tokens: ScreenTokens;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ tokens, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: '100%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.6em',
      padding: '0.85em 1.4em',
      borderRadius: RADIUS.field,
      border: 'none',
      cursor: 'pointer',
      background: tokens.primary,
      color: tokens.primaryInk,
      boxShadow: tokens.primaryShadow,
      fontSize: WALL_TYPE.sub,
      fontWeight: 700,
      fontFamily: 'inherit',
      transition: 'background 160ms ease, transform 160ms ease',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = tokens.primaryDeep;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = tokens.primary;
    }}
  >
    {children}
  </button>
);

const MiniPill: React.FC<{
  tokens: ScreenTokens;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ tokens, active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4em',
      padding: '0.45em 0.85em',
      borderRadius: RADIUS.pill,
      cursor: 'pointer',
      fontSize: WALL_TYPE.micro,
      fontFamily: 'inherit',
      lineHeight: 1,
      transition: 'all 150ms ease',
      background: active ? tokens.primary : tokens.card,
      border: `1px solid ${active ? tokens.primary : tokens.cardEdge}`,
      color: active ? tokens.primaryInk : tokens.inkMuted,
    }}
  >
    {children}
  </button>
);

export default SmartScreenLoginPage;
