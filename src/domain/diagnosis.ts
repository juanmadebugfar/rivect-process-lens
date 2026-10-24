import { calcProject, fitsActivity, sensitivity, sensitivityGrid, type ProjectCalc, type SensitivityRow } from './calc';
import { ACTIVITY_LABELS, MODEL_LIMITS, SECTOR_LABELS, SOLUTIONS } from './constants';
import { detectFindings, RULES, type Finding } from './findings';
import { fmtHours, fmtLead, fmtMoney, fmtNum, fmtPct } from './format';
import type { Evidence, Project, SolutionId } from './types';

/**
 * Modelo del diagnóstico. Se construye de forma determinista a partir del proyecto:
 * no hay texto generado por modelos de lenguaje. La vista imprimible y el Markdown
 * se renderizan desde esta misma estructura.
 */

export interface DiagnosisProcessRow {
  stageId: string;
  name: string;
  role: string;
  activity: string;
  occurrences: number;
  activeMinutes: number;
  waitHours: number;
  hoursPerMonth: number;
  sharePct: number;
  evidence: Evidence;
}

export interface DiagnosisProblem {
  stageName: string;
  severity: Finding['severity'];
  evidence: Evidence;
  items: Array<{ rule: string; title: string; detail: string }>;
}

export interface DiagnosisImprovement {
  solutionId: SolutionId;
  name: string;
  summary: string;
  stages: Array<{ name: string; savedHours: number; leadBefore: string; leadAfter: string }>;
  savedHoursPerMonth: number;
  coveragePct: number;
  setupCost: number;
  monthlyCost: number;
  warnings: string[];
}

export interface Diagnosis {
  title: string;
  clientName: string;
  preparedBy: string;
  meetingDate: string;
  sector: string;
  fictional: boolean;
  currency: Project['currency'];
  context: string;
  observations: string;
  summary: string[];
  process: DiagnosisProcessRow[];
  problems: DiagnosisProblem[];
  improvements: DiagnosisImprovement[];
  impact: {
    currentHours: number;
    proposedHours: number;
    savedHours: number;
    currentCost: number;
    proposedCost: number;
    grossCost: number;
    runCost: number;
    netPerMonth: number;
    setupCost: number;
    paybackMonths: number | null;
    horizonMonths: number;
    horizonNet: number;
    cycleCurrent: number;
    cycleProposed: number;
    realizationPct: number;
    sensitivity: SensitivityRow[];
  } | null;
  assumptions: string[];
  limitations: string[];
  nextSteps: string[];
}

