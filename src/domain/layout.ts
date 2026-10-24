import { analyzeGraph } from './graph';
import type { Connection, Stage } from './types';

export const LAYOUT_X = 300;
export const LAYOUT_Y = 170;

/**
 * Disposición por capas de izquierda a derecha: la capa de una etapa es la distancia más larga
 * desde un inicio. Devuelve posiciones nuevas sin modificar las etapas.
 */
export function autoLayout(stages: Stage[], connections: Connection[]): Map<string, { x: number; y: number }> {
  const graph = analyzeGraph(stages, connections);
  const layer = new Map<string, number>();
  for (const id of graph.order) {
    const preds = (graph.incoming.get(id) ?? []).filter((p) => layer.has(p));
    layer.set(id, preds.length ? Math.max(...preds.map((p) => (layer.get(p) ?? 0) + 1)) : 0);
  }
  const rows = new Map<number, number>();
  const out = new Map<string, { x: number; y: number }>();
  for (const s of stages) {
    const l = layer.get(s.id) ?? 0;
    const row = rows.get(l) ?? 0;
    rows.set(l, row + 1);
    out.set(s.id, { x: l * LAYOUT_X, y: row * LAYOUT_Y });
  }
  return out;
}
