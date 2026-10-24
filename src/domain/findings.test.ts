import { describe, expect, it } from 'vitest';
import { calcProject } from './calc';
import { detectFindings } from './findings';
import { newProject, newRole, newStage } from './factory';

function project() {
  const mk = (id: string, extra = {}) => newStage({ id, roleId: 'r', reworkPct: 0, waitHours: 0, manualPct: 0, automationPotential: 0, activity: 'especializado', frequency: { count: 1, unit: 'mes' }, activeMinutes: 60, ...extra });
  return newProject({
    roles: [newRole({ id: 'r', hourlyCost: 10 })],
    stages: [
      mk('a', { waitHours: 10 }),
      mk('b', { reworkPct: 20 }),
      mk('c', { activity: 'captura', manualPct: 90, frequency: { count: 30, unit: 'mes' }, activeMinutes: 10, automationPotential: 80 }),
      mk('d', { waitHours: 2 }),
    ],
    connections: [
      { id: 'a-d', source: 'a', target: 'd' },
      { id: 'b-d', source: 'b', target: 'd' },
    ],
  });
}

describe('detectFindings', () => {
  const p = project();
  const findings = detectFindings(p, calcProject(p));
  const has = (rule: string, stage: string) => findings.some((f) => f.rule === rule && f.stageId === stage);

  it('CB1 marca espera prolongada solo sobre el umbral', () => {
    expect(has('CB1', 'a')).toBe(true);
    expect(has('CB1', 'd')).toBe(false);
  });

  it('CB4 marca convergencia con espera', () => {
    expect(has('CB4', 'd')).toBe(true);
    expect(has('CB4', 'a')).toBe(false);
  });

  it('CB5 marca retrabajo elevado', () => {
    expect(has('CB5', 'b')).toBe(true);
  });

  it('TR1 y OP1 marcan la tarea repetitiva y manual', () => {
    expect(has('TR1', 'c')).toBe(true);
    expect(has('OP1', 'c')).toBe(true);
    expect(has('TR1', 'a')).toBe(false);
  });

  it('cada hallazgo incluye los valores que lo dispararon', () => {
    const f = findings.find((x) => x.id === 'CB1:a');
    expect(f?.detail).toContain('10');
    expect(f?.detail).toContain('umbral 8');
  });

  it('respeta umbrales editados', () => {
    const q = project();
    q.thresholds.waitHours = 1;
    const f = detectFindings(q, calcProject(q));
    expect(f.some((x) => x.rule === 'CB1' && x.stageId === 'd')).toBe(true);
  });

  it('TR1 no aplica a actividades no estructuradas', () => {
    const q = project();
    const c = q.stages.find((s) => s.id === 'c');
    if (!c) throw new Error('fixture');
    c.activity = 'especializado';
    expect(detectFindings(q, calcProject(q)).some((x) => x.rule === 'TR1')).toBe(false);
  });
});