export function buildDiagnosis(project: Project, calc: ProjectCalc = calcProject(project)): Diagnosis {
  const findings = detectFindings(project, calc);
  const total = calc.current.hoursPerMonth;
  const roleName = new Map(project.roles.map((r) => [r.id, r.name]));
  const money = (n: number) => fmtMoney(n, project.currency);
  const hasProposal = calc.solutionsUsed.length > 0;

  const process: DiagnosisProcessRow[] = project.stages.map((s) => {
    const c = calc.byId.get(s.id);
    return {
      stageId: s.id,
      name: s.name,
      role: (s.roleId && roleName.get(s.roleId)) || 'Sin rol',
      activity: ACTIVITY_LABELS[s.activity],
      occurrences: c?.occurrences ?? 0,
      activeMinutes: s.activeMinutes,
      waitHours: s.waitHours,
      hoursPerMonth: c?.hoursPerMonth ?? 0,
      sharePct: total > 0 ? ((c?.hoursPerMonth ?? 0) / total) * 100 : 0,
      evidence: s.evidence,
    };
  });

  // Problemas: se agrupan los hallazgos por etapa; las oportunidades se mencionan aparte en mejoras.
  const byStage = new Map<string, DiagnosisProblem>();
  for (const f of findings) {
    const entry = byStage.get(f.stageId) ?? {
      stageName: f.stageName,
      severity: f.severity,
      evidence: f.evidence,
      items: [],
    };
    entry.items.push({ rule: f.rule, title: f.title, detail: f.detail });
    byStage.set(f.stageId, entry);
  }
  const problems = [...byStage.values()];

  const improvements: DiagnosisImprovement[] = calc.solutionsUsed.map((use) => {
    const def = SOLUTIONS[use.solutionId];
    const stages = use.stageIds.map((id) => {
      const stage = project.stages.find((s) => s.id === id);
      const c = calc.byId.get(id);
      return {
        name: stage?.name ?? id,
        savedHours: c?.proposed.savedHoursPerMonth ?? 0,
        leadBefore: fmtLead(c?.leadHours ?? 0, project.hoursPerDay),
        leadAfter: fmtLead(c?.proposed.leadHours ?? 0, project.hoursPerDay),
      };
    });
    const warnings = use.stageIds
      .map((id) => project.stages.find((s) => s.id === id))
      .filter((s) => s && !fitsActivity(use.solutionId, s))
      .map((s) => `"${s?.name}" es de tipo ${s ? ACTIVITY_LABELS[s.activity].toLowerCase() : ''}, para el que esta solución no está pensada.`);
    return {
      solutionId: use.solutionId,
      name: def.name,
      summary: def.summary,
      stages,
      savedHoursPerMonth: stages.reduce((a, s) => a + s.savedHours, 0),
      coveragePct: use.config.coveragePct,
      setupCost: use.config.setupCost,
      monthlyCost: use.config.monthlyCost,
      warnings,
    };
  });

  const grid = sensitivityGrid(project.proposal.realizationPct);
  const impact = hasProposal
    ? {
        currentHours: calc.current.hoursPerMonth,
        proposedHours: calc.proposed.hoursPerMonth,
        savedHours: calc.savings.hoursPerMonth,
        currentCost: calc.current.costPerMonth,
        proposedCost: calc.proposed.costPerMonth,
        grossCost: calc.savings.grossCostPerMonth,
        runCost: calc.savings.runCostPerMonth,
        netPerMonth: calc.savings.netPerMonth,
        setupCost: calc.savings.setupCost,
        paybackMonths: calc.savings.paybackMonths,
        horizonMonths: project.proposal.horizonMonths,
        horizonNet: calc.savings.horizonNet,
        cycleCurrent: calc.current.cycleHours,
        cycleProposed: calc.proposed.cycleHours,
        realizationPct: project.proposal.realizationPct,
        sensitivity: sensitivity(project, grid),
      }
    : null;

  // Resumen ejecutivo
  const summary: string[] = [];
  if (project.stages.length === 0) {
    summary.push('El proceso todavía no tiene etapas cargadas.');
  } else {
    summary.push(
      `El proceso relevado tiene ${project.stages.length} etapas y consume ${fmtHours(total)} de trabajo por mes (${money(calc.current.costPerMonth)} valorizado a costo por hora), con un tiempo de ciclo de ${fmtLead(calc.current.cycleHours, project.hoursPerDay)} hábiles.`,
    );
    const known = (calc.evidenceShare.medido + calc.evidenceShare.declarado) * 100;
    summary.push(
      `${fmtPct(known)} de esas horas proviene de datos medidos o declarados por el cliente; ${fmtPct(calc.evidenceShare.supuesto * 100)} son supuestos del equipo que deben validarse.`,
    );
    const top = [...process].sort((a, b) => b.hoursPerMonth - a.hoursPerMonth)[0];
    if (top && top.hoursPerMonth > 0) {
      summary.push(`La etapa con mayor carga es "${top.name}": ${fmtPct(top.sharePct)} de las horas mensuales.`);
    }
    const flagged = new Set(findings.filter((f) => f.kind !== 'oportunidad').map((f) => f.stageId)).size;
    summary.push(
      flagged > 0
        ? `Las reglas visibles marcan ${flagged} etapa${flagged === 1 ? '' : 's'} con posibles cuellos de botella o tareas repetitivas (detalle en "Problemas identificados").`
        : 'Con los umbrales actuales las reglas no marcan cuellos de botella ni tareas repetitivas.',
    );
    if (impact) {
      const lo = sensitivity(project, [Math.max(10, impact.realizationPct - 20)])[0];
      const hi = sensitivity(project, [Math.min(100, impact.realizationPct + 20)])[0];
      summary.push(
        `Escenario propuesto: ${improvements.length} solución${improvements.length === 1 ? '' : 'es'}. Hipótesis de capacidad liberada: ${fmtHours(impact.savedHours)}/mes (entre ${fmtHours(lo?.savedHoursPerMonth ?? 0)} y ${fmtHours(hi?.savedHoursPerMonth ?? 0)} según el factor de realización). Es una estimación bajo supuestos, no un resultado demostrado.`,
      );
    } else {
      summary.push('Todavía no se definió un escenario propuesto: no hay estimación de mejora.');
    }
  }

  const assumptions: string[] = [
    `Días hábiles por mes: ${project.workdaysPerMonth}; horas por jornada: ${project.hoursPerDay}. Moneda: ${project.currency}, sin conversión.`,
    ...project.roles.map((r) => `Costo por hora de "${r.name}": ${money(r.hourlyCost)}.`),
  ];
  if (impact) {
    assumptions.push(
      `Factor de realización: ${fmtPct(impact.realizationPct)} (adopción y madurez esperadas). Horizonte de evaluación: ${impact.horizonMonths} meses.`,
    );
    for (const imp of improvements) {
      assumptions.push(
        `${imp.name}: cobertura ${fmtPct(imp.coveragePct)} del potencial automatizable; inversión inicial ${money(imp.setupCost)} y mantenimiento ${money(imp.monthlyCost)}/mes (referencias a cotizar).`,
      );
    }
  }
  const supuesto = process.filter((p) => p.evidence === 'supuesto');
  if (supuesto.length) {
    assumptions.push(
      `Etapas cargadas como supuesto del equipo (${supuesto.length}): ${supuesto.map((p) => `"${p.name}"`).join(', ')}.`,
    );
  }
  assumptions.push(
    ...Object.entries(RULES).map(([id, r]) => `Regla ${id} (${r.title}): ${r.describe(project.thresholds)}`),
  );

  const limitations = [...MODEL_LIMITS];
  if (project.fictional) {
    limitations.unshift('Los datos de este diagnóstico son ficticios y solo ilustran el método; no describen a ninguna organización real.');
  }
  if (calc.graph.hasCycle) limitations.push('El flujo contiene ciclos; el tiempo de ciclo ignora las conexiones que los cierran.');
  if (calc.graph.isolated.length && project.stages.length > 1) {
    limitations.push(`Hay ${calc.graph.isolated.length} etapa(s) sin conectar; se tratan como caminos independientes.`);
  }

  const nextSteps = [...project.meta.nextSteps.filter((s) => s.trim())];
  const toValidate = [...process]
    .filter((p) => p.evidence === 'supuesto')
    .sort((a, b) => b.hoursPerMonth - a.hoursPerMonth)
    .slice(0, 3);
  if (toValidate.length) {
    nextSteps.push(
      `Validar con datos reales las etapas cargadas como supuesto de mayor carga: ${toValidate.map((p) => `"${p.name}" (${fmtNum(p.hoursPerMonth, 0)} h/mes)`).join(', ')}.`,
    );
  }
  if (impact) {
    nextSteps.push('Elegir una o dos soluciones para un piloto acotado y acordar antes un indicador de éxito medible.');
    nextSteps.push('Preparar una cotización formal; los costos de este diagnóstico son referencias, no una oferta.');
  } else if (project.stages.length) {
    nextSteps.push('Definir con el cliente qué etapas conviene mejorar primero y armar el escenario propuesto.');
  }

  return {
    title: 'Diagnóstico preliminar de proceso',
    clientName: project.meta.clientName || project.name,
    preparedBy: project.meta.preparedBy,
    meetingDate: project.meta.meetingDate,
    sector: SECTOR_LABELS[project.sector],
    fictional: project.fictional,
    currency: project.currency,
    context: project.meta.context,
    observations: project.meta.observations,
    summary,
    process,
    problems,
    improvements,
    impact,
    assumptions,
    limitations,
    nextSteps,
  };
}
