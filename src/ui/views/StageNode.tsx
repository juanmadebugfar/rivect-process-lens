import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { ACTIVITY_LABELS, SOLUTIONS } from '../../domain/constants';
import { fmtNum } from '../../domain/format';
import type { ActivityType, Evidence, SolutionId } from '../../domain/types';

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
}

export type StageFlowNode = Node<StageNodeData, 'stage'>;

function StageNodeView({ data, selected }: NodeProps<StageFlowNode>) {
  const proposed = data.mode === 'propuesto';
  const changed = proposed && data.solutionId !== null && data.hours < data.hoursBefore - 1e-9;
  return (
    <div
      className={`stage-node ${selected ? 'selected' : ''} ev-${data.evidence} ${data.critical ? 'critical' : ''} ${proposed ? 'proposed' : ''}`}
      data-testid="stage-node"
      data-stage-name={data.name}
    >
      <Handle type="target" position={Position.Left} className="handle" />
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
        <span className={changed ? 'delta' : ''}>
          {changed ? `${fmtNum(data.hoursBefore)} → ` : ''}
          {fmtNum(data.hours)} h/mes
        </span>
      </div>
      {data.waitHours > 0 ? <div className="sn-wait num">espera {fmtNum(data.waitHours)} h</div> : null}
      <div className="sn-bar" title={`${fmtNum(data.manualPct, 0)}% del tiempo activo es manual`}>
        <span style={{ width: `${data.manualPct}%` }} />
      </div>
      <div className="sn-tags">
        {data.flags.cuello ? <span className="tag warn">Cuello</span> : null}
        {data.flags.repetitiva ? <span className="tag rep">Repetitiva</span> : null}
        {proposed && data.solutionId ? <span className="tag sol">{SOLUTIONS[data.solutionId].name.split(' ').slice(0, 3).join(' ')}</span> : null}
        {data.evidence === 'supuesto' ? <span className="tag hyp">Supuesto</span> : null}
      </div>
      <Handle type="source" position={Position.Right} className="handle" />
    </div>
  );
}

export const StageNode = memo(StageNodeView);
