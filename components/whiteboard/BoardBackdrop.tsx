import React from 'react';
import { motion } from 'framer-motion';
import { marker, EASE } from './tokens';

interface Stroke {
  d: string;
  color: string;
  width: number;
  delay: number;
  opacity: number;
}

/**
 * A few marker strokes that draw themselves on load — the board showing what
 * it is before the user has typed anything. Coordinates live in a 1200x800
 * space and are slice-cropped, so they stay readable on a phone.
 */
const STROKES: Stroke[] = [
  {
    d: 'M-60 612 C 170 512, 268 700, 438 596 S 706 462, 908 556 S 1140 686, 1268 592',
    color: marker.cyan,
    width: 12,
    delay: 0.15,
    opacity: 0.45,
  },
  {
    d: 'M118 236 C 262 168, 424 314, 618 228',
    color: marker.pink,
    width: 9,
    delay: 0.35,
    opacity: 0.4,
  },
  {
    d: 'M842 182 C 936 122, 1058 170, 1042 262 C 1026 356, 882 372, 836 300 C 802 246, 834 196, 886 180',
    color: marker.amber,
    width: 7,
    delay: 0.5,
    opacity: 0.4,
  },
  {
    d: 'M286 424 C 340 452, 372 462, 424 470',
    color: marker.violet,
    width: 6,
    delay: 0.7,
    opacity: 0.35,
  },
  {
    d: 'M424 470 L 390 440 M 424 470 L 388 490',
    color: marker.violet,
    width: 6,
    delay: 0.85,
    opacity: 0.35,
  },
];

/** Two sticky notes, parked off to the side like someone left them there. */
const NOTES = [
  { x: 92, y: 470, r: -7, fill: '#fef3c7', delay: 0.55 },
  { x: 968, y: 430, r: 6, fill: '#dbeafe', delay: 0.7 },
];

export const BoardBackdrop: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-[#f8fafc]" />

    {/* Dot grid — the board's own surface, not a UI grid. */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />

    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      {NOTES.map((n, i) => (
        <motion.rect
          key={`note-${i}`}
          x={n.x}
          y={n.y}
          width={132}
          height={124}
          rx={8}
          fill={n.fill}
          transform={`rotate(${n.r} ${n.x + 66} ${n.y + 62})`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 0.75, scale: 1 }}
          transition={{ duration: 0.6, delay: n.delay, ease: EASE }}
          style={{ transformOrigin: 'center' }}
        />
      ))}

      {STROKES.map((s, i) => (
        <motion.path
          key={`stroke-${i}`}
          d={s.d}
          stroke={s.color}
          strokeWidth={s.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={s.opacity}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, delay: s.delay, ease: EASE }}
        />
      ))}
    </svg>

    {/* Wash the ink back so form text always wins on contrast. */}
    <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/45 to-white/85" />

    {/* Faint paper tooth. */}
    <div
      className="absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  </div>
);
