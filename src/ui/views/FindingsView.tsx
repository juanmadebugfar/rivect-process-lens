import { RULES, type Finding, type FindingKind, type RuleId } from '../../domain/findings';
import { fmtNum } from '../../domain/format';
import type { Project } from '../../domain/types';
import type { Analysis } from '../analysis';
import { EvidenceChip } from '../components/Chips';

const KIND_TITLES: Record<FindingKind, { title: string; intro: string }> = {
  cuello: { title: 'Posibles cuellos de botella', intro: 'Etapas donde el flujo se frena o se concentra el esfuerzo.' },
  repetitiva: { title: 'Tareas repetitivas', intro: 'Trabajo manual frecuente y estructurado.' },
  oportunidad: { title: 'Oportunidades de automatización', intro: 'Etapas con alto potencial declarado (hipótesis del equipo).' },
};

interface Props {
  project: Project;
  analysis: Analysis;
  onOpenStage: (id: string) => void;
  onEditThresholds: () => void;
}

export function FindingsView({ project, analysis, onOpenStage, onEditThresholds }: Props) {
  const kinds: FindingKind[] = ['cuello', 'repetitiva', 'oportunidad'];
  const stagesFlagged = new Set(analysis.findings.map((f) => f.stageId)).size;

  return (
    <div className="findings-view">
      <section className="f-main" aria-label="Hallazgos">
        <header className="view-head">
          <h2>Hallazgos</h2>
          <p className="muted">
            {analysis.findings.length} señales en {stagesFlagged} de {project.stages.length} etapas. Son puntos de partida para conversar: cada una cita la regla y los valores que la activaron.
          </p>
        </header>
        {kinds.map((kind) => {
          const items = analysis.findings.filter((f) => f.kind === kind);
          return (
            <section key={kind} className="f-group" aria-labelledby={`fg-${kind}`}>
              <h3 id={`fg-${kind}`} className="group-title">
                {KIND_TITLES[kind].title} <span className="count num">{items.length}</span>
              </h3>
              <p className="muted small">{KIND_TITLES[kind].intro}</p>
              {items.length === 0 ? (
                <p className="empty-line">Ninguna con los umbrales actuales.</p>
              ) : (
                <div className="table-wrap">
<table className="table findings-table">
                  <thead>
                    <tr>
                      <th scope="col">Prioridad</th>
                      <th scope="col">Etapa</th>
                      <th scope="col">Regla</th>
                      <th scope="col">Valores que la activaron</th>
                      <th scope="col" className="r">
                        Horas/mes
                      </th>
                      <th scope="col">Dato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((f, i) => (
                      <FindingRow key={f.id} f={f} index={i} onOpen={onOpenStage} />
                    ))}
                  </tbody>
                </table>
</div>
              )}
            </section>
          );
        })}
      </section>

      <aside className="f-rules" aria-label="Reglas de detección">
        <h2 className="panel-title">Reglas y umbrales</h2>
        <p className="muted small">Ninguna regla usa modelos opacos. Los umbrales se editan en Supuestos.</p>
        <dl className="rules">
          {(Object.keys(RULES) as RuleId[]).map((id) => (
            <div key={id}>
              <dt>
                <span className="rule-id num">{id}</span> {RULES[id].title}
              </dt>
              <dd>{RULES[id].describe(project.thresholds)}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className="btn" onClick={onEditThresholds}>
          Editar umbrales
        </button>
      </aside>
    </div>
  );
}

function FindingRow({ f, index, onOpen }: { f: Finding; index: number; onOpen: (id: string) => void }) {
  return (
    <tr data-testid="finding-row" data-rule={f.rule} className="reveal" style={{ '--i': Math.min(index, 10) } as React.CSSProperties}>
      <td>
        <span className={`chip sev ${f.severity}`}>{f.severity === 'alta' ? 'Alta' : 'Media'}</span>
      </td>
      <td>
        <button type="button" className="link" onClick={() => onOpen(f.stageId)}>
          {f.stageName}
        </button>
      </td>
      <td>
        <span className="rule-id num">{f.rule}</span> {f.title}
      </td>
      <td>{f.detail}</td>
      <td className="r num">{fmtNum(f.hoursPerMonth)}</td>
      <td>
        <EvidenceChip evidence={f.evidence} />
      </td>
    </tr>
  );
}
