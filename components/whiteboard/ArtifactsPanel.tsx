import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { useBoardCopy } from './copy';
import { ARTIFACTS, type Artifact } from './artifacts';

interface ArtifactsPanelProps {
  selectedId?: string | null;
  onSelect?: (artifact: Artifact) => void;
  className?: string;
}

/**
 * A floating launcher for the lesson's artifacts, styled after a phone edge
 * panel: a dark translucent slab of squircle tiles that sits over the board
 * rather than taking a column away from it.
 *
 * Tiles are icon-only, as on a launcher; each carries its name as a tooltip and
 * as its accessible label, and the selected one is named along the bottom.
 */
export const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({
  selectedId,
  onSelect,
  className = '',
}) => {
  const { t, locale } = useBoardCopy();
  const selected = ARTIFACTS.find((a) => a.id === selectedId);

  return (
    <div
      className={`flex max-h-full flex-col gap-4 overflow-y-auto rounded-[28px] border border-white/10 bg-[#2b303b]/80 p-3.5 shadow-[0_20px_60px_rgba(9,30,66,0.35)] backdrop-blur-xl ${className}`}
    >
      <div className="flex flex-col gap-3">
        {ARTIFACTS.map(({ id, label, Icon, from, to }) => {
          const isSelected = id === selectedId;
          return (
            <button
              key={id}
              type="button"
              title={label[locale]}
              aria-label={label[locale]}
              aria-pressed={isSelected}
              onClick={() => {
                const artifact = ARTIFACTS.find((a) => a.id === id);
                if (artifact) onSelect?.(artifact);
              }}
              className="group flex h-[60px] w-[60px] items-center justify-center rounded-[30%] shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 focus-visible:outline-none"
              style={{
                backgroundImage: `linear-gradient(145deg, ${from}, ${to})`,
                boxShadow: isSelected
                  ? `0 0 0 3px rgba(255,255,255,0.85), 0 10px 24px ${to}66`
                  : `0 8px 18px rgba(0,0,0,0.28)`,
              }}
            >
              <Icon className="h-7 w-7 text-white" strokeWidth={2} />
            </button>
          );
        })}
      </div>

      {/* Dotted rule, as on the panel this borrows from */}
      <div
        aria-hidden
        className="h-px w-full shrink-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.45) 1px, transparent 1px)',
          backgroundSize: '6px 1px',
          backgroundRepeat: 'repeat-x',
        }}
      />

      <div
        className="flex shrink-0 items-center justify-center pb-0.5"
        title={selected ? selected.label[locale] : t('artifacts.hint')}
      >
        <LayoutGrid className="h-4 w-4 text-white/45" />
      </div>
    </div>
  );
};
