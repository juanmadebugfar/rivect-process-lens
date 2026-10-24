import { DEFAULT_THRESHOLDS, SEED_UYU_PER_USD, SOLUTIONS } from './constants';
import type { Project, ProposalSolution, Role, SolutionId, Stage } from './types';

let counter = 0;
/** Identificador corto y único; no depende de crypto.randomUUID (no existe en contextos no seguros). */
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newStage(partial: Partial<Stage> = {}): Stage {
  return {
    id: uid('st'),
    name: 'Nueva etapa',
    roleId: null,
    activity: 'captura',
    activeMinutes: 15,
    waitHours: 0,
    frequency: { count: 20, unit: 'mes' },
    people: 1,
    manualPct: 80,
    automationPotential: 50,
    reworkPct: 0,
    evidence: 'supuesto',
    notes: '',
    x: 0,
    y: 0,
    ...partial,
  };
}

export function newRole(partial: Partial<Role> = {}): Role {
  return { id: uid('rol'), name: 'Nuevo rol', hourlyCost: 20, ...partial };
}

export function seedSolution(solutionId: SolutionId, currency: Project['currency']): ProposalSolution {
  const def = SOLUTIONS[solutionId];
  const k = currency === 'UYU' ? SEED_UYU_PER_USD : 1;
  return {
    solutionId,
    coveragePct: def.defaultCoveragePct,
    waitReductionPct: def.defaultWaitReductionPct,
    setupCost: def.referenceSetupUsd * k,
    monthlyCost: def.referenceMonthlyUsd * k,
  };
}

export function newProject(partial: Partial<Project> = {}): Project {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: uid('pr'),
    name: 'Proceso nuevo',
    sector: 'otro',
    fictional: false,
    currency: 'USD',
    workdaysPerMonth: 21,
    hoursPerDay: 8,
    roles: [newRole({ name: 'Administrativo/a', hourlyCost: 14 })],
    stages: [],
    connections: [],
    thresholds: { ...DEFAULT_THRESHOLDS },
    proposal: { assignments: {}, solutions: {}, realizationPct: 70, horizonMonths: 12 },
    meta: { clientName: '', preparedBy: '', meetingDate: today, context: '', observations: '', nextSteps: [] },
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

/** Copia profunda con identificadores nuevos (etapas, conexiones, roles y asignaciones). */
export function cloneProject(source: Project, name: string): Project {
  const stageMap = new Map(source.stages.map((s) => [s.id, uid('st')]));
  const roleMap = new Map(source.roles.map((r) => [r.id, uid('rol')]));
  const mapped = (id: string) => stageMap.get(id) as string;
  return {
    ...structuredClone(source),
    id: uid('pr'),
    name,
    fictional: source.fictional,
    roles: source.roles.map((r) => ({ ...r, id: roleMap.get(r.id) as string })),
    stages: source.stages.map((s) => ({
      ...structuredClone(s),
      id: mapped(s.id),
      roleId: s.roleId ? (roleMap.get(s.roleId) ?? null) : null,
    })),
    connections: source.connections.map((c) => ({ id: uid('cn'), source: mapped(c.source), target: mapped(c.target) })),
    proposal: {
      ...structuredClone(source.proposal),
      assignments: Object.fromEntries(
        Object.entries(source.proposal.assignments)
          .filter(([sid]) => stageMap.has(sid))
          .map(([sid, sol]) => [mapped(sid), sol]),
      ),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function connectionId(source: string, target: string): string {
  return `${source}->${target}`;
}
