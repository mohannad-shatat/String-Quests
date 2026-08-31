/**
 * Design tokens for the Whiteboard module.
 *
 * The core palette is inherited from the String platform shell so the board
 * reads as part of the same product. Everything else — the dot grid, the ink
 * colours, the tool rail — belongs to this module only.
 *
 * Kept as plain constants rather than Tailwind theme keys so the whole folder
 * can be lifted into the standalone APK build without the quiz app's config.
 */
export const board = {
  ink: '#091e42',
  muted: '#6882a9',
  accent: '#08b8fb',
  primary: '#ed3b91',
  primaryDark: '#d6257a',
  surface: '#f8fafc',
  line: '#e2e8f0',
} as const;

/** Marker colours available on the board — also used for the login backdrop. */
export const marker = {
  cyan: '#08b8fb',
  pink: '#ed3b91',
  amber: '#f59e0b',
  violet: '#8243ea',
} as const;

/** Shared entry easing (a soft overshoot-free decelerate). */
export const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
