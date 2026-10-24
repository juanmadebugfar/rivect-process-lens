import { newProject, newRole, newStage, seedSolution } from './factory';
import type { Project } from './types';

/** Proyecto mínimo con valores elegidos para poder verificar a mano. */
export function simpleProject(): Project {
  const role = newRole({ id: 'r1', name: 'Rol', hourlyCost: 100 });
  const a = newStage({
    id: 'A',
    name: 'Etapa A',
    roleId: 'r1',
    activity: 'captura',
    activeMinutes: 30,
    waitHours: 4,
    frequency: { count: 10, unit: 'mes' },
    people: 2,
    manualPct: 80,
    automationPotential: 50,
    reworkPct: 10,
  });
  return newProject({
    id: 'p1',
    roles: [role],
    stages: [a],
    proposal: {
      assignments: { A: 'portal_recepcion' },
      solutions: {
        portal_recepcion: {
          ...seedSolution('portal_recepcion', 'USD'),
          coveragePct: 60,
          waitReductionPct: 50,
          setupCost: 1000,
          monthlyCost: 20,
        },
      },
      realizationPct: 50,
      horizonMonths: 12,
    },
  });
}
