import { useState } from 'react';
import { ACTIVITY_LABELS, EVIDENCE_HELP, EVIDENCE_SHORT, FREQUENCY_LABELS, SOLUTIONS } from '../../domain/constants';
import { fmtLead, fmtMoney, fmtNum } from '../../domain/format';
import { RULES } from '../../domain/findings';
import { ACTIVITY_TYPES, EVIDENCE_LEVELS, FREQUENCY_UNITS, type Project, type Stage } from '../../domain/types';
import { graphIssues } from '../../domain/graph';
import { useStore } from '../../state/store';
import type { Analysis } from '../analysis';
import { NumberField, RangeField, SelectField, Segmented, TextField } from '../components/fields';

interface Props {
  project: Project;
  analysis: Analysis;
}

export function Inspector({ project, analysis }: Props) {
  const selectedId = useStore((s) => s.selectedStageId);
  const stage = project.stages.find((s) => s.id === selectedId);
  if (!stage) return <ProcessSummary project={project} analysis={analysis} />;
  return <StageForm key={stage.id} stage={stage} project={project} analysis={analysis} />;
}

function ProcessSummary({ project, analysis }: Props) {
  const issues = graphIssues(project.stages, analysis.calc.graph);
  const { current } = analysis.calc;
  return (
    <aside className="inspector" aria-label="Resumen del proceso">
      <h2 className="panel-title">Proceso</h2>
      <p className="muted">Seleccione una etapa en el lienzo o en la lista para editarla.</p>
      <dl className="kv">
        <div>
          <dt>Etapas</dt>
          <dd className="num">{project.stages.length}</dd>
        </div>
        <div>
          <dt>Conexiones</dt>
          <dd className="num">{project.connections.length}</dd>
        </div>
        <div>
          <dt>Trabajo mensual</dt>
          <dd className="num">{fmtNum(current.hoursPerMonth, 0)} h</dd>
        </div>
        <div>
          <dt>Tiempo de ciclo</dt>
          <dd className="num">{fmtLead(current.cycleHours, project.hoursPerDay)}</dd>
        </div>
      </dl>
      {issues.length > 0 ? (
        <section aria-label="Avisos del flujo">
          <h3 className="sub-title">Avisos del flujo</h3>
          <ul className="issues">
            {issues.map((i) => (
              <li key={i.message}>{i.message}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {analysis.calc.missingRoles.length > 0 ? (
        <p className="issue-line">{analysis.calc.missingRoles.length} etapa(s) sin rol: su costo se calcula como 0.</p>
      ) : null}
      <section>
        <h3 className="sub-title">Cómo leer el lienzo</h3>
        <ul className="legend">
          <li>
            <span className="swatch dashed" /> Borde punteado: el dato es un supuesto del equipo.
          </li>
          <li>
            <span className="swatch crit" /> Conexión resaltada: camino crítico del tiempo de ciclo.
          </li>
          <li>
            <span className="swatch bar" /> Barra inferior: % del tiempo activo que es manual.
          </li>
        </ul>
      </section>
    </aside>
  );
}

function StageForm({ stage, project, analysis }: { stage: Stage; project: Project; analysis: Analysis }) {
  const updateStage = useStore((s) => s.updateStage);
  const removeStage = useStore((s) => s.removeStage);
  const connect = useStore((s) => s.connect);
  const disconnect = useStore((s) => s.disconnect);
  const selectStage = useStore((s) => s.selectStage);
  const [target, setTarget] = useState('');
  const set = (patch: Partial<Stage>) => updateStage(stage.id, patch);
  const calc = analysis.calc.byId.get(stage.id);
  const stageFindings = analysis.findings.filter((f) => f.stageId === stage.id);
  const nameOf = (id: string) => project.stages.find((s) => s.id === id)?.name ?? id;
  const incoming = project.connections.filter((c) => c.target === stage.id);
  const outgoing = project.connections.filter((c) => c.source === stage.id);
  const candidates = project.stages.filter(
    (s) => s.id !== stage.id && !outgoing.some((c) => c.target === s.id),
  );

  return (
    <aside className="inspector" aria-label={`Editar etapa ${stage.name}`} data-testid="inspector">
      <div className="panel-head">
        <h2 className="panel-title">Etapa</h2>
        <button type="button" className="btn ghost danger" data-testid="delete-stage" onClick={() => removeStage(stage.id)}>
          Eliminar
        </button>
      </div>

      <TextField label="Nombre" value={stage.name} maxLength={120} onChange={(name) => set({ name })} testId="stage-name" />

      <div className="grid-1">
        <SelectField
          label="Rol"
          value={stage.roleId ?? ''}
          options={[{ value: '', label: 'Sin rol' }, ...project.roles.map((r) => ({ value: r.id, label: r.name }))]}
          onChange={(v) => set({ roleId: v === '' ? null : v })}
          hint={stage.roleId ? undefined : 'Sin rol: el costo de esta etapa se calcula como 0.'}
          testId="stage-role"
        />
        <SelectField
          label="Tipo de actividad"
          value={stage.activity}
          options={ACTIVITY_TYPES.map((a) => ({ value: a, label: ACTIVITY_LABELS[a] }))}
          onChange={(activity) => set({ activity })}
          testId="stage-activity"
        />
      </div>

      <fieldset className="group">
        <legend>Tiempo y frecuencia</legend>
        <div className="grid-2">
          <NumberField label="Trabajo activo" unit="min" value={stage.activeMinutes} onChange={(activeMinutes) => set({ activeMinutes })} testId="stage-minutes" hint="Por ocurrencia, sin retrabajo." />
          <NumberField label="Espera" unit="h hábiles" value={stage.waitHours} onChange={(waitHours) => set({ waitHours })} testId="stage-wait" hint="No consume horas de trabajo." />
        </div>
        <div className="grid-2">
          <NumberField label="Frecuencia" value={stage.frequency.count} onChange={(count) => set({ frequency: { ...stage.frequency, count } })} testId="stage-freq" />
          <SelectField
            label="Unidad"
            value={stage.frequency.unit}
            options={FREQUENCY_UNITS.map((u) => ({ value: u, label: FREQUENCY_LABELS[u] }))}
            onChange={(unit) => set({ frequency: { ...stage.frequency, unit } })}
            testId="stage-freq-unit"
          />
        </div>
        <div className="grid-2">
          <NumberField label="Personas" value={stage.people} onChange={(people) => set({ people })} testId="stage-people" hint="Trabajan en simultáneo." />
          <NumberField label="Retrabajo" unit="%" value={stage.reworkPct} max={100} onChange={(reworkPct) => set({ reworkPct })} testId="stage-rework" hint="Ocurrencias que se rehacen." />
        </div>
      </fieldset>

      <fieldset className="group">
        <legend>Automatización</legend>
        <RangeField label="Intervención manual" value={stage.manualPct} onChange={(manualPct) => set({ manualPct })} testId="stage-manual" hint="% del tiempo activo hecho a mano." />
        <RangeField
          label="Potencial de automatización"
          value={stage.automationPotential}
          onChange={(automationPotential) => set({ automationPotential })}
          testId="stage-potential"
          hint="Hipótesis: % del trabajo manual que la tecnología podría absorber."
        />
      </fieldset>

      <Segmented
        label="Procedencia del dato"
        value={stage.evidence}
        options={EVIDENCE_LEVELS.map((e) => ({ value: e, label: EVIDENCE_SHORT[e], title: EVIDENCE_HELP[e] }))}
        onChange={(evidence) => set({ evidence })}
        hint={EVIDENCE_HELP[stage.evidence]}
      />

      <TextField label="Notas" multiline rows={2} value={stage.notes} maxLength={2000} onChange={(notes) => set({ notes })} />

      <fieldset className="group">
        <legend>Conexiones</legend>
        <ConnList title="Recibe de" items={incoming.map((c) => ({ id: c.id, label: nameOf(c.source), stageId: c.source }))} onRemove={disconnect} onOpen={selectStage} />
        <ConnList title="Envía a" items={outgoing.map((c) => ({ id: c.id, label: nameOf(c.target), stageId: c.target }))} onRemove={disconnect} onOpen={selectStage} />
        {candidates.length > 0 ? (
          <div className="connect-row">
            <SelectField
              label="Conectar con"
              value={target}
              options={[{ value: '', label: 'Elegir etapa…' }, ...candidates.map((s) => ({ value: s.id, label: s.name }))]}
              onChange={setTarget}
              testId="connect-target"
            />
            <button
              type="button"
              className="btn"
              data-testid="connect-add"
              disabled={!target}
              onClick={() => {
                if (target && connect(stage.id, target)) setTarget('');
              }}
            >
              Conectar
            </button>
          </div>
        ) : null}
      </fieldset>

      {calc ? (
        <section className="computed" aria-label="Resultado calculado de la etapa">
          <h3 className="sub-title">Calculado</h3>
          <dl className="kv">
            <div>
              <dt>Horas por mes</dt>
              <dd className="num" data-testid="stage-hours">
                {fmtNum(calc.hoursPerMonth)} h
              </dd>
            </div>
            <div>
              <dt>Costo del tiempo</dt>
              <dd className="num">{fmtMoney(calc.costPerMonth, project.currency)}/mes</dd>
            </div>
            <div>
              <dt>Ocurrencias</dt>
              <dd className="num">{fmtNum(calc.occurrences, 1)}/mes</dd>
            </div>
            <div>
              <dt>Tiempo transcurrido</dt>
              <dd className="num">{fmtLead(calc.leadHours, project.hoursPerDay)}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {stageFindings.length > 0 ? (
        <section aria-label="Hallazgos de la etapa">
          <h3 className="sub-title">Reglas que marcan esta etapa</h3>
          <ul className="finding-mini">
            {stageFindings.map((f) => (
              <li key={f.id}>
                <strong>
                  {f.rule} · {RULES[f.rule].title}
                </strong>
                <span>{f.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {analysis.calc.byId.get(stage.id)?.proposed.solutionId ? (
        <p className="muted small">
          Solución propuesta: {SOLUTIONS[analysis.calc.byId.get(stage.id)?.proposed.solutionId ?? 'portal_recepcion'].name}
        </p>
      ) : null}
    </aside>
  );
}

function ConnList({
  title,
  items,
  onRemove,
  onOpen,
}: {
  title: string;
  items: Array<{ id: string; label: string; stageId: string }>;
  onRemove: (id: string) => void;
  onOpen: (stageId: string) => void;
}) {
  return (
    <div className="conn-list">
      <h4>{title}</h4>
      {items.length === 0 ? (
        <p className="muted small">Ninguna</p>
      ) : (
        <ul>
          {items.map((i) => (
            <li key={i.id}>
              <button type="button" className="link" onClick={() => onOpen(i.stageId)}>
                {i.label}
              </button>
              <button type="button" className="btn ghost icon" aria-label={`Quitar conexión con ${i.label}`} data-testid="disconnect" onClick={() => onRemove(i.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
