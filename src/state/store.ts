import { create } from 'zustand';
import { cloneProject, connectionId, newProject, newRole, newStage, seedSolution, uid } from '../domain/factory';
import { autoLayout } from '../domain/layout';
import { sampleProjects } from '../domain/samples';
import type { Meta, Project, ProposalSolution, Role, SolutionId, Sector, Stage, Thresholds } from '../domain/types';
import { loadState, saveState } from './persistence';

type Snap = { projects: Project[]; activeId: string | null };

const HISTORY_LIMIT = 60;
const COALESCE_MS = 1500;

export interface Notice {
  id: number;
  kind: 'info' | 'error' | 'success';
  text: string;
  /** Si se define, el aviso ofrece deshacer. */
  undo?: boolean;
}

type ProjectPatch = Partial<Pick<Project, 'name' | 'sector' | 'currency' | 'workdaysPerMonth' | 'hoursPerDay' | 'fictional'>>;

interface State {
  projects: Project[];
  activeId: string | null;
  selectedStageId: string | null;
  past: Snap[];
  future: Snap[];
  notice: Notice | null;
  savedAt: number | null;
  saveFailed: boolean;

  activeProject: () => Project | null;

  selectProject: (id: string) => void;
  selectStage: (id: string | null) => void;
  createProject: (name: string, sector?: Sector) => string;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
  restoreSamples: () => void;
  importProjects: (projects: Project[]) => void;
  patchProject: (patch: ProjectPatch) => void;
  patchMeta: (patch: Partial<Meta>) => void;
  patchThresholds: (patch: Partial<Thresholds>) => void;

  addStage: (partial?: Partial<Stage>) => string | null;
  updateStage: (id: string, patch: Partial<Stage>) => void;
  removeStage: (id: string) => void;
  beginGesture: () => void;
  moveStage: (id: string, x: number, y: number) => void;
  connect: (source: string, target: string) => boolean;
  disconnect: (connectionId: string) => void;
  arrange: () => void;

  addRole: () => void;
  updateRole: (id: string, patch: Partial<Role>) => void;
  removeRole: (id: string) => void;

  assignSolution: (stageId: string, solutionId: SolutionId | null) => void;
  updateSolution: (solutionId: SolutionId, patch: Partial<ProposalSolution>) => void;
  patchProposal: (patch: { realizationPct?: number; horizonMonths?: number }) => void;

  undo: () => void;
  redo: () => void;
  notify: (kind: Notice['kind'], text: string, undo?: boolean) => void;
  dismissNotice: () => void;
}

const clamp = (v: number, min: number, max: number) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min);

/** Mantiene el estado dentro de los rangos del esquema, venga el valor de donde venga. */
export function clampStagePatch(patch: Partial<Stage>): Partial<Stage> {
  const out: Partial<Stage> = { ...patch };
  const pct = ['manualPct', 'automationPotential', 'reworkPct'] as const;
  for (const k of pct) if (k in out && out[k] !== undefined) out[k] = clamp(out[k] as number, 0, 100);
  if (out.activeMinutes !== undefined) out.activeMinutes = clamp(out.activeMinutes, 0, 100_000);
  if (out.waitHours !== undefined) out.waitHours = clamp(out.waitHours, 0, 5_000);
  if (out.people !== undefined) out.people = clamp(out.people, 0, 1_000);
  if (out.frequency) out.frequency = { ...out.frequency, count: clamp(out.frequency.count, 0, 100_000) };
  if (out.name !== undefined) out.name = out.name.slice(0, 120);
  if (out.notes !== undefined) out.notes = out.notes.slice(0, 2_000);
  return out;
}

const initial = loadState();
let noticeSeq = 0;

