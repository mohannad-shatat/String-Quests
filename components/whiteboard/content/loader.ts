/**
 * Artifact data is heavy, so each subject is a separate chunk pulled in only
 * when one of its lessons is opened.
 */
import type { LessonArtifactData } from './types';

type Loader = () => Promise<{ ARTIFACTS_DATA: Record<string, LessonArtifactData> }>;

const LOADERS: Record<string, Loader> = {
  "g11-biology": () => import('./artifacts/g11-biology'),
  "g11-islamic": () => import('./artifacts/g11-islamic'),
  "g11-english": () => import('./artifacts/g11-english'),
  "g11-jordan-history": () => import('./artifacts/g11-jordan-history'),
  "g11-financial": () => import('./artifacts/g11-financial'),
  "g11-math": () => import('./artifacts/g11-math'),
  "g11-arabic": () => import('./artifacts/g11-arabic'),
  "g11-earth": () => import('./artifacts/g11-earth'),
  "g11-physics": () => import('./artifacts/g11-physics'),
  "g11-chemistry": () => import('./artifacts/g11-chemistry'),
  "g12-biology": () => import('./artifacts/g12-biology'),
  "g12-islamic": () => import('./artifacts/g12-islamic'),
  "g12-english": () => import('./artifacts/g12-english'),
  "g12-history": () => import('./artifacts/g12-history'),
  "g12-financial": () => import('./artifacts/g12-financial'),
  "g12-geography": () => import('./artifacts/g12-geography'),
  "g12-math": () => import('./artifacts/g12-math'),
  "g12-business-math": () => import('./artifacts/g12-business-math'),
  "g12-arabic": () => import('./artifacts/g12-arabic'),
  "g12-psychology": () => import('./artifacts/g12-psychology'),
  "g12-earth": () => import('./artifacts/g12-earth'),
  "g12-philosophy": () => import('./artifacts/g12-philosophy'),
  "g12-physics": () => import('./artifacts/g12-physics'),
  "g12-chemistry": () => import('./artifacts/g12-chemistry'),
  "g12-digital": () => import('./artifacts/g12-digital'),
};

const cache = new Map<string, Record<string, LessonArtifactData>>();

export const hasArtifacts = (spaceId?: string) => !!spaceId && spaceId in LOADERS;

export async function loadArtifacts(spaceId: string) {
  const cached = cache.get(spaceId);
  if (cached) return cached;
  const loader = LOADERS[spaceId];
  if (!loader) return null;
  const mod = await loader();
  cache.set(spaceId, mod.ARTIFACTS_DATA);
  return mod.ARTIFACTS_DATA;
}
