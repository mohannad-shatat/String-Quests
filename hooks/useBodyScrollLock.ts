/**
 * Freezes body scroll while `active` is true, restoring the previous value on
 * release.
 *
 * Extracted from the identical save-and-restore idiom hand-rolled in
 * components/parent-app/drawers/BottomSheet.tsx, .../skillmap/LearnMoreView.tsx
 * and .../skillmap/SubjectDetailScreen.tsx. Those callers are left untouched;
 * new code should use this.
 */

import { useEffect } from 'react';

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

export default useBodyScrollLock;
