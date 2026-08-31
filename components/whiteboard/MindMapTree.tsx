import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronLeft, Sparkles, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useBoardCopy } from './copy';
import type { MindNode } from './content/types';
import { EASE } from './tokens';

interface Picked {
  path: string;
  node: MindNode;
  depth: number;
}

/**
 * Connector column drawn to the left of every child (RTL: to its parent side).
 *
 * The vertical segment is clipped per position — half-height on the first and
 * last child — so the spine starts and ends on a node rather than overshooting
 * into empty space. Cheaper and crisper than measuring positions for SVG.
 */
const Connector: React.FC<{ line: string; first: boolean; last: boolean; only: boolean }> = ({
  line,
  first,
  last,
  only,
}) => (
  <div className="relative w-7 shrink-0 self-stretch">
    {!only && (
      <span
        className="absolute start-0 w-0.5 rounded-full"
        style={{
          backgroundColor: line,
          top: first ? '50%' : 0,
          bottom: last ? '50%' : 0,
        }}
      />
    )}
    <span
      className="absolute start-0 h-0.5 w-7 -translate-y-1/2 rounded-full"
      style={{ backgroundColor: line, top: '50%' }}
    />
  </div>
);

const NodeCard: React.FC<{
  node: MindNode;
  depth: number;
  tint: string;
  selected: boolean;
  collapsed: boolean;
  onSelect: () => void;
  onToggle: () => void;
}> = ({ node, depth, tint, selected, collapsed, onSelect, onToggle }) => {
  const count = node.children?.length ?? 0;

  const skin =
    depth === 0
      ? { background: tint, color: '#fff', border: tint }
      : depth === 1
        ? { background: '#fff', color: '#091e42', border: `${tint}55` }
        : { background: '#fff', color: '#334155', border: '#e2e8f0' };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={onSelect}
        className="group flex items-center gap-2.5 rounded-2xl border-2 px-3.5 py-2.5 text-start shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none"
        style={{
          backgroundColor: skin.background,
          color: skin.color,
          borderColor: selected ? tint : skin.border,
          boxShadow: selected ? `0 0 0 4px ${tint}22` : undefined,
          maxWidth: depth === 0 ? 260 : 230,
        }}
      >
        {depth > 0 && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: depth === 1 ? tint : `${tint}77` }}
          />
        )}
        {depth === 0 && <Sparkles className="h-4 w-4 shrink-0 opacity-90" />}
        <span
          className={`line-clamp-2 ${depth === 0 ? 'text-sm font-extrabold' : 'text-xs font-bold'}`}
        >
          {node.label}
        </span>
      </button>

      {count > 0 && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex h-6 shrink-0 items-center gap-0.5 rounded-full px-1.5 text-[10px] font-extrabold transition-colors"
          style={{ backgroundColor: `${tint}18`, color: tint }}
        >
          {collapsed ? (
            <ChevronLeft className="h-3 w-3" strokeWidth={3} />
          ) : (
            <ChevronDown className="h-3 w-3" strokeWidth={3} />
          )}
          {count}
        </button>
      )}
    </div>
  );
};

