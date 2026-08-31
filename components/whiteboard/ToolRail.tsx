import React from 'react';
import { motion } from 'framer-motion';
import {
  MousePointer2,
  Pen,
  Highlighter,
  Eraser,
  Shapes,
  Type,
  StickyNote,
} from 'lucide-react';
import { useBoardCopy, type BoardCopyKey } from './copy';
import { marker, EASE } from './tokens';

const TOOLS: { id: string; label: BoardCopyKey; Icon: typeof Pen; tint?: string }[] = [
  { id: 'select', label: 'tool.select', Icon: MousePointer2 },
  { id: 'pen', label: 'tool.pen', Icon: Pen, tint: marker.pink },
  { id: 'highlighter', label: 'tool.highlighter', Icon: Highlighter, tint: marker.amber },
  { id: 'eraser', label: 'tool.eraser', Icon: Eraser },
  { id: 'shapes', label: 'tool.shapes', Icon: Shapes },
  { id: 'text', label: 'tool.text', Icon: Type },
  { id: 'note', label: 'tool.note', Icon: StickyNote, tint: marker.cyan },
];

interface ToolRailProps {
  /** Currently held tool. Presentational on the login screen. */
  active?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

/**
 * The board's tool rail. It appears on the login screen as a preview of the
 * product — interactive, but with no canvas behind it yet — and is the same
 * component the board itself will mount.
 */
export const ToolRail: React.FC<ToolRailProps> = ({
  active = 'pen',
  onSelect,
  className = '',
}) => {
  const { t } = useBoardCopy();

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.45, ease: EASE }}
      className={`flex flex-col gap-1 rounded-3xl border border-white/70 bg-white/80 p-2 shadow-[0_8px_30px_rgba(9,30,66,0.08)] ring-1 ring-slate-900/5 backdrop-blur-md ${className}`}
    >
      {TOOLS.map(({ id, label, Icon, tint }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            title={t(label)}
            aria-label={t(label)}
            aria-pressed={isActive}
            onClick={() => onSelect?.(id)}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-[#08b8fb]/25 ${
              isActive
                ? 'bg-[#091e42] text-white shadow-md'
                : 'text-[#6882a9] hover:bg-slate-100 hover:text-[#091e42]'
            }`}
          >
            <Icon
              className="h-5 w-5"
              style={!isActive && tint ? { color: tint } : undefined}
            />
          </button>
        );
      })}
    </motion.div>
  );
};
