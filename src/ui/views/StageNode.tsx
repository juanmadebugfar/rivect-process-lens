import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import gsap from 'gsap';
import { memo, useEffect, useRef } from 'react';
import { ACTIVITY_LABELS, SOLUTIONS } from '../../domain/constants';
import { fmtNum } from '../../domain/format';
import type { ActivityType, Evidence, SolutionId } from '../../domain/types';
import { motionEnabled } from '../motion';

export interface StageNodeData extends Record<string, unknown> {
  index: number;
  name: string;
  role: string;
  activity: ActivityType;
  evidence: Evidence;
  mode: 'actual' | 'propuesto';
  minutes: number;
  occurrences: number;
  hours: number;
  waitHours: number;
  manualPct: number;
  /** Solo en modo propuesto. */
  solutionId: SolutionId | null;
  hoursBefore: number;
  critical: boolean;
  flags: { cuello: boolean; repetitiva: boolean };
  /** Estado durante la simulación del recorrido; null si no hay simulación. */
  sim: 'idle' | 'running' | 'done' | null;
}

export type StageFlowNode = Node<StageNodeData, 'stage'>;

function StageNodeView({ data, selected }: NodeProps<StageFlowNode>) {
  const proposed = data.mode === 'propuesto';
  const changed = proposed && data.solutionId !== null && data.hours < data.hoursBefore - 1e-9;
  const ref = useRef<HTMLDivElement>(null);
  const lastHours = useRef(data.hours);

  // Destello breve cuando un cambio de supuestos modifica las horas de esta etapa.
  useEffect(() => {
    const el = ref.current;
    const prev = lastHours.current;
    lastHours.current = data.hours;
    if (!el || Math.abs(prev - data.hours) < 1e-6 || !motionEnabled()) return;
    const color = data.hours < prev ? '11, 102, 87' : '168, 71, 15';
    const tween = gsap.fromTo(
      el,
      { boxShadow: `0 0 0 0 rgba(${color}, 0.55)` },
      { boxShadow: `0 0 0 10px rgba(${color}, 0)`, duration: 0.8, ease: 'power2.out', clearProps: 'boxShadow' },
    );
    return () => {
      tween.kill();
    };
  }, [data.hours]);

  return (
    <div
      ref={ref}
      className={`stage-node ${selected ? 'selected' : ''} ev-${data.evidence} ${data.critical ? 'critical' : ''} ${proposed ? 'proposed' : ''} ${data.sim ? `sim-${data.sim}` : ''}`}
      data-testid="stage-node"
      data-stage-name={data.name}
    >
      <Handle type="target" position={Position.Left} className="handle" />
      {data.sim === 'running' || data.sim === 'done' ? (
        <span className={`sn-status ${data.sim}`} role="img" aria-label={data.sim === 'running' ? 'En curso' : 'Completada'} />
      ) : null}
      <div className="sn-top">
        <span className="sn-index num">{String(data.index).padStart(2, '0')}</span>
        <span className="sn-name">{data.name || 'Sin nombre'}</span>
      </div>
      <div className="sn-sub">
        {data.role} · {ACTIVITY_LABELS[data.activity]}
      </div>
      <div className="sn-metrics num">
        <span>{fmtNum(data.minutes)} min</span>
        <span>{fmtNum(data.occurrences, 0)}/mes</span>
      </div>
      <div className="sn-metrics num strong">
        <span className={changed ? 'delta' : ''}>
          {changed ? `${fmtNum(data.hoursBefore)} → ` : ''}
          {fmtNum(data.hours)} h/mes
        </span>
        {data.waitHours > 0 ? <span className="sn-wait">espera {fmtNum(data.waitHours)} h</span> : null}
      </div>
      <div className="sn-bar" title={`${fmtNum(data.manualPct, 0)}% del tiempo activo es manual`}>
        <span style={{ width: `${data.manualPct}%` }} />
      </div>
      <div className="sn-tags">
        {data.flags.cuello ? <span className="tag warn">Cuello</span> : null}
        {data.flags.repetitiva ? <span className="tag rep">Repetitiva</span> : null}
        {proposed && data.solutionId ? <span className="tag sol">{SOLUTIONS[data.solutionId].short}</span> : null}
        {data.evidence === 'supuesto' ? <span className="tag hyp">Supuesto</span> : null}
      </div>
      <Handle type="source" position={Position.Right} className="handle" />
    </div>
  );
}

export const StageNode = memo(StageNodeView);