export const useStore = create<State>((set, get) => {
  /** Aplica un cambio sobre la lista de proyectos registrando historial. */
  let lastKey: string | null = null;
  let lastAt = 0;
  const commit = (mutate: (projects: Project[]) => Project[], opts: { history?: boolean; key?: string } = {}) => {
    const { projects, past } = get();
    const next = mutate(projects);
    if (next === projects) return;
    // Las ediciones seguidas del mismo campo (tecleo, deslizadores) se agrupan en un solo paso de deshacer.
    const now = Date.now();
    const merge = !!opts.key && opts.key === lastKey && now - lastAt < COALESCE_MS;
    lastKey = opts.key ?? null;
    lastAt = now;
    const skipHistory = opts.history === false || merge;
    set({
      projects: next,
      past: skipHistory ? past : [...past, { projects, activeId: get().activeId }].slice(-HISTORY_LIMIT),
      future: opts.history === false ? get().future : [],
    });
  };

  /** Modifica el proyecto activo y actualiza su fecha. */
  const editActive = (fn: (p: Project) => Project, opts?: { history?: boolean; key?: string }) => {
    const id = get().activeId;
    if (!id) return;
    commit(
      (projects) =>
        projects.map((p) => {
          if (p.id !== id) return p;
          const next = fn(p);
          return next === p ? p : { ...next, updatedAt: new Date().toISOString() };
        }),
      opts,
    );
  };

  return {
    projects: initial.projects,
    activeId: initial.activeId,
    selectedStageId: null,
    past: [],
    future: [],
    notice: initial.notice ? { id: ++noticeSeq, kind: 'info', text: initial.notice } : null,
    savedAt: null,
    saveFailed: false,

    activeProject: () => get().projects.find((p) => p.id === get().activeId) ?? null,

    selectProject: (id) => set({ activeId: id, selectedStageId: null }),
    selectStage: (id) => set({ selectedStageId: id }),

    createProject: (name, sector = 'otro') => {
      const project = newProject({ name: name.trim() || 'Proceso nuevo', sector });
      commit((ps) => [...ps, project]);
      set({ activeId: project.id, selectedStageId: null });
      return project.id;
    },

    duplicateProject: (id) => {
      const src = get().projects.find((p) => p.id === id);
      if (!src) return;
      const copy = cloneProject(src, `${src.name} (copia)`);
      commit((ps) => [...ps, copy]);
      set({ activeId: copy.id, selectedStageId: null });
    },

    deleteProject: (id) => {
      const { projects, activeId } = get();
      const remaining = projects.filter((p) => p.id !== id);
      commit(() => remaining);
      if (activeId === id) set({ activeId: remaining[0]?.id ?? null, selectedStageId: null });
      get().notify('info', 'Proceso eliminado.', true);
    },

    restoreSamples: () => {
      const existing = new Set(get().projects.map((p) => p.id));
      const missing = sampleProjects().filter((p) => !existing.has(p.id));
      if (missing.length === 0) {
        get().notify('info', 'Los tres casos de ejemplo ya están cargados.');
        return;
      }
      commit((ps) => [...ps, ...missing]);
      set({ activeId: missing[0]?.id ?? get().activeId, selectedStageId: null });
      get().notify('success', `Se restauraron ${missing.length} caso(s) de ejemplo.`);
    },

    importProjects: (incoming) => {
      const taken = new Set(get().projects.map((p) => p.id));
      const added = incoming.map((p) => {
        const clash = taken.has(p.id);
        const project = clash ? cloneProject(p, `${p.name} (importado)`) : p;
        taken.add(project.id);
        return project;
      });
      commit((ps) => [...ps, ...added]);
      set({ activeId: added[0]?.id ?? get().activeId, selectedStageId: null });
    },

    patchProject: (patch) => {
      const clean: ProjectPatch = { ...patch };
      if (clean.workdaysPerMonth !== undefined) clean.workdaysPerMonth = clamp(clean.workdaysPerMonth, 1, 31);
      if (clean.hoursPerDay !== undefined) clean.hoursPerDay = clamp(clean.hoursPerDay, 1, 24);
      if (clean.name !== undefined) clean.name = clean.name.slice(0, 160);
      editActive((p) => ({ ...p, ...clean }), { key: `project:${Object.keys(clean).join()}` });
    },

    patchMeta: (patch) => editActive((p) => ({ ...p, meta: { ...p.meta, ...patch } }), { key: `meta:${Object.keys(patch).join()}` }),

    patchThresholds: (patch) =>
      editActive((p) => {
        const next = { ...p.thresholds };
        for (const [k, v] of Object.entries(patch)) {
          const key = k as keyof Thresholds;
          const isPct = !['waitHours', 'repetitiveOccurrences'].includes(key);
          next[key] = clamp(v as number, 0, isPct ? 100 : 100_000);
        }
        return { ...p, thresholds: next };
      }, { key: `th:${Object.keys(patch).join()}` }),

    addStage: (partial = {}) => {
      const project = get().activeProject();
      if (!project) return null;
      if (project.stages.length >= 150) {
        get().notify('error', 'Se alcanzó el máximo de 150 etapas por proceso.');
        return null;
      }
      const last = project.stages[project.stages.length - 1];
      const stage = newStage({
        roleId: project.roles[0]?.id ?? null,
        x: last ? last.x + 40 : 0,
        y: last ? last.y + 190 : 0,
        ...clampStagePatch(partial),
      });
      editActive((p) => ({ ...p, stages: [...p.stages, stage] }));
      set({ selectedStageId: stage.id });
      return stage.id;
    },

    updateStage: (id, patch) => {
      const clean = clampStagePatch(patch);
      editActive((p) => ({ ...p, stages: p.stages.map((s) => (s.id === id ? { ...s, ...clean } : s)) }), { key: `stage:${id}:${Object.keys(clean).join()}` });
    },

    removeStage: (id) => {
      editActive((p) => {
        const assignments = { ...p.proposal.assignments };
        delete assignments[id];
        return {
          ...p,
          stages: p.stages.filter((s) => s.id !== id),
          connections: p.connections.filter((c) => c.source !== id && c.target !== id),
          proposal: { ...p.proposal, assignments },
        };
      });
      if (get().selectedStageId === id) set({ selectedStageId: null });
      get().notify('info', 'Etapa eliminada.', true);
    },

    beginGesture: () => {
      lastKey = null;
      const { projects, past, activeId } = get();
      set({ past: [...past, { projects, activeId }].slice(-HISTORY_LIMIT), future: [] });
    },

    moveStage: (id, x, y) =>
      editActive((p) => ({ ...p, stages: p.stages.map((s) => (s.id === id ? { ...s, x: clamp(x, -100_000, 100_000), y: clamp(y, -100_000, 100_000) } : s)) }), {
        history: false,
      }),

    connect: (source, target) => {
      const project = get().activeProject();
      if (!project) return false;
      if (source === target) {
        get().notify('error', 'Una etapa no puede conectarse consigo misma.');
        return false;
      }
      if (project.connections.some((c) => c.source === source && c.target === target)) {
        get().notify('info', 'Esas etapas ya están conectadas.');
        return false;
      }
      if (project.connections.length >= 600) {
        get().notify('error', 'Se alcanzó el máximo de conexiones.');
        return false;
      }
      editActive((p) => ({ ...p, connections: [...p.connections, { id: connectionId(source, target), source, target }] }));
      return true;
    },

    disconnect: (id) => editActive((p) => ({ ...p, connections: p.connections.filter((c) => c.id !== id) })),

    arrange: () =>
      editActive((p) => {
        const pos = autoLayout(p.stages, p.connections);
        return { ...p, stages: p.stages.map((s) => ({ ...s, ...(pos.get(s.id) ?? {}) })) };
      }),

    addRole: () => editActive((p) => (p.roles.length >= 30 ? p : { ...p, roles: [...p.roles, newRole({ id: uid('rol') })] })),

    updateRole: (id, patch) => {
      const clean: Partial<Role> = { ...patch };
      if (clean.hourlyCost !== undefined) clean.hourlyCost = clamp(clean.hourlyCost, 0, 1_000_000);
      if (clean.name !== undefined) clean.name = clean.name.slice(0, 80);
      editActive((p) => ({ ...p, roles: p.roles.map((r) => (r.id === id ? { ...r, ...clean } : r)) }), { key: `role:${id}:${Object.keys(clean).join()}` });
    },

    removeRole: (id) =>
      editActive((p) => ({
        ...p,
        roles: p.roles.filter((r) => r.id !== id),
        stages: p.stages.map((s) => (s.roleId === id ? { ...s, roleId: null } : s)),
      })),

    assignSolution: (stageId, solutionId) =>
      editActive((p) => {
        const assignments = { ...p.proposal.assignments };
        const solutions = { ...p.proposal.solutions };
        if (solutionId === null) delete assignments[stageId];
        else {
          assignments[stageId] = solutionId;
          solutions[solutionId] ??= seedSolution(solutionId, p.currency);
        }
        // Se descartan configuraciones de soluciones que ya nadie usa para no arrastrar costos huérfanos.
        const used = new Set(Object.values(assignments));
        for (const key of Object.keys(solutions)) if (!used.has(key as SolutionId)) delete solutions[key];
        return { ...p, proposal: { ...p.proposal, assignments, solutions } };
      }),

    updateSolution: (solutionId, patch) => {
      const clean: Partial<ProposalSolution> = { ...patch };
      for (const k of ['coveragePct', 'waitReductionPct'] as const) if (clean[k] !== undefined) clean[k] = clamp(clean[k], 0, 100);
      for (const k of ['setupCost', 'monthlyCost'] as const) if (clean[k] !== undefined) clean[k] = clamp(clean[k], 0, 100_000_000);
      editActive((p) => {
        const current = p.proposal.solutions[solutionId];
        if (!current) return p;
        return { ...p, proposal: { ...p.proposal, solutions: { ...p.proposal.solutions, [solutionId]: { ...current, ...clean } } } };
      }, { key: `sol:${solutionId}:${Object.keys(clean).join()}` });
    },

    patchProposal: (patch) =>
      editActive((p) => ({
        ...p,
        proposal: {
          ...p.proposal,
          ...(patch.realizationPct !== undefined ? { realizationPct: clamp(patch.realizationPct, 0, 100) } : {}),
          ...(patch.horizonMonths !== undefined ? { horizonMonths: Math.round(clamp(patch.horizonMonths, 1, 120)) } : {}),
        },
      }), { key: `proposal:${Object.keys(patch).join()}` }),

    undo: () => {
      lastKey = null;
      const { past, projects, future, activeId } = get();
      const prev = past[past.length - 1];
      if (!prev) return;
      set({
        projects: prev.projects,
        past: past.slice(0, -1),
        future: [{ projects, activeId }, ...future].slice(0, HISTORY_LIMIT),
        activeId: prev.projects.some((p) => p.id === prev.activeId) ? prev.activeId : (prev.projects[0]?.id ?? null),
        selectedStageId: null,
      });
    },

    redo: () => {
      lastKey = null;
      const { past, projects, future, activeId } = get();
      const next = future[0];
      if (!next) return;
      set({
        projects: next.projects,
        past: [...past, { projects, activeId }].slice(-HISTORY_LIMIT),
        future: future.slice(1),
        activeId: next.projects.some((p) => p.id === next.activeId) ? next.activeId : (next.projects[0]?.id ?? null),
        selectedStageId: null,
      });
    },

    notify: (kind, text, undo) => set({ notice: { id: ++noticeSeq, kind, text, undo } }),
    dismissNotice: () => set({ notice: null }),
  };
});

// Persistencia: se guarda con un pequeño retraso para agrupar ráfagas de cambios (arrastres, tecleo).
let timer: ReturnType<typeof setTimeout> | undefined;
export function flushSave(): void {
  clearTimeout(timer);
  const { projects, activeId } = useStore.getState();
  const ok = saveState(projects, activeId);
  useStore.setState({ savedAt: ok ? Date.now() : useStore.getState().savedAt, saveFailed: !ok });
}

useStore.subscribe((state, prev) => {
  if (state.projects === prev.projects && state.activeId === prev.activeId) return;
  clearTimeout(timer);
  timer = setTimeout(flushSave, 250);
});

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSave);
  window.addEventListener('beforeunload', flushSave);
}

export const useActiveProject = () => useStore((s) => s.projects.find((p) => p.id === s.activeId) ?? null);
