import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo } from 'react';
import { flagsByStage } from '../../domain/findings';
import type { Project } from '../../domain/types';
import { useStore } from '../../state/store';
import type { Analysis } from '../analysis';
import { StageNode, type StageFlowNode } from './StageNode';

const nodeTypes = { stage: StageNode };

interface Props {
  project: Project;
  analysis: Analysis;
  mode: 'actual' | 'propuesto';
}

export function ProcessCanvas({ project, analysis, mode }: Props) {
  const selectedStageId = useStore((s) => s.selectedStageId);
  const selectStage = useStore((s) => s.selectStage);
  const moveStage = useStore((s) => s.moveStage);
  const beginGesture = useStore((s) => s.beginGesture);
  const connect = useStore((s) => s.connect);
  const disconnect = useStore((s) => s.disconnect);
  const removeStage = useStore((s) => s.removeStage);

  const [nodes, setNodes, onNodesChange] = useNodesState<StageFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

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
          },
        };
      });
    });
  }, [project.stages, analysis, flags, roleName, selectedStageId, mode, criticalPath, setNodes]);

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
          type: 'smoothstep',
          className: `${onCritical ? 'edge-critical' : ''} ${back.has(c.id) ? 'edge-back' : ''}`,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          ariaLabel: 'Conexión',
        };
      });
    });
  }, [project.connections, analysis, criticalPath, setEdges]);

  const onConnect = useCallback<OnConnect>(
    (params) => {
      if (params.source && params.target) connect(params.source, params.target);
    },
    [connect],
  );

  return (
    <div className="canvas" data-testid="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
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
