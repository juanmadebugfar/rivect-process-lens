import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleProjects } from '../domain/samples';
import { useStore } from './store';

const get = () => useStore.getState();
const active = () => {
  const p = get().activeProject();
  if (!p) throw new Error('sin proyecto activo');
  return p;
};

beforeEach(() => {
  vi.useRealTimers();
  const projects = sampleProjects();
  useStore.setState({ projects, activeId: projects[0]?.id ?? null, selectedStageId: null, past: [], future: [], notice: null });
});

describe('store: etapas y conexiones', () => {
  it('agrega una etapa, la selecciona y respeta los límites de rango', () => {
    const before = active().stages.length;
    const id = get().addStage({ name: 'X', manualPct: 500, activeMinutes: -5 });
    expect(active().stages).toHaveLength(before + 1);
    expect(get().selectedStageId).toBe(id);
    const st = active().stages.find((s) => s.id === id);
    expect(st?.manualPct).toBe(100);
    expect(st?.activeMinutes).toBe(0);
  });

  it('updateStage sanea valores no finitos', () => {
    const id = active().stages[0]?.id ?? '';
    get().updateStage(id, { activeMinutes: Number.NaN, waitHours: Infinity, reworkPct: 300 });
    const st = active().stages[0];
    expect(Number.isFinite(st?.activeMinutes)).toBe(true);
    expect(st?.waitHours).toBe(0); // valores no finitos caen al mínimo
    expect(st?.reworkPct).toBe(100);
  });

  it('rechaza conexiones a sí misma y duplicadas', () => {
    const a = active().stages[0];
    const b = active().stages[3]; // no conectadas entre sí en el caso de ejemplo
    if (!a || !b) throw new Error('fixture');
    const n = active().connections.length;
    expect(get().connect(a.id, a.id)).toBe(false);
    expect(get().connect(a.id, b.id)).toBe(true);
    expect(get().connect(a.id, b.id)).toBe(false);
    expect(active().connections).toHaveLength(n + 1);
  });

  it('eliminar una etapa quita sus conexiones y asignaciones', () => {
    const target = active().stages[2];
    if (!target) throw new Error('fixture');
    expect(active().proposal.assignments[target.id]).toBeDefined();
    get().removeStage(target.id);
    expect(active().stages.some((s) => s.id === target.id)).toBe(false);
    expect(active().connections.some((c) => c.source === target.id || c.target === target.id)).toBe(false);
    expect(active().proposal.assignments[target.id]).toBeUndefined();
  });

  it('eliminar un rol deja las etapas sin rol', () => {
    const roleId = active().roles[0]?.id ?? '';
    get().removeRole(roleId);
    expect(active().stages.filter((s) => s.roleId === roleId)).toHaveLength(0);
    expect(active().stages.some((s) => s.roleId === null)).toBe(true);
  });
});

describe('store: escenario', () => {
  it('asignar y quitar soluciones mantiene las configuraciones coherentes', () => {
    const stage = active().stages.find((s) => s.name.startsWith('Liquidación'));
    if (!stage) throw new Error('fixture');
    get().assignSolution(stage.id, 'tablero_alertas');
    expect(active().proposal.solutions.tablero_alertas).toBeDefined();
    get().assignSolution(stage.id, null);
    // nadie más usa tablero_alertas: no deben quedar costos huérfanos
    expect(active().proposal.solutions.tablero_alertas).toBeUndefined();
  });

  it('el factor de realización y el horizonte se acotan', () => {
    get().patchProposal({ realizationPct: 400, horizonMonths: 0.2 });
    expect(active().proposal.realizationPct).toBe(100);
    expect(active().proposal.horizonMonths).toBe(1);
  });
});

describe('store: historial', () => {
  it('deshacer y rehacer restauran el estado', () => {
    const n = active().stages.length;
    get().addStage();
    expect(active().stages).toHaveLength(n + 1);
    get().undo();
    expect(active().stages).toHaveLength(n);
    get().redo();
    expect(active().stages).toHaveLength(n + 1);
  });

  it('agrupa las ediciones consecutivas de un mismo campo en un paso', () => {
    const id = active().stages[0]?.id ?? '';
    const original = active().stages[0]?.activeMinutes;
    for (const v of [1, 12, 123]) get().updateStage(id, { activeMinutes: v });
    expect(active().stages[0]?.activeMinutes).toBe(123);
    get().undo();
    expect(active().stages[0]?.activeMinutes).toBe(original);
  });

  it('campos distintos no se agrupan', () => {
    const id = active().stages[0]?.id ?? '';
    const original = active().stages[0]?.activeMinutes;
    get().updateStage(id, { activeMinutes: 5 });
    get().updateStage(id, { waitHours: 9 });
    get().undo();
    expect(active().stages[0]?.activeMinutes).toBe(5);
    expect(active().stages[0]?.waitHours).not.toBe(9);
    get().undo();
    expect(active().stages[0]?.activeMinutes).toBe(original);
  });

  it('eliminar un proceso se puede deshacer', () => {
    const id = get().activeId ?? '';
    get().deleteProject(id);
    expect(get().projects).toHaveLength(2);
    get().undo();
    expect(get().projects).toHaveLength(3);
    expect(get().activeId).toBe(id);
  });
});

describe('store: procesos', () => {
  it('crear, duplicar e importar sin colisión de ids', () => {
    const id = get().createProject('Nuevo', 'otro');
    expect(get().activeId).toBe(id);
    expect(active().stages).toHaveLength(0);
    get().duplicateProject(get().projects[0]?.id ?? '');
    const ids = get().projects.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);

    const dup = sampleProjects();
    get().importProjects([...dup, ...dup]); // mismos ids que los existentes y repetidos entre sí
    const after = get().projects.map((p) => p.id);
    expect(new Set(after).size).toBe(after.length);
  });

  it('restaurar ejemplos solo agrega los que faltan', () => {
    get().deleteProject(get().projects[1]?.id ?? '');
    expect(get().projects).toHaveLength(2);
    get().restoreSamples();
    expect(get().projects).toHaveLength(3);
    get().restoreSamples();
    expect(get().projects).toHaveLength(3);
  });
});
