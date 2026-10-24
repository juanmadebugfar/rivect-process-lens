import { writeFileSync } from 'node:fs';
import { asciiTmpFile, expect, gotoTab, test } from './fixtures';

/** Un proceso de 100 etapas (mitad lineal, mitad ramas) importado como lo haría un usuario. */
function bigProject(n: number) {
  const stages = Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    name: `Etapa ${i + 1}`,
    roleId: 'r1',
    activity: 'captura',
    activeMinutes: 10 + (i % 7),
    waitHours: i % 5,
    frequency: { count: 20 + i, unit: 'mes' },
    people: 1,
    manualPct: 80,
    automationPotential: 50,
    reworkPct: i % 4 === 0 ? 10 : 0,
    evidence: 'supuesto',
    notes: '',
    x: (i % 10) * 280,
    y: Math.floor(i / 10) * 176,
  }));
  const connections = stages.slice(1).map((s, i) => ({ id: `c${i}`, source: i % 3 === 0 ? `s${Math.max(0, i - 1)}` : `s${i}`, target: s.id }));
  return {
    id: 'big',
    name: 'Proceso grande',
    sector: 'otro',
    fictional: true,
    currency: 'USD',
    workdaysPerMonth: 21,
    hoursPerDay: 8,
    roles: [{ id: 'r1', name: 'Rol', hourlyCost: 20 }],
    stages,
    connections,
    thresholds: { waitHours: 8, cycleSharePct: 30, loadSharePct: 25, reworkPct: 15, repetitiveOccurrences: 20, repetitiveManualPct: 60, highPotentialPct: 60 },
    proposal: { assignments: { s1: 'portal_recepcion', s2: 'portal_recepcion' }, solutions: { portal_recepcion: { solutionId: 'portal_recepcion', coveragePct: 60, waitReductionPct: 30, setupCost: 1800, monthlyCost: 40 } }, realizationPct: 70, horizonMonths: 12 },
    meta: { clientName: '', preparedBy: '', meetingDate: '', context: '', observations: '', nextSteps: [] },
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

test('un proceso de 100 etapas se importa, navega y recalcula en tiempos razonables', async ({ app }) => {
  const file = asciiTmpFile('grande.json');
  writeFileSync(file, JSON.stringify({ format: 'rivect-process-lens', version: 1, exportedAt: '2026-01-01T00:00:00.000Z', projects: [bigProject(100)] }));
  await app.getByTestId('import-input').setInputFiles(file);
  await expect(app.getByTestId('toast')).toContainText('Se importaron 1 proceso');
  await expect(app.getByTestId('stage-node')).toHaveCount(100, { timeout: 10_000 });

  const t0 = Date.now();
  await app.getByTestId('toggle-list').click();
  await app.getByTestId('stage-row').nth(50).click();
  await app.getByTestId('stage-minutes').fill('99');
  await expect(app.getByTestId('stage-hours')).toBeVisible();
  const editMs = Date.now() - t0;

  for (const t of ['hallazgos', 'escenario', 'diagnostico'] as const) await gotoTab(app, t);
  const totalMs = Date.now() - t0;
  console.log(`100 etapas: edición ${editMs} ms, edición + 3 pestañas ${totalMs} ms`);
  expect(totalMs).toBeLessThan(8000);
  await expect(app.getByTestId('report')).toBeVisible();
});
