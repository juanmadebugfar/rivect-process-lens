import { useState } from 'react';
import { fitsActivity, sensitivity } from '../../domain/calc';
import { ACTIVITY_LABELS, EVIDENCE_LABELS, SOLUTIONS } from '../../domain/constants';
import { fmtHours, fmtLead, fmtMoney, fmtMonths, fmtNum, fmtPct } from '../../domain/format';
import { SOLUTION_IDS, type Evidence, type Project, type SolutionId, type Stage } from '../../domain/types';
import { useStore } from '../../state/store';
import type { Analysis } from '../analysis';
import { NumberField, RangeField, SelectField } from '../components/fields';

export function ScenarioView({ project, analysis }: { project: Project; analysis: Analysis }) {
  const patchProposal = useStore((s) => s.patchProposal);
  const { calc } = analysis;
  const money = (n: number) => fmtMoney(n, project.currency);
  const hasProposal = calc.solutionsUsed.length > 0;
  const maxHours = Math.max(1, ...calc.stages.map((s) => s.hoursPerMonth));

  return (
    <div className="scenario-view">
      <aside className="s-vars" aria-label="Variables del escenario">
        <h2 className="panel-title">Variables</h2>
        <RangeField
          label="Factor de realización"
          value={project.proposal.realizationPct}
          onChange={(realizationPct) => patchProposal({ realizationPct })}
          testId="realization"
          hint="Qué parte del potencial se logra en la práctica (adopción, madurez, cambios del equipo). Es una hipótesis: pruebe distintos valores."
        />
        <NumberField label="Horizonte de evaluación" unit="meses" value={project.proposal.horizonMonths} min={1} max={120} onChange={(horizonMonths) => patchProposal({ horizonMonths })} testId="horizon" />

        <h2 className="panel-title spaced">Soluciones en uso</h2>
        {calc.solutionsUsed.length === 0 ? <p className="muted small">Asigne una solución a una etapa en la tabla para empezar a simular.</p> : null}
        {calc.solutionsUsed.map((u) => (
          <SolutionConfig key={u.solutionId} project={project} solutionId={u.solutionId} stageCount={u.stageIds.length} />
        ))}
      </aside>

      <div className="s-main">
        <section className="result-panel" aria-label="Resultado del escenario" data-testid="result-panel">
          <h2 className="group-title">Resultado estimado</h2>
          <p className="honesty">
            Estimación bajo supuestos. No es un ahorro demostrado: depende de que los datos de entrada y las hipótesis se confirmen.
          </p>
          <dl className="result-lines">
            <div>
              <dt>Capacidad liberada valorizada</dt>
              <dd className="num" data-testid="res-gross">
                {money(calc.savings.grossCostPerMonth)}/mes
              </dd>
            </div>
            <div>
              <dt>Mantenimiento de las soluciones</dt>
              <dd className="num">−{money(calc.savings.runCostPerMonth)}/mes</dd>
            </div>
            <div className="total">
              <dt>Neto mensual</dt>
              <dd className="num" data-testid="res-net">
                {money(calc.savings.netPerMonth)}/mes
              </dd>
            </div>
            <div>
              <dt>Inversión inicial de referencia</dt>
              <dd className="num" data-testid="res-setup">
                {money(calc.savings.setupCost)}
              </dd>
            </div>
            <div>
              <dt>Recupero</dt>
              <dd className="num" data-testid="res-payback">
                {hasProposal ? fmtMonths(calc.savings.paybackMonths) : '—'}
              </dd>
            </div>
            <div>
              <dt>Neto a {project.proposal.horizonMonths} meses</dt>
              <dd className="num" data-testid="res-horizon">
                {money(calc.savings.horizonNet)}
              </dd>
            </div>
          </dl>
          {hasProposal && calc.savings.netPerMonth <= 0 ? (
            <p className="issue-line" role="status">
              Con estas variables el neto mensual no es positivo: las soluciones no se pagan solas. Revise cobertura, costos o qué etapas conviene mejorar.
            </p>
          ) : null}
          {calc.mismatches.length > 0 ? (
            <p className="issue-line" role="status">
              {calc.mismatches.length} etapa(s) tienen una solución que no está pensada para su tipo de actividad.
            </p>
          ) : null}
        </section>

        <section aria-label="Comparativa por etapa">
          <h2 className="group-title">Comparativa por etapa</h2>
          <div className="table-wrap">
            <table className="table compare-table">
              <thead>
                <tr>
                  <th scope="col">Etapa</th>
                  <th scope="col">Solución propuesta</th>
                  <th scope="col" className="r">
                    Actual
                  </th>
                  <th scope="col" className="r">
                    Propuesto
                  </th>
                  <th scope="col" className="bars-col">
                    <span className="sr-only">Gráfico</span>
                    <span className="legend-inline" aria-hidden="true">
                      <i className="sw cur" /> actual <i className="sw pro" /> propuesto
                    </span>
                  </th>
                  <th scope="col" className="r">
                    Tiempo transcurrido
                  </th>
                </tr>
              </thead>
              <tbody>
                {project.stages.map((s) => (
                  <CompareRow key={s.id} stage={s} project={project} analysis={analysis} maxHours={maxHours} />
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={2}>
                    Total (h/mes)
                  </th>
                  <td className="r num">{fmtNum(calc.current.hoursPerMonth)}</td>
                  <td className="r num" data-testid="total-proposed-hours">
                    {fmtNum(calc.proposed.hoursPerMonth)}
                  </td>
                  <td />
                  <td className="r num">
                    {fmtLead(calc.current.cycleHours, project.hoursPerDay)} → {fmtLead(calc.proposed.cycleHours, project.hoursPerDay)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <div className="s-two">
          <EvidencePanel analysis={analysis} />
          <SensitivityPanel project={project} />
        </div>

        <ExplainPanel project={project} analysis={analysis} />
      </div>
    </div>
  );
}

function CompareRow({ stage, project, analysis, maxHours }: { stage: Stage; project: Project; analysis: Analysis; maxHours: number }) {
  const assignSolution = useStore((s) => s.assignSolution);
  const c = analysis.calc.byId.get(stage.id);
  const current = project.proposal.assignments[stage.id] ?? '';
  const mismatch = current !== '' && !fitsActivity(current as SolutionId, stage);
  const delta = c ? c.proposed.savedHoursPerMonth : 0;
  return (
    <tr data-testid="compare-row" data-stage={stage.name}>
      <th scope="row" className="stage-cell">
        <span>{stage.name}</span>
        <span className="muted small">{ACTIVITY_LABELS[stage.activity]}</span>
      </th>
      <td>
        <SelectField
          label={`Solución para ${stage.name}`}
          value={current}
          className="bare"
          options={[
            { value: '', label: '— Sin solución —' },
            ...SOLUTION_IDS.map((id) => ({
              value: id,
              label: `${SOLUTIONS[id].name}${fitsActivity(id, stage) ? '' : ' (no recomendada)'}`,
            })),
          ]}
          onChange={(v) => assignSolution(stage.id, v === '' ? null : (v as SolutionId))}
          testId="assign-solution"
          hint={mismatch ? 'No pensada para este tipo de actividad.' : undefined}
        />
      </td>
      <td className="r num">{fmtNum(c?.hoursPerMonth ?? 0)}</td>
      <td className="r num">
        {fmtNum(c?.proposed.hoursPerMonth ?? 0)}
        {delta > 0.005 ? <span className="delta-pill"> −{fmtNum(delta)}</span> : null}
      </td>
      <td className="bars-col" aria-hidden="true">
        <div className="pair">
          <span className="bar cur" style={{ width: `${((c?.hoursPerMonth ?? 0) / maxHours) * 100}%` }} />
          <span className="bar pro" style={{ width: `${((c?.proposed.hoursPerMonth ?? 0) / maxHours) * 100}%` }} />
        </div>
      </td>
      <td className="r num lead">
        {fmtLead(c?.leadHours ?? 0, project.hoursPerDay)}
        {c && Math.abs(c.leadHours - c.proposed.leadHours) > 0.01 ? ` → ${fmtLead(c.proposed.leadHours, project.hoursPerDay)}` : ''}
      </td>
    </tr>
  );
}

function SolutionConfig({ project, solutionId, stageCount }: { project: Project; solutionId: SolutionId; stageCount: number }) {
  const updateSolution = useStore((s) => s.updateSolution);
  const cfg = project.proposal.solutions[solutionId];
  if (!cfg) return null;
  return (
    <section className="solution-card" aria-label={SOLUTIONS[solutionId].name} data-testid="solution-card">
      <h3>{SOLUTIONS[solutionId].name}</h3>
      <p className="muted small">
        {SOLUTIONS[solutionId].summary} Aplicada en {stageCount} etapa{stageCount === 1 ? '' : 's'}.
      </p>
      <RangeField label="Cobertura del potencial" value={cfg.coveragePct} onChange={(coveragePct) => updateSolution(solutionId, { coveragePct })} hint="Qué parte de lo automatizable cubre esta solución." testId={`coverage-${solutionId}`} />
      <RangeField label="Reducción de la espera" value={cfg.waitReductionPct} onChange={(waitReductionPct) => updateSolution(solutionId, { waitReductionPct })} testId={`wait-${solutionId}`} />
      <div className="grid-2">
        <NumberField label="Inversión inicial" unit={project.currency} value={cfg.setupCost} onChange={(setupCost) => updateSolution(solutionId, { setupCost })} testId={`setup-${solutionId}`} hint="Referencia a cotizar." />
        <NumberField label="Mantenimiento" unit={`${project.currency}/mes`} value={cfg.monthlyCost} onChange={(monthlyCost) => updateSolution(solutionId, { monthlyCost })} testId={`monthly-${solutionId}`} />
      </div>
    </section>
  );
}

function EvidencePanel({ analysis }: { analysis: Analysis }) {
  const share = analysis.calc.evidenceShare;
  const order: Evidence[] = ['medido', 'declarado', 'supuesto'];
  return (
    <section className="evidence-panel" aria-label="Evidencia e hipótesis">
      <h2 className="group-title">Qué se sabe y qué se supone</h2>
      <div className="stack-bar" role="img" aria-label={order.map((e) => `${EVIDENCE_LABELS[e]} ${fmtPct(share[e] * 100)}`).join(', ')}>
        {order.map((e) => (
          <span key={e} className={`seg ${e}`} style={{ width: `${share[e] * 100}%` }} />
        ))}
      </div>
      <ul className="evidence-list">
        {order.map((e) => (
          <li key={e}>
            <i className={`sw ${e}`} />
            <span>{EVIDENCE_LABELS[e]}</span>
            <span className="num">{fmtPct(share[e] * 100)} de las horas</span>
          </li>
        ))}
      </ul>
      <p className="muted small">
        El tiempo actual combina datos medidos, declarados y supuestos. El potencial de automatización, la cobertura de cada solución y el factor de realización son siempre hipótesis.
      </p>
    </section>
  );
}

function SensitivityPanel({ project }: { project: Project }) {
  const rows = sensitivity(project);
  const money = (n: number) => fmtMoney(n, project.currency);
  return (
    <section aria-label="Sensibilidad" data-testid="sensitivity">
      <h2 className="group-title">Sensibilidad al factor de realización</h2>
      <div className="table-wrap">
<table className="table sens-table">
        <thead>
          <tr>
            <th scope="col">Realización</th>
            <th scope="col" className="r">
              Horas liberadas
            </th>
            <th scope="col" className="r">
              Neto/mes
            </th>
            <th scope="col" className="r">
              Recupero
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.realizationPct} className={r.realizationPct === project.proposal.realizationPct ? 'base' : ''}>
              <th scope="row" className="num">
                {fmtPct(r.realizationPct)}
                {r.realizationPct === project.proposal.realizationPct ? ' (base)' : r.realizationPct === 100 ? ' (techo)' : ''}
              </th>
              <td className="r num">{fmtHours(r.savedHoursPerMonth)}</td>
              <td className="r num">{money(r.netPerMonth)}</td>
              <td className="r num">{fmtMonths(r.paybackMonths)}</td>
            </tr>
          ))}
        </tbody>
      </table>
</div>
    </section>
  );
}

