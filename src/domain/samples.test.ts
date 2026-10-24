import { describe, expect, it } from 'vitest';
import { calcProject } from './calc';
import { buildDiagnosis } from './diagnosis';
import { detectFindings } from './findings';
import { diagnosisToMarkdown } from './markdown';
import { sampleProjects } from './samples';
import { ProjectSchema } from './types';

const samples = sampleProjects();

describe('casos de ejemplo', () => {
  it('son tres sectores distintos, ficticios y con ids únicos', () => {
    expect(samples.map((s) => s.sector).sort()).toEqual(['clinica', 'contable', 'juridico']);
    expect(samples.every((s) => s.fictional)).toBe(true);
    expect(new Set(samples.map((s) => s.id)).size).toBe(3);
  });

  it.each(samples.map((s) => [s.name, s] as const))('%s cumple el esquema y su integridad', (_n, p) => {
    expect(ProjectSchema.safeParse(p).success).toBe(true);
    const ids = new Set(p.stages.map((s) => s.id));
    expect(ids.size).toBe(p.stages.length);
    p.connections.forEach((c) => {
      expect(ids.has(c.source) && ids.has(c.target)).toBe(true);
    });
    p.stages.forEach((s) => expect(p.roles.some((r) => r.id === s.roleId)).toBe(true));
    Object.entries(p.proposal.assignments).forEach(([sid, sol]) => {
      expect(ids.has(sid)).toBe(true);
      expect(p.proposal.solutions[sol]).toBeDefined();
    });
  });

  it.each(samples.map((s) => [s.name, s] as const))('%s produce resultados razonables', (_n, p) => {
    const c = calcProject(p);
    expect(c.current.hoursPerMonth).toBeGreaterThan(20);
    expect(c.proposed.hoursPerMonth).toBeLessThan(c.current.hoursPerMonth);
    expect(c.proposed.cycleHours).toBeLessThan(c.current.cycleHours);
    expect(c.savings.netPerMonth).toBeGreaterThan(0);
    expect(c.graph.hasCycle).toBe(false);
    expect(c.graph.isolated).toEqual([]);
    expect(c.missingRoles).toEqual([]);
    expect(c.mismatches).toEqual([]);
    expect(detectFindings(p, c).length).toBeGreaterThan(2);
  });

  it('los casos son estructuralmente distintos', () => {
    const [cont, cli, jur] = samples.map((p) => calcProject(p));
    // La clínica tiene la mayor frecuencia por etapa; el estudio jurídico, la mayor espera acumulada.
    expect(cli?.stages.some((s) => s.occurrences >= 400)).toBe(true);
    expect(Math.max(...(jur?.stages.map((s) => s.occurrences) ?? [0]))).toBeLessThan(40);
    expect((jur?.current.cycleHours ?? 0)).toBeGreaterThan((cont?.current.cycleHours ?? 0));
    expect(new Set(samples.map((p) => p.stages.length)).size).toBe(3);
    expect(new Set(samples.map((p) => p.roles.map((r) => r.name).join())).size).toBe(3);
  });
});

describe('diagnóstico', () => {
  const p = samples[0];
  if (!p) throw new Error('sin muestras');
  const d = buildDiagnosis(p);
  const md = diagnosisToMarkdown(d);

  it('contiene todas las secciones obligatorias', () => {
    for (const h of ['## Resumen', '## Proceso actual', '## Problemas identificados', '## Mejoras propuestas', '## Impacto estimado', '## Supuestos', '## Limitaciones', '## Siguientes pasos']) {
      expect(md).toContain(h);
    }
  });

  it('identifica los datos como ficticios y evita lenguaje de garantía', () => {
    expect(md).toContain('Datos ficticios');
    expect(md.toLowerCase()).not.toMatch(/garantiz|ahorro demostrado|ahorrará/);
    expect(md).toContain('no demostrado');
  });

  it('distingue evidencia de hipótesis', () => {
    expect(d.summary.join(' ')).toMatch(/medidos o declarados/);
    expect(md).toContain('Medido');
    expect(md).toContain('Supuesto del equipo');
  });

  it('el impacto coincide con el cálculo', () => {
    const c = calcProject(p);
    expect(d.impact?.netPerMonth).toBeCloseTo(c.savings.netPerMonth);
    expect(d.impact?.sensitivity.length).toBeGreaterThanOrEqual(3);
  });

  it('sin escenario propuesto no inventa impacto', () => {
    const q = structuredClone(p);
    q.proposal.assignments = {};
    const dq = buildDiagnosis(q);
    expect(dq.impact).toBeNull();
    expect(diagnosisToMarkdown(dq)).not.toContain('## Impacto estimado');
  });

  it('un proyecto vacío genera un diagnóstico sin errores', () => {
    const q = structuredClone(p);
    q.stages = [];
    q.connections = [];
    q.proposal.assignments = {};
    expect(() => diagnosisToMarkdown(buildDiagnosis(q))).not.toThrow();
  });
});
