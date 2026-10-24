import type { Project } from './types';

const nf = (max: number) => new Intl.NumberFormat('es-UY', { maximumFractionDigits: max });
const nf0 = nf(0);
const nf1 = nf(1);

export const fmtNum = (n: number, digits = 1) => (digits === 0 ? nf0.format(n) : digits === 1 ? nf1.format(n) : nf(digits).format(n));
export const fmtPct = (n: number, digits = 0) => `${fmtNum(n, digits)}%`;
export const fmtHours = (n: number) => `${fmtNum(n, Math.abs(n) < 10 ? 1 : 0)} h`;

export function fmtMoney(n: number, currency: Project['currency']): string {
  const symbol = currency === 'USD' ? 'US$' : '$U';
  const sign = n < 0 ? '−' : '';
  return `${sign}${symbol} ${nf0.format(Math.abs(Math.round(n)))}`;
}

export function fmtMonths(n: number | null): string {
  if (n === null) return 'No se recupera';
  if (n === 0) return 'Inmediato';
  return `${fmtNum(n, 1)} meses`;
}

/** Horas hábiles → texto legible ("3 h", "2,5 días"). */
export function fmtLead(hours: number, hoursPerDay: number): string {
  if (hours < hoursPerDay) return `${fmtNum(hours, 1)} h`;
  return `${fmtNum(hours / hoursPerDay, 1)} días`;
}
