import { SOLUTIONS } from './constants';
import { analyzeGraph, longestPath, type GraphAnalysis } from './graph';
import type { Evidence, Project, ProposalSolution, SolutionId, Stage } from './types';

/**
 * Cálculos del modelo. Todas las funciones son puras y deterministas.
 * Las fórmulas se documentan en `formulas.ts` y se muestran en la interfaz.
 */

export function occurrencesPerMonth(freq: Stage['frequency'], workdaysPerMonth: number): number {
  switch (freq.unit) {
    case 'dia':
      return freq.count * workdaysPerMonth;
    case 'semana':
      return (freq.count * workdaysPerMonth) / 5;
    case 'mes':
      return freq.count;
  }
}

export interface StageCalc {
  id: string;
  occurrences: number;
  hourlyCost: number;
  /** Minutos activos por ocurrencia incluyendo retrabajo. */
  effectiveMinutes: number;
  hoursPerMonth: number;
  costPerMonth: number;
  /** Horas hábiles transcurridas por ocurrencia (trabajo + espera). */
  leadHours: number;
  proposed: {
    solutionId: SolutionId | null;
    /** Fracción (0–1) del tiempo efectivo que se elimina. */
    activeReduction: number;
    /** Fracción (0–1) de la espera que se elimina. */
    waitReduction: number;
    effectiveMinutes: number;
    waitHours: number;
    hoursPerMonth: number;
    costPerMonth: number;
    leadHours: number;
    savedHoursPerMonth: number;
    savedCostPerMonth: number;
  };
}

export interface SolutionUse {
  solutionId: SolutionId;
  stageIds: string[];
  config: ProposalSolution;
}

export interface Totals {
  hoursPerMonth: number;
  costPerMonth: number;
  cycleHours: number;
  criticalPath: string[];
}

export interface ProjectCalc {
  stages: StageCalc[];
  byId: Map<string, StageCalc>;
  graph: GraphAnalysis;
  current: Totals;
  proposed: Totals;
  solutionsUsed: SolutionUse[];
  savings: {
    hoursPerMonth: number;
    /** Capacidad liberada valorizada a costo/hora (bruto, antes de costos de mantenimiento). */
    grossCostPerMonth: number;
    runCostPerMonth: number;
    netPerMonth: number;
    setupCost: number;
    /** Meses para recuperar la inversión; null si el neto mensual no es positivo. */
    paybackMonths: number | null;
    /** Neto acumulado al horizonte = neto mensual × meses − inversión inicial. */
    horizonNet: number;
    cycleHoursSaved: number;
  };
  /** Participación de cada nivel de evidencia en las horas mensuales actuales (0–1). */
  evidenceShare: Record<Evidence, number>;
  /** Etapas con una solución asignada que no está pensada para su tipo de actividad. */
  mismatches: string[];
  /** Etapas cuyo rol no existe (costo por hora = 0). */
  missingRoles: string[];
}

export interface CalcOptions {
  realizationPct?: number;
}

const clampPct = (v: number) => Math.min(100, Math.max(0, v));

