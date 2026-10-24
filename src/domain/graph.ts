import type { Connection, Stage } from './types';

export interface GraphAnalysis {
  /** Orden topológico (ignorando las conexiones que cierran un ciclo). */
  order: string[];
  /** Conexiones que cierran un ciclo (se ignoran en el camino crítico). */
  backEdgeIds: Set<string>;
  hasCycle: boolean;
  incoming: Map<string, string[]>;
  outgoing: Map<string, string[]>;
  starts: string[];
  ends: string[];
  /** Etapas sin ninguna conexión. */
  isolated: string[];
}

export function analyzeGraph(stages: Stage[], connections: Connection[]): GraphAnalysis {
  const ids = new Set(stages.map((s) => s.id));
  const valid = connections.filter((c) => ids.has(c.source) && ids.has(c.target));

  const adjacency = new Map<string, Connection[]>();
  stages.forEach((s) => adjacency.set(s.id, []));
  valid.forEach((c) => adjacency.get(c.source)?.push(c));

  // DFS para detectar aristas de retroceso (ciclos).
  const state = new Map<string, 0 | 1 | 2>();
  const backEdgeIds = new Set<string>();
  const visit = (id: string) => {
    state.set(id, 1);
    for (const edge of adjacency.get(id) ?? []) {
      const s = state.get(edge.target) ?? 0;
      if (s === 1) backEdgeIds.add(edge.id);
      else if (s === 0) visit(edge.target);
    }
    state.set(id, 2);
  };
  stages.forEach((s) => {
    if (!state.get(s.id)) visit(s.id);
  });

  const forward = valid.filter((c) => !backEdgeIds.has(c.id));
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  stages.forEach((s) => {
    incoming.set(s.id, []);
    outgoing.set(s.id, []);
  });
  valid.forEach((c) => {
    outgoing.get(c.source)?.push(c.target);
    incoming.get(c.target)?.push(c.source);
  });

  // Kahn sobre el grafo sin aristas de retroceso.
  const indegree = new Map<string, number>(stages.map((s) => [s.id, 0]));
  forward.forEach((c) => indegree.set(c.target, (indegree.get(c.target) ?? 0) + 1));
  const queue = stages.filter((s) => indegree.get(s.id) === 0).map((s) => s.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift() as string;
    order.push(id);
    for (const edge of forward.filter((c) => c.source === id)) {
      const left = (indegree.get(edge.target) ?? 0) - 1;
      indegree.set(edge.target, left);
      if (left === 0) queue.push(edge.target);
    }
  }

  const starts = stages.filter((s) => (incoming.get(s.id)?.length ?? 0) === 0).map((s) => s.id);
  const ends = stages.filter((s) => (outgoing.get(s.id)?.length ?? 0) === 0).map((s) => s.id);
  const isolated = stages
    .filter((s) => (incoming.get(s.id)?.length ?? 0) === 0 && (outgoing.get(s.id)?.length ?? 0) === 0)
    .map((s) => s.id);

  return { order, backEdgeIds, hasCycle: backEdgeIds.size > 0, incoming, outgoing, starts, ends, isolated };
}

/** Camino de mayor peso acumulado (peso por etapa). Es el "camino crítico" del proceso. */
export function longestPath(
  analysis: GraphAnalysis,
  connections: Connection[],
  weight: (id: string) => number,
): { total: number; path: string[] } {
  const best = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const forward = connections.filter(
    (c) => !analysis.backEdgeIds.has(c.id) && analysis.incoming.has(c.source) && analysis.incoming.has(c.target),
  );
  for (const id of analysis.order) {
    const preds = forward.filter((c) => c.target === id).map((c) => c.source);
    let top = 0;
    let from: string | null = null;
    for (const p of preds) {
      const v = best.get(p) ?? 0;
      if (v > top || from === null) {
        top = v;
        from = p;
      }
    }
    best.set(id, top + weight(id));
    prev.set(id, from);
  }
  let endId: string | null = null;
  let total = 0;
  for (const [id, v] of best) {
    if (endId === null || v > total) {
      endId = id;
      total = v;
    }
  }
  const path: string[] = [];
  for (let cur = endId; cur; cur = prev.get(cur) ?? null) path.unshift(cur);
  return { total, path };
}

export interface GraphIssue {
  level: 'aviso' | 'info';
  message: string;
  stageIds: string[];
}

export function graphIssues(stages: Stage[], analysis: GraphAnalysis): GraphIssue[] {
  const issues: GraphIssue[] = [];
  if (stages.length === 0) return issues;
  if (analysis.hasCycle) {
    issues.push({
      level: 'aviso',
      message:
        'Hay un ciclo en el flujo. Las conexiones que lo cierran no se cuentan en el tiempo de ciclo; modele el retrabajo con el campo "% retrabajo".',
      stageIds: [],
    });
  }
  if (stages.length > 1 && analysis.isolated.length > 0) {
    issues.push({
      level: 'aviso',
      message: `Etapas sin conectar (${analysis.isolated.length}): el tiempo de ciclo las trata como caminos independientes.`,
      stageIds: analysis.isolated,
    });
  }
  return issues;
}
