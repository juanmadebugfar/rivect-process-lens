import { flagsByStage } from '../../domain/findings';
import { fmtNum } from '../../domain/format';
import type { Project } from '../../domain/types';
import { useStore } from '../../state/store';
import type { Analysis } from '../analysis';

export function StageList({ project, analysis }: { project: Project; analysis: Analysis }) {
  const selectedId = useStore((s) => s.selectedStageId);
  const selectStage = useStore((s) => s.selectStage);
  const flags = flagsByStage(analysis.findings);
  return (
    <nav className="stage-list" aria-label="Lista de etapas">
      <h2 className="panel-title">Etapas</h2>
      {project.stages.length === 0 ? <p className="muted small">Sin etapas todavía.</p> : null}
      <ol>
        {project.stages.map((s, i) => {
          const c = analysis.calc.byId.get(s.id);
          const f = flags.get(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                className={`stage-row ${selectedId === s.id ? 'on' : ''}`}
                aria-current={selectedId === s.id ? 'true' : undefined}
                data-testid="stage-row"
                onClick={() => selectStage(s.id)}
              >
                <span className="num idx">{String(i + 1).padStart(2, '0')}</span>
                <span className="nm">{s.name || 'Sin nombre'}</span>
                <span className="num hrs">{fmtNum(c?.hoursPerMonth ?? 0, 0)} h</span>
                <span className="dots" aria-hidden="true">
                  {f?.has('cuello') ? <i className="dot warn" /> : null}
                  {f?.has('repetitiva') ? <i className="dot rep" /> : null}
                  {s.evidence === 'supuesto' ? <i className="dot hyp" /> : null}
                </span>
                <span className="sr-only">
                  {f?.has('cuello') ? 'Posible cuello de botella. ' : ''}
                  {f?.has('repetitiva') ? 'Tarea repetitiva. ' : ''}
                  {s.evidence === 'supuesto' ? 'Dato supuesto.' : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