export function calcProject(project: Project, options: CalcOptions = {}): ProjectCalc {
  const realization = clampPct(options.realizationPct ?? project.proposal.realizationPct) / 100;
  const roleCost = new Map(project.roles.map((r) => [r.id, r.hourlyCost]));
  const missingRoles: string[] = [];
  const mismatches: string[] = [];

  const stages: StageCalc[] = project.stages.map((s) => {
    const occurrences = occurrencesPerMonth(s.frequency, project.workdaysPerMonth);
    const hourlyCost = s.roleId ? (roleCost.get(s.roleId) ?? 0) : 0;
    if (!s.roleId || !roleCost.has(s.roleId)) missingRoles.push(s.id);
    const effectiveMinutes = s.activeMinutes * (1 + s.reworkPct / 100);
    const hoursPerMonth = (effectiveMinutes * s.people * occurrences) / 60;
    const costPerMonth = hoursPerMonth * hourlyCost;
    const leadHours = effectiveMinutes / 60 + s.waitHours;

    const solutionId = project.proposal.assignments[s.id] ?? null;
    const config = solutionId ? project.proposal.solutions[solutionId] : undefined;
    const active = config
      ? (s.manualPct / 100) * (s.automationPotential / 100) * (config.coveragePct / 100) * realization
      : 0;
    const wait = config ? (config.waitReductionPct / 100) * realization : 0;
    const effAfter = effectiveMinutes * (1 - active);
    const waitAfter = s.waitHours * (1 - wait);
    const hoursAfter = (effAfter * s.people * occurrences) / 60;
    const costAfter = hoursAfter * hourlyCost;
    return {
      id: s.id,
      occurrences,
      hourlyCost,
      effectiveMinutes,
      hoursPerMonth,
      costPerMonth,
      leadHours,
      proposed: {
        solutionId: config ? solutionId : null,
        activeReduction: active,
        waitReduction: wait,
        effectiveMinutes: effAfter,
        waitHours: waitAfter,
        hoursPerMonth: hoursAfter,
        costPerMonth: costAfter,
        leadHours: effAfter / 60 + waitAfter,
        savedHoursPerMonth: hoursPerMonth - hoursAfter,
        savedCostPerMonth: costPerMonth - costAfter,
      },
    };
  });

  const byId = new Map(stages.map((s) => [s.id, s]));
  const graph = analyzeGraph(project.stages, project.connections);
  const critCurrent = longestPath(graph, project.connections, (id) => byId.get(id)?.leadHours ?? 0);
  const critProposed = longestPath(graph, project.connections, (id) => byId.get(id)?.proposed.leadHours ?? 0);

  const sum = (f: (s: StageCalc) => number) => stages.reduce((a, s) => a + f(s), 0);
  const current: Totals = {
    hoursPerMonth: sum((s) => s.hoursPerMonth),
    costPerMonth: sum((s) => s.costPerMonth),
    cycleHours: critCurrent.total,
    criticalPath: critCurrent.path,
  };
  const proposed: Totals = {
    hoursPerMonth: sum((s) => s.proposed.hoursPerMonth),
    costPerMonth: sum((s) => s.proposed.costPerMonth),
    cycleHours: critProposed.total,
    criticalPath: critProposed.path,
  };

  // Soluciones en uso: el costo de cada una se cuenta una sola vez aunque cubra varias etapas.
  const usage = new Map<SolutionId, string[]>();
  for (const s of stages) {
    const id = s.proposed.solutionId;
    if (id) usage.set(id, [...(usage.get(id) ?? []), s.id]);
  }
  const solutionsUsed: SolutionUse[] = [];
  for (const [solutionId, stageIds] of usage) {
    const config = project.proposal.solutions[solutionId];
    if (config) solutionsUsed.push({ solutionId, stageIds, config });
  }

  const stageById = new Map(project.stages.map((s) => [s.id, s]));
  for (const use of solutionsUsed) {
    for (const stageId of use.stageIds) {
      const stage = stageById.get(stageId);
      if (stage && !fitsActivity(use.solutionId, stage)) mismatches.push(stage.id);
    }
  }

  const setupCost = solutionsUsed.reduce((a, u) => a + u.config.setupCost, 0);
  const runCostPerMonth = solutionsUsed.reduce((a, u) => a + u.config.monthlyCost, 0);
  const grossCostPerMonth = current.costPerMonth - proposed.costPerMonth;
  const netPerMonth = grossCostPerMonth - runCostPerMonth;
  const paybackMonths = netPerMonth > 0 ? setupCost / netPerMonth : setupCost === 0 && netPerMonth >= 0 ? 0 : null;

  const evidenceShare: Record<Evidence, number> = { medido: 0, declarado: 0, supuesto: 0 };
  if (current.hoursPerMonth > 0) {
    project.stages.forEach((s) => {
      evidenceShare[s.evidence] += (byId.get(s.id)?.hoursPerMonth ?? 0) / current.hoursPerMonth;
    });
  }

  return {
    stages,
    byId,
    graph,
    current,
    proposed,
    solutionsUsed,
    savings: {
      hoursPerMonth: current.hoursPerMonth - proposed.hoursPerMonth,
      grossCostPerMonth,
      runCostPerMonth,
      netPerMonth,
      setupCost,
      paybackMonths,
      horizonNet: netPerMonth * project.proposal.horizonMonths - setupCost,
      cycleHoursSaved: current.cycleHours - proposed.cycleHours,
    },
    evidenceShare,
    mismatches,
    missingRoles,
  };
}

export function fitsActivity(solutionId: SolutionId, stage: Pick<Stage, 'activity'>): boolean {
  return SOLUTIONS[solutionId].fits.includes(stage.activity);
}

export interface SensitivityRow {
  realizationPct: number;
  savedHoursPerMonth: number;
  grossCostPerMonth: number;
  netPerMonth: number;
  paybackMonths: number | null;
  horizonNet: number;
}

/** Rejilla de sensibilidad: realización base ±20 puntos y el techo teórico (100%). */
export function sensitivityGrid(realizationPct: number): number[] {
  const low = Math.max(10, realizationPct - 20);
  const high = Math.min(100, realizationPct + 20);
  return [...new Set([low, realizationPct, high, 100])].sort((a, b) => a - b);
}

/** Recalcula el escenario con distintos factores de realización (sensibilidad). */
export function sensitivity(project: Project, grid: number[] = sensitivityGrid(project.proposal.realizationPct)): SensitivityRow[] {
  return grid.map((realizationPct) => {
    const c = calcProject(project, { realizationPct });
    return {
      realizationPct,
      savedHoursPerMonth: c.savings.hoursPerMonth,
      grossCostPerMonth: c.savings.grossCostPerMonth,
      netPerMonth: c.savings.netPerMonth,
      paybackMonths: c.savings.paybackMonths,
      horizonNet: c.savings.horizonNet,
    };
  });
}
