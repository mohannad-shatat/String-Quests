/**
 * Discoverability strip for keyboard shortcuts.
 *
 * The ⌘K badge in the search field tells you one shortcut exists; this tells
 * you the rest. Pinned low and quiet so it reads as a footnote rather than
 * chrome, and dismissible — once you know them, it's noise.
 */

import React, { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import type { Locale, Translate } from './directoryI18n';

const DISMISS_KEY = 'string-quests-shortcuts-dismissed';

export interface ShortcutHint {
  /** Rendered in a key cap, e.g. '⌘K' or 'Esc'. */
  keys: string;
  labelKey: string;
}

export function loadShortcutsDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

interface ShortcutsBarProps {
  shortcuts: ShortcutHint[];
  locale: Locale;
  t: Translate;
}

export const ShortcutsBar: React.FC<ShortcutsBarProps> = ({ shortcuts, locale, t }) => {
  const [dismissed, setDismissed] = useState(loadShortcutsDismissed);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* a convenience, not worth failing over */
    }
  }, []);

  if (dismissed) return null;

  return (
    <div
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2.5 font-cairo print:hidden"
    >
      {shortcuts.map((s) => (
        <span key={s.keys} className="inline-flex items-center gap-1.5">
          <kbd
            dir="ltr"
            className="px-1.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 font-mono"
          >
            {s.keys}
          </kbd>
          <span className="text-[10px] font-bold text-slate-400">{t(s.labelKey)}</span>
        </span>
      ))}

      <button
        type="button"
        onClick={dismiss}
        aria-label={t('shortcuts.dismiss')}
        title={t('shortcuts.dismiss')}
        className="p-1 rounded text-slate-300 hover:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export default ShortcutsBar;
