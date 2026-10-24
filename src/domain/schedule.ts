import type { ProjectCalc } from './calc';
import type { Project } from './types';

export interface ScheduleItem {
  id: string;
  /** Horas hábiles desde el inicio del recorrido. */
  start: number;
  end: number;
}

export interface Schedule {
  items: ScheduleItem[];
  /** Duración total del recorrido (coincide con el tiempo de ciclo). */
  total: number;
}

/**
 * Calendario de "inicio más temprano": cada etapa empieza cuando terminan todas sus predecesoras.
 * Lo usa la simulación del recorrido; su total coincide con el camino crítico del cálculo.
 */
export function buildSchedule(project: Project, calc: ProjectCalc, mode: 'actual' | 'propuesto'): Schedule {
  const lead = (id: string) => {
    const c = calc.byId.get(id);
    if (!c) return 0;
    return mode === 'actual' ? c.leadHours : c.proposed.leadHours;
  };
  const end = new Map<string, number>();
  const items: ScheduleItem[] = [];
  for (const id of calc.graph.order) {
    const preds = project.connections
      .filter((c) => c.target === id && !calc.graph.backEdgeIds.has(c.id) && end.has(c.source))
      .map((c) => end.get(c.source) ?? 0);
    const start = preds.length ? Math.max(...preds) : 0;
    const finish = start + lead(id);
    end.set(id, finish);
    items.push({ id, start, end: finish });
  }
  return { items, total: items.reduce((m, i) => Math.max(m, i.end), 0) };
}
