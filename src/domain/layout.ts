import { analyzeGraph } from './graph';
import type { Connection, Stage } from './types';

export const LAYOUT_X = 280;
export const LAYOUT_Y = 176;
/** Proporción ancho/alto objetivo: la de un lienzo típico, para que el flujo se vea grande sin recortes. */
export const LAYOUT_ASPECT = 1.7;
const MAX_COLUMNS = 8;

type Positions = Map<string, { x: number; y: number }>;

interface Placement {
  positions: Positions;
  width: number;
  height: number;
}

/**
 * Disposición por capas de izquierda a derecha: la capa de una etapa es la distancia más larga
 * desde un inicio. Las capas se agrupan en bandas de `columns` para evitar flujos kilométricos.
 * Sin `columns`, elige la cantidad que acerca la proporción del conjunto a `LAYOUT_ASPECT`.
 * Devuelve posiciones nuevas sin modificar las etapas.
 */
export function autoLayout(stages: Stage[], connections: Connection[], columns?: number): Positions {
  const graph = analyzeGraph(stages, connections);
  const layer = new Map<string, number>();
  for (const id of graph.order) {
    const preds = (graph.incoming.get(id) ?? []).filter((p) => layer.has(p));
    layer.set(id, preds.length ? Math.max(...preds.map((p) => (layer.get(p) ?? 0) + 1)) : 0);
  }

  // Apila las etapas de cada capa.
  const rowInLayer = new Map<string, number>();
  const layerCount = new Map<number, number>();
  for (const s of stages) {
    const l = layer.get(s.id) ?? 0;
    const row = layerCount.get(l) ?? 0;
    layerCount.set(l, row + 1);
    rowInLayer.set(s.id, row);
  }
  const layers = layerCount.size === 0 ? 0 : Math.max(...layerCount.keys()) + 1;

  const place = (cols: number): Placement => {
    const bandHeight = new Map<number, number>();
    for (const [l, count] of layerCount) {
      const band = Math.floor(l / cols);
      bandHeight.set(band, Math.max(bandHeight.get(band) ?? 0, count));
    }
    const bandOffset = new Map<number, number>();
    let acc = 0;
    for (const band of [...bandHeight.keys()].sort((a, b) => a - b)) {
      bandOffset.set(band, acc);
      acc += (bandHeight.get(band) ?? 1) * LAYOUT_Y + 24;
    }
    const positions: Positions = new Map();
    for (const s of stages) {
      const l = layer.get(s.id) ?? 0;
      positions.set(s.id, {
        x: (l % cols) * LAYOUT_X,
        y: (bandOffset.get(Math.floor(l / cols)) ?? 0) + (rowInLayer.get(s.id) ?? 0) * LAYOUT_Y,
      });
    }
    return { positions, width: Math.min(cols, Math.max(layers, 1)) * LAYOUT_X, height: Math.max(acc, LAYOUT_Y) };
  };

  if (columns !== undefined) return place(Math.max(1, columns)).positions;

  let best = place(1);
  let bestScore = Infinity;
  for (let cols = 1; cols <= Math.min(MAX_COLUMNS, Math.max(layers, 1)); cols++) {
    const candidate = place(cols);
    const score = Math.abs(Math.log(candidate.width / candidate.height / LAYOUT_ASPECT));
    if (score < bestScore - 1e-9) {
      best = candidate;
      bestScore = score;
    }
  }
  return best.positions;
}
