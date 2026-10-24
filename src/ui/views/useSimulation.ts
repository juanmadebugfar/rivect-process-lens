import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProjectCalc } from '../../domain/calc';
import { fmtLead } from '../../domain/format';
import { buildSchedule } from '../../domain/schedule';
import type { Project } from '../../domain/types';
import { motionEnabled } from '../motion';

export type NodeRun = 'running' | 'done';

export interface SimState {
  /** Identifica proceso y vista; si cambian, la simulación deja de ser válida. */
  key: string;
  mode: 'actual' | 'propuesto';
  finished: boolean;
  nodes: Record<string, NodeRun>;
  totalHours: number;
  /** Tiempo de ciclo del otro escenario, para comparar al terminar. */
  otherHours: number;
}

const SIM_SECONDS = 7;
const SIM_SECONDS_NO_MOTION = 0.6;

/**
 * Recorre el flujo con el calendario real (cada etapa empieza cuando terminan sus predecesoras),
 * comprimido a unos segundos. El reloj se escribe directo en el DOM para no re-renderizar por fotograma.
 */
export function useSimulation(project: Project, calc: ProjectCalc, mode: 'actual' | 'propuesto') {
  const [raw, setRaw] = useState<SimState | null>(null);
  const key = `${project.id}:${mode}`;
  const state = raw && raw.key === key ? raw : null;
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const clockRef = useRef<HTMLElement | null>(null);
  const barRef = useRef<HTMLElement | null>(null);
  const hoursPerDay = project.hoursPerDay;

  const stop = useCallback(() => {
    timeline.current?.kill();
    timeline.current = null;
    setRaw(null);
  }, []);

  const start = useCallback(() => {
    timeline.current?.kill();
    const schedule = buildSchedule(project, calc, mode);
    const other = buildSchedule(project, calc, mode === 'actual' ? 'propuesto' : 'actual');
    const seconds = motionEnabled() ? SIM_SECONDS : SIM_SECONDS_NO_MOTION;
    const scale = schedule.total > 0 ? seconds / schedule.total : 0;
    setRaw({ key, mode, finished: false, nodes: {}, totalHours: schedule.total, otherHours: other.total });

    const mark = (id: string, run: NodeRun) => setRaw((s) => (s ? { ...s, nodes: { ...s.nodes, [id]: run } } : s));
    const clock = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        setRaw((s) => (s ? { ...s, finished: true } : s));
      },
    });
    for (const item of schedule.items) {
      tl.call(mark, [item.id, 'running'], item.start * scale);
      tl.call(mark, [item.id, 'done'], item.end * scale);
    }
    tl.to(
      clock,
      {
        v: schedule.total,
        duration: seconds,
        ease: 'none',
        onUpdate: () => {
          if (clockRef.current) clockRef.current.textContent = fmtLead(clock.v, hoursPerDay);
          if (barRef.current && schedule.total > 0) barRef.current.style.width = `${(clock.v / schedule.total) * 100}%`;
        },
      },
      0,
    );
    timeline.current = tl;
  }, [project, calc, mode, hoursPerDay, key]);

  // Si cambia el proceso o la vista, la simulación en curso se detiene (su estado deja de coincidir con `key`).
  useEffect(() => {
    if (!raw || raw.key === key) return;
    timeline.current?.kill();
    timeline.current = null;
  }, [raw, key]);
  useEffect(
    () => () => {
      timeline.current?.kill();
    },
    [],
  );

  return { state, start, stop, clockRef, barRef };
}
