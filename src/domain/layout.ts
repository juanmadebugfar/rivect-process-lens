import { analyzeGraph } from './graph';
import type { Connection, Stage } from './types';

export const LAYOUT_X = 280;
export const LAYOUT_Y = 156;
/** Capas por fila antes de pasar a la siguiente banda, para que el flujo quepa en pantalla. */
export const LAYOUT_COLUMNS = 3;

/**
 * Disposición por capas de izquierda a derecha: la capa de una etapa es la distancia más larga
 * desde un inicio. Las capas se agrupan en bandas de `columns` para evitar flujos kilométricos.
 * Devuelve posiciones nuevas sin modificar las etapas.
 */
export function autoLayout(
  stages: Stage[],
  connections: Connection[],
  columns = LAYOUT_COLUMNS,
): Map<string, { x: number; y: number }> {
  const graph = analyzeGraph(stages, connections);
  const layer = new Map<string, number>();
  for (const id of graph.order) {
    const preds = (graph.incoming.get(id) ?? []).filter((p) => layer.has(p));
    layer.set(id, preds.length ? Math.max(...preds.map((p) => (layer.get(p) ?? 0) + 1)) : 0);
  }

  // Apila las etapas de cada capa y calcula la altura de cada banda.
  const rowInLayer = new Map<string, number>();
  const layerCount = new Map<number, number>();
  for (const s of stages) {
    const l = layer.get(s.id) ?? 0;
    const row = layerCount.get(l) ?? 0;
    layerCount.set(l, row + 1);
    rowInLayer.set(s.id, row);
  }
  const bandHeight = new Map<number, number>();
  for (const [l, count] of layerCount) {
    const band = Math.floor(l / columns);
    bandHeight.set(band, Math.max(bandHeight.get(band) ?? 0, count));
  }
  const bandOffset = new Map<number, number>();
  let acc = 0;
  for (const band of [...bandHeight.keys()].sort((a, b) => a - b)) {
    bandOffset.set(band, acc);
    acc += (bandHeight.get(band) ?? 1) * LAYOUT_Y + 24;
  }

  const out = new Map<string, { x: number; y: number }>();
  for (const s of stages) {
    const l = layer.get(s.id) ?? 0;
    const band = Math.floor(l / columns);
    out.set(s.id, {
      x: (l % columns) * LAYOUT_X,
      y: (bandOffset.get(band) ?? 0) + (rowInLayer.get(s.id) ?? 0) * LAYOUT_Y,
    });
  }
  return out;
}
