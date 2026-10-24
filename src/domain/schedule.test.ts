import { describe, expect, it } from 'vitest';
import { calcProject } from './calc';
import { sampleProjects } from './samples';
import { buildSchedule } from './schedule';

describe('buildSchedule', () => {
  for (const p of sampleProjects()) {
    it(`${p.name}: el total coincide con el tiempo de ciclo`, () => {
      const c = calcProject(p);
      expect(buildSchedule(p, c, 'actual').total).toBeCloseTo(c.current.cycleHours, 6);
      expect(buildSchedule(p, c, 'propuesto').total).toBeCloseTo(c.proposed.cycleHours, 6);
    });

    it(`${p.name}: ninguna etapa empieza antes de que terminen sus predecesoras`, () => {
      const c = calcProject(p);
      const s = buildSchedule(p, c, 'actual');
      const byId = new Map(s.items.map((i) => [i.id, i]));
      for (const conn of p.connections) {
        const a = byId.get(conn.source);
        const b = byId.get(conn.target);
        expect((b?.start ?? 0) + 1e-9).toBeGreaterThanOrEqual(a?.end ?? Infinity);
      }
      expect(s.items).toHaveLength(p.stages.length);
    });
  }

  it('el escenario propuesto nunca dura más que el actual', () => {
    for (const p of sampleProjects()) {
      const c = calcProject(p);
      expect(buildSchedule(p, c, 'propuesto').total).toBeLessThanOrEqual(buildSchedule(p, c, 'actual').total + 1e-9);
    }
  });
});
