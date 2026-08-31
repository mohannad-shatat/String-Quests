import React, { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AppChrome } from './AppChrome';
import { ToolRail } from './ToolRail';
import { ArtifactsPanel } from './ArtifactsPanel';
import { ArtifactModal } from './ArtifactModal';
import { useBoardCopy } from './copy';
import { SPACES } from './spaces';
import { unitsForSpace } from './spaceContent';
import type { Artifact } from './artifacts';

interface LessonPageProps {
  spaceId?: string;
  lessonId?: string;
  onBack?: () => void;
}

export const LessonPage: React.FC<LessonPageProps> = ({ spaceId, lessonId, onBack }) => {
  const { t, locale, dir } = useBoardCopy();
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const [tool, setTool] = useState('pen');
  const [artifact, setArtifact] = useState<Artifact | null>(null);

  const space = SPACES.find((s) => s.id === spaceId);
  const unit = unitsForSpace(spaceId).find((u) => u.lessons.some((l) => l.id === lessonId));
  const lesson = unit?.lessons.find((l) => l.id === lessonId);

  return (
    <AppChrome canRecord>
      <div className="flex h-full flex-col">
        {/* Lesson bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('lesson.back')}
            className="rounded-lg p-2 text-[#6882a9] transition-colors hover:bg-slate-100 hover:text-[#091e42]"
          >
            <BackArrow className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-extrabold text-[#091e42]">
              {lesson ? lesson.title[locale] : t('lesson.missing')}
            </h1>
            <p className="truncate text-xs font-medium text-[#6882a9]">
              {[space?.name[locale], unit?.title[locale]].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Board, with the tool rail and the artifact launcher floating on it */}
        <div className="relative flex-1 overflow-hidden bg-[#f8fafc]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          <ToolRail
            active={tool}
            onSelect={setTool}
            className="absolute start-4 top-1/2 -translate-y-1/2"
          />

          <ArtifactsPanel
            selectedId={artifact?.id ?? null}
            onSelect={setArtifact}
            className="absolute end-4 top-1/2 max-h-[calc(100%-2rem)] -translate-y-1/2"
          />
        </div>
      </div>

      <ArtifactModal
        artifact={artifact}
        spaceId={spaceId}
        lessonId={lessonId}
        pdfUrl={unit?.pdf}
        onClose={() => setArtifact(null)}
      />
    </AppChrome>
  );
};

export default LessonPage;
