import { describe, expect, it } from 'vitest';
import { calcProject, occurrencesPerMonth, sensitivity, sensitivityGrid } from './calc';
import { newStage } from './factory';
import { simpleProject } from './fixtures.test-util';

describe('occurrencesPerMonth', () => {
  it('convierte frecuencias a ocurrencias mensuales', () => {
    expect(occurrencesPerMonth({ count: 3, unit: 'mes' }, 21)).toBe(3);
    expect(occurrencesPerMonth({ count: 2, unit: 'dia' }, 21)).toBe(42);
    expect(occurrencesPerMonth({ count: 5, unit: 'semana' }, 20)).toBe(20);
  });
});

describe('calcProject — etapa única con valores verificados a mano', () => {
  const calc = calcProject(simpleProject());
  const a = calc.byId.get('A');

  it('calcula el escenario actual', () => {
    // efectivos = 30 × 1,10 = 33 min; horas = 33 × 2 × 10 / 60 = 11 h; costo = 1100
    expect(a?.effectiveMinutes).toBeCloseTo(33);
    expect(a?.hoursPerMonth).toBeCloseTo(11);
    expect(a?.costPerMonth).toBeCloseTo(1100);
    expect(a?.leadHours).toBeCloseTo(33 / 60 + 4);
    expect(calc.current.hoursPerMonth).toBeCloseTo(11);
  });

  it('calcula el escenario propuesto con la fórmula documentada', () => {
    // reducción = 0,8 × 0,5 × 0,6 × 0,5 = 0,12
    expect(a?.proposed.activeReduction).toBeCloseTo(0.12);
    expect(a?.proposed.hoursPerMonth).toBeCloseTo(9.68);
    expect(a?.proposed.savedHoursPerMonth).toBeCloseTo(1.32);
    // espera: 4 × (1 − 0,5 × 0,5) = 3
    expect(a?.proposed.waitHours).toBeCloseTo(3);
    expect(a?.proposed.leadHours).toBeCloseTo(29.04 / 60 + 3);
  });

  it('calcula neto, recupero y neto al horizonte', () => {
    expect(calc.savings.grossCostPerMonth).toBeCloseTo(132);
    expect(calc.savings.runCostPerMonth).toBe(20);
    expect(calc.savings.netPerMonth).toBeCloseTo(112);
    expect(calc.savings.paybackMonths).toBeCloseTo(1000 / 112);
    expect(calc.savings.horizonNet).toBeCloseTo(112 * 12 - 1000);
  });
});

describe('calcProject — comportamiento ante cambios de variables', () => {
  it('recalcula al cambiar el factor de realización', () => {
    const p = simpleProject();
    const full = calcProject(p, { realizationPct: 100 });
    // 0,8 × 0,5 × 0,6 × 1 = 0,24 → 33 × 0,24 × 2 × 10 / 60 = 2,64 h
    expect(full.savings.hoursPerMonth).toBeCloseTo(2.64);
    p.proposal.realizationPct = 0;
    const none = calcProject(p);
    expect(none.savings.hoursPerMonth).toBe(0);
    expect(none.savings.netPerMonth).toBe(-20);
    expect(none.savings.paybackMonths).toBeNull();
  });

  it('no supera la parte manual de la etapa aunque todo sea 100%', () => {
    const p = simpleProject();
    const st = p.stages[0];
    if (!st) throw new Error('fixture');
    st.manualPct = 40;
    st.automationPotential = 100;
    const sol = p.proposal.solutions.portal_recepcion;
    if (!sol) throw new Error('fixture');
    sol.coveragePct = 100;
    const c = calcProject(p, { realizationPct: 100 });
    expect(c.byId.get('A')?.proposed.activeReduction).toBeCloseTo(0.4);
    expect(c.byId.get('A')?.proposed.effectiveMinutes).toBeGreaterThanOrEqual(33 * 0.6 - 1e-9);
  });

  it('cuenta una solución compartida una sola vez', () => {
    const p = simpleProject();
    const b = newStage({ id: 'B', roleId: 'r1', activity: 'captura' });
    p.stages.push(b);
    p.proposal.assignments.B = 'portal_recepcion';
    const c = calcProject(p);
    expect(c.solutionsUsed).toHaveLength(1);
    expect(c.savings.setupCost).toBe(1000);
    expect(c.savings.runCostPerMonth).toBe(20);
  });

  it('el costo cambia con el costo por hora del rol', () => {
    const p = simpleProject();
    const role = p.roles[0];
    if (!role) throw new Error('fixture');
    role.hourlyCost = 200;
    expect(calcProject(p).current.costPerMonth).toBeCloseTo(2200);
  });

  it('con retrabajo 0 los minutos efectivos igualan los activos', () => {
    const p = simpleProject();
    const st = p.stages[0];
    if (!st) throw new Error('fixture');
    st.reworkPct = 0;
    expect(calcProject(p).byId.get('A')?.effectiveMinutes).toBe(30);
  });

  it('sin soluciones asignadas no hay ahorro ni costo de implementación', () => {
    const p = simpleProject();
    p.proposal.assignments = {};
    const c = calcProject(p);
    expect(c.savings.hoursPerMonth).toBe(0);
    expect(c.savings.setupCost).toBe(0);
    expect(c.savings.paybackMonths).toBe(0);
  });

  it('marca roles faltantes y soluciones que no encajan con la actividad', () => {
    const p = simpleProject();
    const st = p.stages[0];
    if (!st) throw new Error('fixture');
    st.roleId = null;
    st.activity = 'especializado';
    const c = calcProject(p);
    expect(c.missingRoles).toEqual(['A']);
    expect(c.mismatches).toEqual(['A']);
    expect(c.current.costPerMonth).toBe(0);
  });

  it('reparte la evidencia por horas', () => {
    const p = simpleProject();
    const b = newStage({ id: 'B', roleId: 'r1', activeMinutes: 33, reworkPct: 0, people: 2, evidence: 'medido' });
    p.stages.push(b);
    // B: 33 × 2 × 20 / 60 = 22 h. A: 11 h.
    const c = calcProject(p);
    expect(c.evidenceShare.medido).toBeCloseTo(22 / 33);
    expect(c.evidenceShare.supuesto).toBeCloseTo(11 / 33);
  });
});

