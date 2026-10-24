import { SOLUTIONS } from '../constants';
import { connectionId, newProject, seedSolution } from '../factory';
import { autoLayout } from '../layout';
import type { ActivityType, Evidence, FrequencyUnit, Project, Role, Sector, SolutionId, Stage } from '../types';

export interface SampleStage {
  key: string;
  name: string;
  role: string;
  activity: ActivityType;
  minutes: number;
  waitHours?: number;
  freq: [number, FrequencyUnit];
  people?: number;
  manual: number;
  potential: number;
  rework?: number;
  evidence: Evidence;
  notes?: string;
  solution?: SolutionId;
}

export interface SampleSpec {
  id: string;
  name: string;
  sector: Sector;
  currency: Project['currency'];
  roles: Role[];
  stages: SampleStage[];
  links: Array<[string, string]>;
  meta: Pick<Project['meta'], 'clientName' | 'context' | 'observations' | 'nextSteps'>;
  /** Ajustes de costos de implementación respecto de la referencia (por defecto: referencia). */
  realizationPct?: number;
}

export function buildSample(spec: SampleSpec): Project {
  const stageId = (key: string) => `${spec.id}-${key}`;
  const stages: Stage[] = spec.stages.map((s) => ({
    id: stageId(s.key),
    name: s.name,
    roleId: s.role,
    activity: s.activity,
    activeMinutes: s.minutes,
    waitHours: s.waitHours ?? 0,
    frequency: { count: s.freq[0], unit: s.freq[1] },
    people: s.people ?? 1,
    manualPct: s.manual,
    automationPotential: s.potential,
    reworkPct: s.rework ?? 0,
    evidence: s.evidence,
    notes: s.notes ?? '',
    x: 0,
    y: 0,
  }));
  const connections = spec.links.map(([a, b]) => ({
    id: connectionId(stageId(a), stageId(b)),
    source: stageId(a),
    target: stageId(b),
  }));
  const layout = autoLayout(stages, connections);
  for (const s of stages) {
    const p = layout.get(s.id);
    if (p) Object.assign(s, p);
  }

  const assignments: Record<string, SolutionId> = {};
  const solutions: Project['proposal']['solutions'] = {};
  for (const s of spec.stages) {
    if (!s.solution) continue;
    assignments[stageId(s.key)] = s.solution;
    solutions[s.solution] ??= seedSolution(s.solution, spec.currency);
  }
  // Verificación temprana: toda solución usada existe en el catálogo.
  Object.keys(solutions).forEach((id) => {
    if (!(id in SOLUTIONS)) throw new Error(`Solución desconocida: ${id}`);
  });

  return newProject({
    id: spec.id,
    name: spec.name,
    sector: spec.sector,
    fictional: true,
    currency: spec.currency,
    roles: spec.roles,
    stages,
    connections,
    proposal: { assignments, solutions, realizationPct: spec.realizationPct ?? 70, horizonMonths: 12 },
    meta: {
      clientName: spec.meta.clientName,
      preparedBy: 'Equipo RIVECT',
      meetingDate: '2026-11-05',
      context: spec.meta.context,
      observations: spec.meta.observations,
      nextSteps: spec.meta.nextSteps,
    },
    updatedAt: '2026-10-24T00:00:00.000Z',
  });
}
