import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStore as useFlowStore,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import gsap from 'gsap';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { flagsByStage } from '../../domain/findings';
import type { Project } from '../../domain/types';
import { useStore } from '../../state/store';
import type { Analysis } from '../analysis';
import { motionEnabled } from '../motion';
import { FlowEdge, type FlowEdgeType } from './FlowEdge';
import { StageNode, type StageFlowNode } from './StageNode';
import type { SimState } from './useSimulation';

const nodeTypes = { stage: StageNode };
const edgeTypes = { flow: FlowEdge };

/** Si la etapa seleccionada queda fuera de la vista (p. ej. recién agregada), la centra sin cambiar el zoom. */
function EnsureVisible({ stageId, coveredRight }: { stageId: string | null; coveredRight: number }) {
  const flow = useReactFlow();
  const width = useFlowStore((s) => s.width);
  const height = useFlowStore((s) => s.height);
  useEffect(() => {
    if (!stageId) return;
    const node = flow.getNode(stageId);
    if (!node) return;
    const { x, y, zoom } = flow.getViewport();
    const w = node.measured?.width ?? 236;
    const h = node.measured?.height ?? 120;
    const left = node.position.x * zoom + x;
    const top = node.position.y * zoom + y;
    const inside = left >= 0 && top >= 0 && left + w * zoom <= width - coveredRight && top + h * zoom <= height;
    if (!inside) {
      // Centra en la parte visible (el panel de la etapa flota sobre el borde derecho).
      void flow.setCenter(node.position.x + w / 2 + coveredRight / (2 * zoom), node.position.y + h / 2, { zoom, duration: 200 });
    }
    // Solo al cambiar la selección: mover el lienzo mientras se arrastra sería molesto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId]);
  return null;
}

interface Props {
  project: Project;
  analysis: Analysis;
  mode: 'actual' | 'propuesto';
  sim: SimState | null;
  inspectorOpen: boolean;
}

export function ProcessCanvas({ project, analysis, mode, sim, inspectorOpen }: Props) {
  const selectedStageId = useStore((s) => s.selectedStageId);
  const selectStage = useStore((s) => s.selectStage);
  const moveStage = useStore((s) => s.moveStage);
  const beginGesture = useStore((s) => s.beginGesture);
  const connect = useStore((s) => s.connect);
  const disconnect = useStore((s) => s.disconnect);
  const removeStage = useStore((s) => s.removeStage);

  const [nodes, setNodes, onNodesChange] = useNodesState<StageFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdgeType>([]);

  const roleName = useMemo(() => new Map(project.roles.map((r) => [r.id, r.name])), [project.roles]);
  const flags = useMemo(() => flagsByStage(analysis.findings), [analysis.findings]);
  const criticalPath = mode === 'actual' ? analysis.calc.current.criticalPath : analysis.calc.proposed.criticalPath;

  // Sincroniza el modelo con el estado local de React Flow conservando las medidas ya calculadas.
  useEffect(() => {
    const critical = new Set(criticalPath);
    setNodes((prev) => {
      const old = new Map(prev.map((n) => [n.id, n]));
      return project.stages.map((s, i) => {
        const c = analysis.calc.byId.get(s.id);
        const f = flags.get(s.id);
        const proposed = mode === 'propuesto';
        return {
          ...old.get(s.id),
          id: s.id,
          type: 'stage' as const,
          position: { x: s.x, y: s.y },
          selected: s.id === selectedStageId,
          data: {
            index: i + 1,
            name: s.name,
            role: (s.roleId && roleName.get(s.roleId)) || 'Sin rol',
            activity: s.activity,
            evidence: s.evidence,
            mode,
            minutes: proposed ? (c?.proposed.effectiveMinutes ?? s.activeMinutes) : s.activeMinutes,
            occurrences: c?.occurrences ?? 0,
            hours: proposed ? (c?.proposed.hoursPerMonth ?? 0) : (c?.hoursPerMonth ?? 0),
            hoursBefore: c?.hoursPerMonth ?? 0,
            waitHours: proposed ? (c?.proposed.waitHours ?? s.waitHours) : s.waitHours,
            manualPct: s.manualPct,
            solutionId: c?.proposed.solutionId ?? null,
            critical: critical.has(s.id),
            flags: { cuello: !!f?.has('cuello'), repetitiva: !!f?.has('repetitiva') },
            sim: sim ? (sim.nodes[s.id] ?? 'idle') : null,
          },
        };
      });
    });
  }, [project.stages, analysis, flags, roleName, selectedStageId, mode, criticalPath, sim, setNodes]);

  useEffect(() => {
    const critical = new Set(criticalPath);
    const back = analysis.calc.graph.backEdgeIds;
    setEdges((prev) => {
      const old = new Map(prev.map((e) => [e.id, e]));
      return project.connections.map((c) => {
        const onCritical = critical.has(c.source) && critical.has(c.target) && !back.has(c.id);
        return {
          ...old.get(c.id),
          id: c.id,
          source: c.source,
          target: c.target,
          type: 'flow' as const,
          className: `${onCritical ? 'edge-critical' : ''} ${back.has(c.id) ? 'edge-back' : ''}`,
          data: {
            critical: onCritical,
            // Los datos "circulan" por una conexión mientras su origen terminó y el destino aún no.
            flowing: !!sim && !sim.finished && sim.nodes[c.source] === 'done' && sim.nodes[c.target] !== 'done',
          },
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          ariaLabel: 'Conexión',
        };
      });
    });
  }, [project.connections, analysis, criticalPath, sim, setEdges]);

  // Entrada escalonada de las etapas al abrir un proceso: refuerza la lectura del flujo, una vez por proceso.
  const holder = useRef<HTMLDivElement>(null);
  const animatedFor = useRef<string>('');
  useEffect(() => {
    if (!motionEnabled() || nodes.length === 0 || animatedFor.current === project.id) return;
    animatedFor.current = project.id;
    let ctx: gsap.Context | undefined;
    const raf = requestAnimationFrame(() => {
      ctx = gsap.context(() => {
        gsap.from('.stage-node', { opacity: 0, y: 14, scale: 0.96, duration: 0.45, ease: 'power2.out', stagger: 0.05, clearProps: 'opacity,transform' });
      }, holder);
    });
    return () => {
      cancelAnimationFrame(raf);
      ctx?.revert();
    };
  }, [project.id, nodes.length]);

  const onConnect = useCallback<OnConnect>(
    (params) => {
      if (params.source && params.target) connect(params.source, params.target);
    },
    [connect],
  );

  return (
    <div className={`canvas ${sim && !sim.finished ? 'simulating' : ''}`} data-testid="canvas" ref={holder}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => selectStage(n.id)}
        onPaneClick={() => selectStage(null)}
        onNodeDragStart={() => beginGesture()}
        onNodeDragStop={(_, n) => moveStage(n.id, n.position.x, n.position.y)}
        onNodesDelete={(del) => del.forEach((n) => removeStage(n.id))}
        onEdgesDelete={(del) => del.forEach((e) => disconnect(e.id))}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        nodesConnectable
        elevateNodesOnSelect
        aria-label="Lienzo del proceso"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--grid)" />
        <Controls showInteractive={false} position="bottom-left" />
        <EnsureVisible stageId={selectedStageId} coveredRight={inspectorOpen && window.innerWidth > 1100 ? 350 : 0} />
      </ReactFlow>
      {project.stages.length === 0 ? (
        <div className="canvas-empty">
          <strong>Este proceso no tiene etapas.</strong>
          <span>Agregue la primera con “Agregar etapa” y conecte las siguientes arrastrando desde el punto derecho de una etapa hacia otra.</span>
        </div>
      ) : null}
    </div>
  );
}