describe('tiempo de ciclo (camino crítico)', () => {
  it('usa el camino más largo en un rombo', () => {
    const p = simpleProject();
    p.proposal.assignments = {};
    const mk = (id: string, minutes: number, wait = 0) =>
      newStage({ id, roleId: 'r1', activeMinutes: minutes, waitHours: wait, reworkPct: 0 });
    p.stages = [mk('A', 60), mk('B', 120), mk('C', 60, 5), mk('D', 60)];
    p.connections = [
      { id: 'a-b', source: 'A', target: 'B' },
      { id: 'a-c', source: 'A', target: 'C' },
      { id: 'b-d', source: 'B', target: 'D' },
      { id: 'c-d', source: 'C', target: 'D' },
    ];
    const c = calcProject(p);
    // A=1h, B=2h, C=1h+5h=6h, D=1h → A→C→D = 8 h
    expect(c.current.cycleHours).toBeCloseTo(8);
    expect(c.current.criticalPath).toEqual(['A', 'C', 'D']);
  });

  it('ignora la conexión que cierra un ciclo y lo informa', () => {
    const p = simpleProject();
    p.proposal.assignments = {};
    const mk = (id: string) => newStage({ id, roleId: 'r1', activeMinutes: 60, reworkPct: 0 });
    p.stages = [mk('A'), mk('B'), mk('C')];
    p.connections = [
      { id: 'a-b', source: 'A', target: 'B' },
      { id: 'b-c', source: 'B', target: 'C' },
      { id: 'c-a', source: 'C', target: 'A' },
    ];
    const c = calcProject(p);
    expect(c.graph.hasCycle).toBe(true);
    expect(c.current.cycleHours).toBeCloseTo(3);
  });

  it('etapas sin conectar son caminos independientes', () => {
    const p = simpleProject();
    p.proposal.assignments = {};
    p.stages = [newStage({ id: 'A', roleId: 'r1', activeMinutes: 60, reworkPct: 0 }), newStage({ id: 'B', roleId: 'r1', activeMinutes: 180, reworkPct: 0 })];
    p.connections = [];
    expect(calcProject(p).current.cycleHours).toBeCloseTo(3);
  });

  it('un proyecto vacío no rompe el cálculo', () => {
    const p = simpleProject();
    p.stages = [];
    p.proposal.assignments = {};
    const c = calcProject(p);
    expect(c.current.hoursPerMonth).toBe(0);
    expect(c.current.cycleHours).toBe(0);
  });
});

describe('sensibilidad', () => {
  it('genera rejilla ordenada y sin duplicados', () => {
    expect(sensitivityGrid(70)).toEqual([50, 70, 90, 100]);
    expect(sensitivityGrid(90)).toEqual([70, 90, 100]);
    expect(sensitivityGrid(10)).toEqual([10, 30, 100]);
  });

  it('el ahorro crece de forma monótona con la realización', () => {
    const rows = sensitivity(simpleProject());
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]?.savedHoursPerMonth).toBeGreaterThan(rows[i - 1]?.savedHoursPerMonth ?? Infinity);
    }
  });
});
