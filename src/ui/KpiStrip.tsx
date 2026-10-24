import { fmtHours, fmtLead, fmtMoney } from '../domain/format';
import type { Project } from '../domain/types';
import type { Analysis } from './analysis';

export function KpiStrip({ project, analysis }: { project: Project; analysis: Analysis }) {
  const { calc } = analysis;
  const hasProposal = calc.solutionsUsed.length > 0;
  const money = (n: number) => fmtMoney(n, project.currency);
  return (
    <section className="kpis" aria-label="Indicadores del proceso" data-testid="kpis">
      <Kpi label="Trabajo por mes" value={fmtHours(calc.current.hoursPerMonth)} next={hasProposal ? fmtHours(calc.proposed.hoursPerMonth) : null} testId="kpi-hours" />
      <Kpi label="Costo del tiempo por mes" value={money(calc.current.costPerMonth)} next={hasProposal ? money(calc.proposed.costPerMonth) : null} testId="kpi-cost" />
      <Kpi label="Tiempo de ciclo" value={fmtLead(calc.current.cycleHours, project.hoursPerDay)} next={hasProposal ? fmtLead(calc.proposed.cycleHours, project.hoursPerDay) : null} testId="kpi-cycle" />
      <Kpi
        label="Neto mensual estimado"
        value={hasProposal ? money(calc.savings.netPerMonth) : '—'}
        note={hasProposal ? 'hipótesis' : 'sin escenario'}
        testId="kpi-net"
      />
    </section>
  );
}

function Kpi({ label, value, next, note, testId }: { label: string; value: string; next?: string | null; note?: string; testId: string }) {
  return (
    <div className="kpi" data-testid={testId}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value num">
        {value}
        {next ? (
          <>
            <span aria-hidden="true" className="arrow">
              →
            </span>
            <span className="sr-only"> propuesto </span>
            <span className="next">{next}</span>
          </>
        ) : null}
      </span>
      {note ? <span className="kpi-note">{note}</span> : null}
    </div>
  );
}
