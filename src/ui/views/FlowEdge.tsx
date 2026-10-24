import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from '@xyflow/react';
import { motionEnabled } from '../motion';

export interface FlowEdgeData extends Record<string, unknown> {
  critical: boolean;
  /** true mientras la simulación hace circular datos por esta conexión. */
  flowing: boolean;
}

export type FlowEdgeType = Edge<FlowEdgeData, 'flow'>;

/**
 * Conexión con "datos" circulando: en el camino crítico un pulso lento, y durante la simulación
 * pulsos rápidos en las conexiones activas (idea de los flujos de n8n).
 */
export function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data }: EdgeProps<FlowEdgeType>) {
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12 });
  const live = motionEnabled();
  const flowing = !!data?.flowing;
  const critical = !!data?.critical;
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} />
      {live && (flowing || critical) ? (
        <>
          <path d={path} className={`edge-flow ${flowing ? 'fast' : ''}`} fill="none" />
          <circle r={flowing ? 4 : 3} className="edge-dot" data-testid="edge-dot">
            <animateMotion dur={flowing ? '0.9s' : '3.4s'} repeatCount="indefinite" path={path} />
          </circle>
        </>
      ) : null}
    </>
  );
}
