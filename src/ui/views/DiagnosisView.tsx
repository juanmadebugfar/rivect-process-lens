import { useMemo } from 'react';
import { buildDiagnosis } from '../../domain/diagnosis';
import { diagnosisToMarkdown } from '../../domain/markdown';
import { exportToJson } from '../../domain/serialize';
import type { Project } from '../../domain/types';
import { useStore } from '../../state/store';
import type { Analysis } from '../analysis';
import { TextField } from '../components/fields';
import { downloadText, slug } from '../fileio';
import { Report } from './Report';

export function DiagnosisView({ project, analysis }: { project: Project; analysis: Analysis }) {
  const patchMeta = useStore((s) => s.patchMeta);
  const notify = useStore((s) => s.notify);
  const diagnosis = useMemo(() => buildDiagnosis(project, analysis.calc), [project, analysis.calc]);
  const base = `diagnostico-${slug(project.meta.clientName || project.name)}`;

  return (
    <div className="diagnosis-view">
      <aside className="d-side no-print" aria-label="Datos del informe">
        <h2 className="panel-title">Datos del informe</h2>
        <TextField label="Cliente" value={project.meta.clientName} maxLength={160} onChange={(clientName) => patchMeta({ clientName })} testId="meta-client" />
        <TextField label="Preparado por" value={project.meta.preparedBy} maxLength={160} onChange={(preparedBy) => patchMeta({ preparedBy })} />
        <TextField label="Fecha de la reunión" value={project.meta.meetingDate} maxLength={20} onChange={(meetingDate) => patchMeta({ meetingDate })} placeholder="AAAA-MM-DD" />
        <TextField label="Contexto" multiline rows={4} value={project.meta.context} maxLength={3000} onChange={(context) => patchMeta({ context })} testId="meta-context" />
        <TextField
          label="Siguientes pasos (uno por línea)"
          multiline
          rows={5}
          value={project.meta.nextSteps.join('\n')}
          onChange={(v) => patchMeta({ nextSteps: v.split('\n').slice(0, 20) })}
          testId="meta-steps"
          hint="Se suman a los pasos que la herramienta deriva de los datos."
        />
        <TextField label="Observaciones" multiline rows={3} value={project.meta.observations} maxLength={3000} onChange={(observations) => patchMeta({ observations })} />

        <h2 className="panel-title spaced">Exportar</h2>
        <div className="stack">
          <button type="button" className="btn primary" data-testid="print" onClick={() => window.print()}>
            Imprimir / guardar PDF
          </button>
          <button
            type="button"
            className="btn"
            data-testid="download-md"
            onClick={() => {
              downloadText(`${base}.md`, diagnosisToMarkdown(diagnosis), 'text/markdown');
              notify('success', 'Diagnóstico descargado en Markdown.');
            }}
          >
            Descargar Markdown
          </button>
          <button
            type="button"
            className="btn"
            data-testid="download-json"
            onClick={() => {
              downloadText(`${slug(project.name)}.rivect.json`, exportToJson([project]), 'application/json');
              notify('success', 'Datos del proceso exportados (JSON).');
            }}
          >
            Exportar datos (JSON)
          </button>
        </div>
        <p className="muted small">
          En el diálogo de impresión elija “Guardar como PDF”. El informe se imprime sin la interfaz de la aplicación.
        </p>
      </aside>
      <div className="d-paper">
        <Report d={diagnosis} hoursPerDay={project.hoursPerDay} />
      </div>
    </div>
  );
}
