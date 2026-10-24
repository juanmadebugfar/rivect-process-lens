import { fmtHours, fmtLead, fmtMoney } from '../domain/format';
import type { Project } from '../domain/types';
import type { Analysis } from './analysis';
import { AnimatedNumber } from './components/AnimatedNumber';

export function KpiStrip({ project, analysis }: { project: Project; analysis: Analysis }) {
  const { calc } = analysis;
  const hasProposal = calc.solutionsUsed.length > 0;
  const money = (n: number) => fmtMoney(n, project.currency);
  const lead = (n: number) => fmtLead(n, project.hoursPerDay);
  return (
    <section className="kpis" aria-label="Indicadores del proceso" data-testid="kpis">
      <Kpi label="Trabajo por mes" value={calc.current.hoursPerMonth} next={hasProposal ? calc.proposed.hoursPerMonth : null} format={fmtHours} testId="kpi-hours" />
      <Kpi label="Costo del tiempo por mes" value={calc.current.costPerMonth} next={hasProposal ? calc.proposed.costPerMonth : null} format={money} testId="kpi-cost" />
      <Kpi label="Tiempo de ciclo" value={calc.current.cycleHours} next={hasProposal ? calc.proposed.cycleHours : null} format={lead} testId="kpi-cycle" />
      <Kpi label="Neto mensual estimado" value={hasProposal ? calc.savings.netPerMonth : null} format={money} note={hasProposal ? 'hipótesis' : 'sin escenario'} testId="kpi-net" />
    </section>
  );
}

interface KpiProps {
  label: string;
  value: number | null;
  next?: number | null;
  format: (n: number) => string;
  note?: string;
  testId: string;
}

function Kpi({ label, value, next, format, note, testId }: KpiProps) {
  return (
    <div className="kpi" data-testid={testId}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value num">
        {value === null ? '—' : <AnimatedNumber value={value} format={format} />}
        {next !== null && next !== undefined ? (
          <>
            <span aria-hidden="true" className="arrow">
              →
            </span>
            <span className="sr-only"> propuesto </span>
            <AnimatedNumber value={next} format={format} className="next" />
          </>
        ) : null}
      </span>
      {note ? <span className="kpi-note">{note}</span> : null}
    </div>
  );
}