const Branch: React.FC<{
  node: MindNode;
  path: string;
  depth: number;
  tint: string;
  picked: string | null;
  collapsed: Set<string>;
  onPick: (p: Picked) => void;
  onToggle: (path: string) => void;
}> = ({ node, path, depth, tint, picked, collapsed, onPick, onToggle }) => {
  const line = `${tint}44`;
  const kids = node.children ?? [];
  const isCollapsed = collapsed.has(path);
  const showKids = kids.length > 0 && !isCollapsed;

  return (
    <div className="flex items-center">
      <NodeCard
        node={node}
        depth={depth}
        tint={tint}
        selected={picked === path}
        collapsed={isCollapsed}
        onSelect={() => onPick({ path, node, depth })}
        onToggle={() => onToggle(path)}
      />

      {showKids && (
        <>
          <span className="h-0.5 w-6 shrink-0 rounded-full" style={{ backgroundColor: line }} />
          <div className="flex flex-col justify-center gap-2.5 py-1">
            {kids.map((child, i) => (
              <div key={i} className="flex items-stretch">
                <Connector
                  line={line}
                  first={i === 0}
                  last={i === kids.length - 1}
                  only={kids.length === 1}
                />
                <Branch
                  node={child}
                  path={`${path}.${i}`}
                  depth={depth + 1}
                  tint={tint}
                  picked={picked}
                  collapsed={collapsed}
                  onPick={onPick}
                  onToggle={onToggle}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const STEP = 0.15;

export const MindMapTree: React.FC<{ root: MindNode; tint: string }> = ({ root, tint }) => {
  const { t } = useBoardCopy();
  const [picked, setPicked] = useState<Picked | null>({ path: 'r', node: root, depth: 0 });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);

  // A CSS transform does not change layout size, so the scroll area is sized
  // manually from the tree's natural (untransformed) offset dimensions.
  const treeRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = treeRef.current;
    if (!el) return;
    const measure = () => setNatural({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const nudge = (delta: number) =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + delta) * 100) / 100)));

  const toggle = (path: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row">
      {/* Canvas */}
      <div className="relative min-h-[320px] flex-1 lg:min-h-0">
        <div
          className="h-full overflow-auto rounded-2xl border border-slate-200 p-5"
          style={{
            backgroundColor: '#f8fafc',
            backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          }}
        >
          <div
            style={
              natural.w
                ? { width: natural.w * zoom, height: natural.h * zoom }
                : undefined
            }
          >
            <div
              ref={treeRef}
              className="inline-block origin-top-right transition-transform duration-150"
              style={{ transform: `scale(${zoom})` }}
            >
              <Branch
                node={root}
                path="r"
                depth={0}
                tint={tint}
                picked={picked?.path ?? null}
                collapsed={collapsed}
                onPick={setPicked}
                onToggle={toggle}
              />
            </div>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-3 end-3 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-md backdrop-blur">
          <button
            type="button"
            aria-label={t('mm.zoomOut')}
            disabled={zoom <= MIN_ZOOM}
            onClick={() => nudge(-STEP)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6882a9] transition-colors enabled:hover:bg-slate-100 enabled:hover:text-[#091e42] disabled:opacity-30"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <span className="w-11 text-center text-[11px] font-extrabold tabular-nums text-[#091e42]">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            aria-label={t('mm.zoomIn')}
            disabled={zoom >= MAX_ZOOM}
            onClick={() => nudge(STEP)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6882a9] transition-colors enabled:hover:bg-slate-100 enabled:hover:text-[#091e42] disabled:opacity-30"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <span className="mx-0.5 h-5 w-px bg-slate-200" />

          <button
            type="button"
            aria-label={t('mm.zoomReset')}
            onClick={() => setZoom(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6882a9] transition-colors hover:bg-slate-100 hover:text-[#091e42]"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Details */}
      <aside className="shrink-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 lg:w-[320px]">
        <AnimatePresence mode="wait">
          {picked ? (
            <motion.div
              key={picked.path}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              <span
                className="inline-block rounded-full px-2.5 py-1 text-[10px] font-extrabold"
                style={{ backgroundColor: `${tint}18`, color: tint }}
              >
                {picked.depth === 0 ? t('mm.root') : `${t('mm.level')} ${picked.depth}`}
              </span>

              <h3 className="mt-2.5 text-base font-extrabold leading-snug text-[#091e42]">
                {picked.node.label}
              </h3>

              {picked.node.details ? (
                <p className="mt-2 text-sm leading-relaxed text-[#526b7a]">
                  {picked.node.details}
                </p>
              ) : (
                <p className="mt-2 text-sm font-medium text-[#6882a9]">{t('mm.noDetails')}</p>
              )}

              {!!picked.node.children?.length && (
                <>
                  <p className="mt-4 text-[11px] font-extrabold uppercase tracking-wide text-[#6882a9]">
                    {picked.node.children.length} {t('mm.branches')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {picked.node.children.map((child, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-[#091e42]"
                      >
                        {child.label}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <p className="text-sm font-medium text-[#6882a9]">{t('mm.pick')}</p>
          )}
        </AnimatePresence>
      </aside>
    </div>
  );
};