function ExplainPanel({ project, analysis }: { project: Project; analysis: Analysis }) {
  const best = [...analysis.calc.stages].sort((a, b) => b.proposed.savedHoursPerMonth - a.proposed.savedHoursPerMonth)[0];
  const [pickedId, setPicked] = useState<string>('');
  const stageId = project.stages.some((s) => s.id === pickedId) ? pickedId : (best?.id ?? project.stages[0]?.id ?? '');
  const stage = project.stages.find((s) => s.id === stageId);
  const c = stage ? analysis.calc.byId.get(stage.id) : undefined;
  if (!stage || !c) return null;
  const cfg = c.proposed.solutionId ? project.proposal.solutions[c.proposed.solutionId] : undefined;
  const r = project.proposal.realizationPct;
  const f = (n: number, d = 1) => fmtNum(n, d);
  const unitTxt = stage.frequency.unit === 'dia' ? `${f(stage.frequency.count)} × ${f(project.workdaysPerMonth)} días hábiles` : stage.frequency.unit === 'semana' ? `${f(stage.frequency.count)} × ${f(project.workdaysPerMonth)} ÷ 5` : `${f(stage.frequency.count)} por mes`;
  const lines: Array<[string, string]> = [
    ['Ocurrencias por mes', `${unitTxt} = ${f(c.occurrences)}`],
    ['Minutos efectivos', `${f(stage.activeMinutes)} × (1 + ${f(stage.reworkPct, 0)}%) = ${f(c.effectiveMinutes)} min`],
    ['Horas de trabajo por mes', `${f(c.effectiveMinutes)} × ${f(stage.people)} personas × ${f(c.occurrences)} ÷ 60 = ${f(c.hoursPerMonth)} h`],
    ['Costo del tiempo por mes', `${f(c.hoursPerMonth)} h × ${fmtMoney(c.hourlyCost, project.currency)} = ${fmtMoney(c.costPerMonth, project.currency)}`],
  ];
  if (cfg) {
    lines.push(
      ['Reducción del trabajo', `${f(stage.manualPct, 0)}% manual × ${f(stage.automationPotential, 0)}% potencial × ${f(cfg.coveragePct, 0)}% cobertura × ${f(r, 0)}% realización = ${f(c.proposed.activeReduction * 100)}%`],
      ['Horas propuestas por mes', `${f(c.hoursPerMonth)} h × (1 − ${f(c.proposed.activeReduction * 100)}%) = ${f(c.proposed.hoursPerMonth)} h`],
      ['Espera propuesta', `${f(stage.waitHours)} h × (1 − ${f(cfg.waitReductionPct, 0)}% × ${f(r, 0)}%) = ${f(c.proposed.waitHours)} h`],
    );
  } else {
    lines.push(['Escenario propuesto', 'Sin solución asignada: la etapa no cambia.']);
  }
  return (
    <section className="explain" aria-label="Cálculo paso a paso" data-testid="explain">
      <div className="explain-head">
        <h2 className="group-title">Cálculo paso a paso</h2>
        <SelectField label="Etapa" value={stageId} options={project.stages.map((s) => ({ value: s.id, label: s.name }))} onChange={setPicked} className="inline" />
      </div>
      <ol className="steps">
        {lines.map(([k, v]) => (
          <li key={k}>
            <span className="k">{k}</span>
            <code>{v}</code>
          </li>
        ))}
      </ol>
    </section>
  );
}
