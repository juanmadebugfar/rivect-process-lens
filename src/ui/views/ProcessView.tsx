import { useState } from 'react';
import type { Project } from '../../domain/types';
import { useStore } from '../../state/store';
import type { Analysis } from '../analysis';
import { Segmented } from '../components/fields';
import { Inspector } from './Inspector';
import { SimHud } from './SimHud';
import { useSimulation } from './useSimulation';
import { ProcessCanvas } from './ProcessCanvas';
import { StageList } from './StageList';

export function ProcessView({ project, analysis }: { project: Project; analysis: Analysis }) {
  const [mode, setMode] = useState<'actual' | 'propuesto'>('actual');
  const [listOpen, setListOpen] = useState(() => window.innerWidth >= 1680 || window.innerWidth <= 1100);
  const addStage = useStore((s) => s.addStage);
  const arrange = useStore((s) => s.arrange);
  const hasProposal = analysis.calc.solutionsUsed.length > 0;
  const simulation = useSimulation(project, analysis.calc, mode);

  return (
    <div className={`process-view ${listOpen ? 'list-open' : ''}`}>
      {listOpen ? (
        <div className="p-list" id="stage-list-panel">
          <StageList project={project} analysis={analysis} />
        </div>
      ) : null}
      <section className="p-canvas" aria-label="Flujo del proceso">
        <div className="canvas-bar">
          <button type="button" className="btn primary" data-testid="add-stage" onClick={() => addStage()}>
            + Agregar etapa
          </button>
          <button type="button" className="btn" data-testid="toggle-list" aria-expanded={listOpen} aria-controls="stage-list-panel" onClick={() => setListOpen((o) => !o)}>
            Lista de etapas
          </button>
          <button type="button" className="btn" data-testid="arrange" onClick={arrange} disabled={project.stages.length < 2}>
            Ordenar
          </button>
          <button type="button" className="btn" data-testid="simulate" onClick={simulation.start} disabled={project.stages.length === 0}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" fill="currentColor">
              <path d="M1.5 0.8v8.4L9 5z" />
            </svg>
            Simular recorrido
          </button>
          <div className="spacer" />
          <Segmented
            compact
            label="Vista"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'actual', label: 'Actual' },
              { value: 'propuesto', label: 'Propuesto', title: hasProposal ? 'Valores con las soluciones del escenario' : 'Defina soluciones en la pestaña Escenario' },
            ]}
          />
        </div>
        {mode === 'propuesto' && !hasProposal ? (
          <p className="canvas-note">Todavía no hay soluciones asignadas: la vista propuesta es igual a la actual. Asígnelas en la pestaña Escenario.</p>
        ) : null}
        <ProcessCanvas project={project} analysis={analysis} mode={mode} sim={simulation.state} />
        {simulation.state ? (
          <SimHud
            sim={simulation.state}
            hoursPerDay={project.hoursPerDay}
            clockRef={simulation.clockRef}
            barRef={simulation.barRef}
            onStop={simulation.stop}
            onReplay={simulation.start}
          />
        ) : null}
      </section>
      <div className="p-inspector">
        <Inspector project={project} analysis={analysis} />
      </div>
    </div>
  );
}
