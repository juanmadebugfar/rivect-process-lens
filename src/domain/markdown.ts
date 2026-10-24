import type { Diagnosis } from './diagnosis';
import { EVIDENCE_LABELS } from './constants';
import { fmtHours, fmtMoney, fmtMonths, fmtNum, fmtPct } from './format';

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function diagnosisToMarkdown(d: Diagnosis): string {
  const m = (n: number) => fmtMoney(n, d.currency);
  const out: string[] = [];
  out.push(`# ${d.title}`, '');
  if (d.fictional) out.push('> **Datos ficticios — caso ilustrativo.** No describe a ninguna organización real.', '');
  out.push(`**Cliente:** ${d.clientName}  `, `**Sector:** ${d.sector}  `);
  if (d.meetingDate) out.push(`**Fecha:** ${d.meetingDate}  `);
  if (d.preparedBy) out.push(`**Preparado por:** ${d.preparedBy}  `);
  out.push('');
  if (d.context) out.push('## Contexto', '', d.context, '');

  out.push('## Resumen', '', ...d.summary.map((s) => `- ${s}`), '');

  out.push('## Proceso actual', '');
  out.push('| Etapa | Rol | Veces/mes | Min activos | Espera (h) | Horas/mes | % del total | Dato |');
  out.push('|---|---|---:|---:|---:|---:|---:|---|');
  for (const p of d.process) {
    out.push(
      `| ${esc(p.name)} | ${esc(p.role)} | ${fmtNum(p.occurrences)} | ${fmtNum(p.activeMinutes)} | ${fmtNum(p.waitHours)} | ${fmtNum(p.hoursPerMonth)} | ${fmtPct(p.sharePct)} | ${EVIDENCE_LABELS[p.evidence]} |`,
    );
  }
  out.push('');

  out.push('## Problemas identificados', '');
  if (d.problems.length === 0) out.push('Las reglas no marcaron problemas con los umbrales actuales.', '');
  for (const p of d.problems) {
    out.push(`### ${p.stageName} — prioridad ${p.severity}`, '');
    for (const i of p.items) out.push(`- **${i.title}** (regla ${i.rule}): ${i.detail}`);
    out.push(`- Base del dato: ${EVIDENCE_LABELS[p.evidence]}.`, '');
  }

  out.push('## Mejoras propuestas (hipótesis)', '');
  if (d.improvements.length === 0) out.push('No se definió un escenario propuesto.', '');
  for (const i of d.improvements) {
    out.push(`### ${i.name}`, '', i.summary, '');
    for (const s of i.stages) {
      out.push(`- ${s.name}: ${fmtHours(s.savedHours)}/mes liberadas (tiempo transcurrido ${s.leadBefore} → ${s.leadAfter}).`);
    }
    out.push(`- Inversión inicial de referencia: ${m(i.setupCost)}; mantenimiento: ${m(i.monthlyCost)}/mes.`);
    for (const w of i.warnings) out.push(`- ⚠ ${w}`);
    out.push('');
  }

  if (d.impact) {
    const x = d.impact;
    out.push('## Impacto estimado (no demostrado)', '');
    out.push('| Indicador | Actual | Propuesto |', '|---|---:|---:|');
    out.push(`| Horas de trabajo por mes | ${fmtHours(x.currentHours)} | ${fmtHours(x.proposedHours)} |`);
    out.push(`| Costo del tiempo por mes | ${m(x.currentCost)} | ${m(x.proposedCost)} |`);
    out.push(`| Tiempo de ciclo (h hábiles) | ${fmtNum(x.cycleCurrent)} | ${fmtNum(x.cycleProposed)} |`, '');
    out.push(
      `- Capacidad liberada valorizada: ${m(x.grossCost)}/mes; mantenimiento: ${m(x.runCost)}/mes; **neto: ${m(x.netPerMonth)}/mes**.`,
      `- Inversión inicial de referencia: ${m(x.setupCost)}; recupero: ${fmtMonths(x.paybackMonths)}; neto a ${x.horizonMonths} meses: ${m(x.horizonNet)}.`,
      '',
      '**Sensibilidad al factor de realización**',
      '',
      '| Realización | Horas liberadas/mes | Neto/mes | Recupero | Neto al horizonte |',
      '|---:|---:|---:|---:|---:|',
    );
    for (const r of x.sensitivity) {
      out.push(
        `| ${fmtPct(r.realizationPct)} | ${fmtHours(r.savedHoursPerMonth)} | ${m(r.netPerMonth)} | ${fmtMonths(r.paybackMonths)} | ${m(r.horizonNet)} |`,
      );
    }
    out.push('');
  }

  out.push('## Supuestos', '', ...d.assumptions.map((s) => `- ${s}`), '');
  out.push('## Limitaciones', '', ...d.limitations.map((s) => `- ${s}`), '');
  out.push('## Siguientes pasos', '', ...d.nextSteps.map((s, i) => `${i + 1}. ${s}`), '');
  if (d.observations) out.push('## Observaciones', '', d.observations, '');
  out.push('---', '_Generado con RIVECT Process Lens. Documento preliminar para conversación comercial._', '');
  return out.join('\n');
}
