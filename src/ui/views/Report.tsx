import { EVIDENCE_LABELS } from '../../domain/constants';
import type { Diagnosis } from '../../domain/diagnosis';
import { fmtHours, fmtLead, fmtMoney, fmtMonths, fmtNum, fmtPct } from '../../domain/format';
import { EvidenceChip } from '../components/Chips';

/** Vista imprimible del diagnóstico. Se imprime tal cual (CSS @media print). */
export function Report({ d, hoursPerDay }: { d: Diagnosis; hoursPerDay: number }) {
  const m = (n: number) => fmtMoney(n, d.currency);
  const maxShare = Math.max(1, ...d.process.map((p) => p.sharePct));
  return (
    <article className="report" id="report" aria-label="Diagnóstico preliminar" data-testid="report">
      <header className="r-head">
        <div className="r-brand">RIVECT · Process Lens</div>
        <h1>{d.title}</h1>
        <p className="r-client" data-testid="report-client">
          {d.clientName}
        </p>
        <dl className="r-meta">
          <div>
            <dt>Sector</dt>
            <dd>{d.sector}</dd>
          </div>
          {d.meetingDate ? (
            <div>
              <dt>Fecha</dt>
              <dd>{d.meetingDate}</dd>
            </div>
          ) : null}
          {d.preparedBy ? (
            <div>
              <dt>Preparado por</dt>
              <dd>{d.preparedBy}</dd>
            </div>
          ) : null}
        </dl>
        {d.fictional ? (
          <p className="r-fictional" role="note">
            Datos ficticios — caso ilustrativo. No describe a ninguna organización real.
          </p>
        ) : null}
      </header>

      {d.context ? (
        <section>
          <h2>Contexto</h2>
          <p>{d.context}</p>
        </section>
      ) : null}

      <section>
        <h2>Resumen</h2>
        <ul className="r-summary">
          {d.summary.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Proceso actual</h2>
        <div className="r-scroll">
<table className="r-table">
          <thead>
            <tr>
              <th scope="col">Etapa</th>
              <th scope="col">Rol</th>
              <th scope="col" className="r">
                Veces/mes
              </th>
              <th scope="col" className="r">
                Min
              </th>
              <th scope="col" className="r">
                Espera
              </th>
              <th scope="col" className="r">
                Horas/mes
              </th>
              <th scope="col">Peso</th>
              <th scope="col">Dato</th>
            </tr>
          </thead>
          <tbody>
            {d.process.map((p) => (
              <tr key={p.stageId}>
                <th scope="row">{p.name}</th>
                <td>{p.role}</td>
                <td className="r num">{fmtNum(p.occurrences, 0)}</td>
                <td className="r num">{fmtNum(p.activeMinutes)}</td>
                <td className="r num">{p.waitHours > 0 ? `${fmtNum(p.waitHours)} h` : '—'}</td>
                <td className="r num">{fmtNum(p.hoursPerMonth)}</td>
                <td className="share-cell">
                  <span className="share" style={{ width: `${(p.sharePct / maxShare) * 100}%` }} />
                  <span className="num">{fmtPct(p.sharePct)}</span>
                </td>
                <td>
                  <EvidenceChip evidence={p.evidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
</div>
      </section>

      <section>
        <h2>Problemas identificados</h2>
        {d.problems.length === 0 ? <p>Las reglas no marcaron problemas con los umbrales actuales.</p> : null}
        {d.problems.map((p) => (
          <div key={p.stageName} className="r-problem">
            <h3>
              {p.stageName} <span className={`chip sev ${p.severity}`}>Prioridad {p.severity}</span>
            </h3>
            <ul>
              {p.items.map((i) => (
                <li key={i.rule}>
                  <strong>{i.title}</strong> <span className="rule-id num">({i.rule})</span>: {i.detail}
                </li>
              ))}
            </ul>
            <p className="r-basis">Base del dato: {EVIDENCE_LABELS[p.evidence]}.</p>
          </div>
        ))}
      </section>

      <section>
        <h2>Mejoras propuestas (hipótesis)</h2>
        {d.improvements.length === 0 ? <p>No se definió un escenario propuesto.</p> : null}
        {d.improvements.map((i) => (
          <div key={i.solutionId} className="r-improvement">
            <h3>{i.name}</h3>
            <p>{i.summary}</p>
            <ul>
              {i.stages.map((s) => (
                <li key={s.name}>
                  {s.name}: {fmtHours(s.savedHours)}/mes liberadas; tiempo transcurrido {s.leadBefore} → {s.leadAfter}.
                </li>
              ))}
              <li>
                Inversión inicial de referencia {m(i.setupCost)}; mantenimiento {m(i.monthlyCost)}/mes.
              </li>
              {i.warnings.map((w) => (
                <li key={w} className="warn">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {d.impact ? (
        <section>
          <h2>Impacto estimado (no demostrado)</h2>
          <div className="r-scroll">
<table className="r-table compact">
            <thead>
              <tr>
                <th scope="col">Indicador</th>
                <th scope="col" className="r">
                  Actual
                </th>
                <th scope="col" className="r">
                  Propuesto
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Horas de trabajo por mes</th>
                <td className="r num">{fmtHours(d.impact.currentHours)}</td>
                <td className="r num">{fmtHours(d.impact.proposedHours)}</td>
              </tr>
              <tr>
                <th scope="row">Costo del tiempo por mes</th>
                <td className="r num">{m(d.impact.currentCost)}</td>
                <td className="r num">{m(d.impact.proposedCost)}</td>
              </tr>
              <tr>
                <th scope="row">Tiempo de ciclo</th>
                <td className="r num">{fmtLead(d.impact.cycleCurrent, hoursPerDay)}</td>
                <td className="r num">{fmtLead(d.impact.cycleProposed, hoursPerDay)}</td>
              </tr>
            </tbody>
          </table>
</div>
          <p>
            Capacidad liberada valorizada {m(d.impact.grossCost)}/mes, menos mantenimiento {m(d.impact.runCost)}/mes: <strong>neto {m(d.impact.netPerMonth)}/mes</strong>. Inversión inicial de referencia {m(d.impact.setupCost)}; recupero: {fmtMonths(d.impact.paybackMonths)}; neto a {d.impact.horizonMonths} meses: {m(d.impact.horizonNet)}.
          </p>
          <h3>Sensibilidad al factor de realización</h3>
          <div className="r-scroll">
<table className="r-table compact">
            <thead>
              <tr>
                <th scope="col">Realización</th>
                <th scope="col" className="r">
                  Horas liberadas/mes
                </th>
                <th scope="col" className="r">
                  Neto/mes
                </th>
                <th scope="col" className="r">
                  Recupero
                </th>
                <th scope="col" className="r">
                  Neto al horizonte
                </th>
              </tr>
            </thead>
            <tbody>
              {d.impact.sensitivity.map((r) => (
                <tr key={r.realizationPct}>
                  <th scope="row" className="num">
                    {fmtPct(r.realizationPct)}
                  </th>
                  <td className="r num">{fmtHours(r.savedHoursPerMonth)}</td>
                  <td className="r num">{m(r.netPerMonth)}</td>
                  <td className="r num">{fmtMonths(r.paybackMonths)}</td>
                  <td className="r num">{m(r.horizonNet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        </section>
      ) : null}

      <section>
        <h2>Supuestos</h2>
        <ul className="r-small">
          {d.assumptions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Limitaciones</h2>
        <ul className="r-small">
          {d.limitations.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Siguientes pasos</h2>
        <ol>
          {d.nextSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      {d.observations ? (
        <section>
          <h2>Observaciones</h2>
          <p>{d.observations}</p>
        </section>
      ) : null}

      <footer className="r-foot">Generado con RIVECT Process Lens. Documento preliminar para conversación comercial; no constituye una oferta.</footer>
    </article>
  );
}
