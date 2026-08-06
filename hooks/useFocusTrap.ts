/**
 * Keeps Tab focus inside `ref` while `active`, and restores focus to whatever
 * was focused before activation on release.
 *
 * Net-new for the repo — no existing overlay traps focus. Deliberately small:
 * it re-queries focusable children on every Tab rather than caching, so it
 * stays correct as the panel's content changes (sections mount, errors appear)
 * without needing a MutationObserver.
 */

import { useEffect, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface Options {
  /** Focus this element on activation instead of the first focusable child. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Delay before the initial focus, to avoid fighting an enter animation. */
  focusDelayMs?: number;
}

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  { initialFocusRef, focusDelayMs = 80 }: Options = {},
): void {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusTimer = window.setTimeout(() => {
      const target =
        initialFocusRef?.current ??
        (container.querySelector(FOCUSABLE) as HTMLElement | null) ??
        container;
      target.focus();
    }, focusDelayMs);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      // Explicit cast: supplying a type arg to querySelectorAll picks the
      // tag-name overload, which resolves HTMLElement to `unknown`.
      const all = Array.from(container.querySelectorAll(FOCUSABLE)) as HTMLElement[];
      const nodes = all.filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement as HTMLElement | null;

      // Focus escaped the container entirely (e.g. it was removed) — pull back.
      if (!current || !container.contains(current)) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      // Only restore if focus is still inside us — otherwise the user has
      // already moved on and yanking it back would be hostile.
      const container2 = ref.current;
      const active2 = document.activeElement as HTMLElement | null;
      if (previouslyFocused && (!active2 || !container2 || container2.contains(active2))) {
        previouslyFocused.focus?.();
      }
    };
  }, [ref, active, initialFocusRef, focusDelayMs]);
}

export default useFocusTrap;
