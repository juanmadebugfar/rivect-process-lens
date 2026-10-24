import { sampleProjects } from '../domain/samples';
import { parseStored } from '../domain/serialize';
import { EXPORT_VERSION, type Project, type StoredState } from '../domain/types';

export const STORAGE_KEY = 'rivect-process-lens:v1';
const CORRUPT_KEY = `${STORAGE_KEY}:corrupt-backup`;

export interface Loaded {
  projects: Project[];
  activeId: string | null;
  /** Mensaje para el usuario si hubo que recuperar datos. */
  notice: string | null;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function seedState(): Loaded {
  const projects = sampleProjects();
  return { projects, activeId: projects[0]?.id ?? null, notice: null };
}

export function loadState(): Loaded {
  const ls = storage();
  if (!ls) return { ...seedState(), notice: 'El navegador no permite guardar datos localmente: los cambios se perderán al cerrar.' };
  let raw: string | null;
  try {
    raw = ls.getItem(STORAGE_KEY);
  } catch {
    return seedState();
  }
  if (raw === null) return seedState();
  const stored = parseStored(raw);
  if (!stored) {
    try {
      ls.setItem(CORRUPT_KEY, raw);
    } catch {
      /* sin espacio: se descarta */
    }
    return {
      ...seedState(),
      notice: 'Los datos guardados estaban dañados. Se restauraron los casos de ejemplo y se conservó una copia del original.',
    };
  }
  const activeId = stored.projects.some((p) => p.id === stored.activeId) ? stored.activeId : (stored.projects[0]?.id ?? null);
  return { projects: stored.projects, activeId, notice: null };
}

export function saveState(projects: Project[], activeId: string | null): boolean {
  const ls = storage();
  if (!ls) return false;
  const payload: StoredState = { version: EXPORT_VERSION, activeId, projects };
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
