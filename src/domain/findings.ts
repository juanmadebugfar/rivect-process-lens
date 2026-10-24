import type { ProjectCalc } from './calc';
import { STRUCTURED_ACTIVITIES } from './constants';
import type { Evidence, Project } from './types';

/**
 * Reglas de detección. Cada regla es explícita, tiene un identificador estable
 * y sus umbrales viven en `project.thresholds` (editables en la pestaña Supuestos).
 */

export type RuleId = 'CB1' | 'CB2' | 'CB3' | 'CB4' | 'CB5' | 'TR1' | 'OP1';
export type FindingKind = 'cuello' | 'repetitiva' | 'oportunidad';

export interface RuleInfo {
  id: RuleId;
  kind: FindingKind;
  title: string;
  /** Texto de la regla con sus umbrales actuales. */
  describe: (t: Project['thresholds']) => string;
}

export const RULES: Record<RuleId, RuleInfo> = {
  CB1: {
    id: 'CB1',
    kind: 'cuello',
    title: 'Espera prolongada',
    describe: (t) => `Espera por ocurrencia ≥ ${t.waitHours} h hábiles.`,
  },
  CB2: {
    id: 'CB2',
    kind: 'cuello',
    title: 'Peso en el tiempo de ciclo',
    describe: (t) =>
      `Etapa del camino crítico cuyo tiempo (trabajo + espera) es ≥ ${t.cycleSharePct}% del tiempo de ciclo.`,
  },
  CB3: {
    id: 'CB3',
    kind: 'cuello',
    title: 'Concentración de carga',
    describe: (t) => `Concentra ≥ ${t.loadSharePct}% de las horas de trabajo mensuales del proceso.`,
  },
  CB4: {
    id: 'CB4',
    kind: 'cuello',
    title: 'Punto de convergencia con espera',
    describe: () => 'Recibe 2 o más conexiones entrantes y tiene espera > 0: espera a que todas lleguen.',
  },
  CB5: {
    id: 'CB5',
    kind: 'cuello',
    title: 'Retrabajo elevado',
    describe: (t) => `Retrabajo ≥ ${t.reworkPct}% de las ocurrencias.`,
  },
  TR1: {
    id: 'TR1',
    kind: 'repetitiva',
    title: 'Tarea repetitiva y manual',
    describe: (t) =>
      `≥ ${t.repetitiveOccurrences} ocurrencias/mes, ≥ ${t.repetitiveManualPct}% manual y actividad estructurada (captura, documentos, comunicación o revisión).`,
  },
  OP1: {
    id: 'OP1',
    kind: 'oportunidad',
    title: 'Alto potencial de automatización',
    describe: (t) => `Potencial de automatización ≥ ${t.highPotentialPct}% con intervención manual ≥ 50%.`,
  },
};

export interface Finding {
  id: string;
  rule: RuleId;
  kind: FindingKind;
  stageId: string;
  stageName: string;
  title: string;
  /** Valores concretos que dispararon la regla. */
  detail: string;
  /** Evidencia con la que se cargó la etapa. */
  evidence: Evidence;
  severity: 'alta' | 'media';
  hoursPerMonth: number;
}

const f1 = (n: number) => new Intl.NumberFormat('es-UY', { maximumFractionDigits: 1 }).format(n);

export function detectFindings(project: Project, calc: ProjectCalc): Finding[] {
  const t = project.thresholds;
  const out: Finding[] = [];
  const total = calc.current.hoursPerMonth;
  const critical = new Set(calc.current.criticalPath);

  for (const stage of project.stages) {
    const c = calc.byId.get(stage.id);
    if (!c) continue;
    const hits: Array<{ rule: RuleId; detail: string }> = [];

    if (stage.waitHours > 0 && stage.waitHours >= t.waitHours) {
      hits.push({ rule: 'CB1', detail: `Espera de ${f1(stage.waitHours)} h hábiles por ocurrencia (umbral ${t.waitHours} h).` });
    }
    if (calc.current.cycleHours > 0 && critical.has(stage.id) && project.stages.length > 1) {
      const share = (c.leadHours / calc.current.cycleHours) * 100;
      if (share >= t.cycleSharePct) {
        hits.push({
          rule: 'CB2',
          detail: `Ocupa ${f1(share)}% del tiempo de ciclo (${f1(c.leadHours)} de ${f1(calc.current.cycleHours)} h; umbral ${t.cycleSharePct}%).`,
        });
      }
    }
    if (total > 0) {
      const share = (c.hoursPerMonth / total) * 100;
      if (share >= t.loadSharePct) {
        hits.push({
          rule: 'CB3',
          detail: `Concentra ${f1(share)}% de las ${f1(total)} h/mes (umbral ${t.loadSharePct}%).`,
        });
      }
    }
    const incoming = calc.graph.incoming.get(stage.id)?.length ?? 0;
    if (incoming >= 2 && stage.waitHours > 0) {
      hits.push({ rule: 'CB4', detail: `${incoming} conexiones entrantes y ${f1(stage.waitHours)} h de espera.` });
    }
    if (stage.reworkPct > 0 && stage.reworkPct >= t.reworkPct) {
      hits.push({ rule: 'CB5', detail: `${f1(stage.reworkPct)}% de retrabajo (umbral ${t.reworkPct}%).` });
    }
    if (
      c.occurrences >= t.repetitiveOccurrences &&
      stage.manualPct >= t.repetitiveManualPct &&
      STRUCTURED_ACTIVITIES.includes(stage.activity) &&
      stage.activeMinutes > 0
    ) {
      hits.push({
        rule: 'TR1',
        detail: `${f1(c.occurrences)} veces/mes, ${f1(stage.manualPct)}% manual, ${f1(stage.activeMinutes)} min cada vez.`,
      });
    }
    if (stage.automationPotential >= t.highPotentialPct && stage.manualPct >= 50 && stage.activeMinutes > 0) {
      hits.push({
        rule: 'OP1',
        detail: `Potencial declarado ${f1(stage.automationPotential)}% sobre ${f1(stage.manualPct)}% de trabajo manual (hipótesis).`,
      });
    }

    const bottleneckHits = hits.filter((h) => RULES[h.rule].kind === 'cuello').length;
    const severity: Finding['severity'] = hits.length >= 3 || bottleneckHits >= 2 ? 'alta' : 'media';
    for (const h of hits) {
      out.push({
        id: `${h.rule}:${stage.id}`,
        rule: h.rule,
        kind: RULES[h.rule].kind,
        stageId: stage.id,
        stageName: stage.name,
        title: RULES[h.rule].title,
        detail: h.detail,
        evidence: stage.evidence,
        severity,
        hoursPerMonth: c.hoursPerMonth,
      });
    }
  }

  const rank = { alta: 0, media: 1 } as const;
  return out.sort(
    (a, b) => rank[a.severity] - rank[b.severity] || b.hoursPerMonth - a.hoursPerMonth || a.rule.localeCompare(b.rule),
  );
}

/** Etapas marcadas por al menos un hallazgo, agrupadas por tipo, para el lienzo. */
export function flagsByStage(findings: Finding[]): Map<string, Set<FindingKind>> {
  const map = new Map<string, Set<FindingKind>>();
  for (const f of findings) {
    const set = map.get(f.stageId) ?? new Set<FindingKind>();
    set.add(f.kind);
    map.set(f.stageId, set);
  }
  return map;
}
