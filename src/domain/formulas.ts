/** Fórmulas del modelo, tal como se muestran en la interfaz y en el diagnóstico. */
export interface FormulaDoc {
  id: string;
  label: string;
  expression: string;
  note?: string;
}

export const FORMULAS: readonly FormulaDoc[] = [
  {
    id: 'occ',
    label: 'Ocurrencias por mes',
    expression: 'ocurrencias = frecuencia × (días hábiles/mes si es por día; días hábiles/5 si es por semana; 1 si es por mes)',
  },
  {
    id: 'eff',
    label: 'Minutos efectivos por ocurrencia',
    expression: 'efectivos = minutos activos × (1 + % retrabajo)',
  },
  {
    id: 'hours',
    label: 'Horas de trabajo por mes',
    expression: 'horas/mes = efectivos × personas × ocurrencias ÷ 60',
  },
  {
    id: 'cost',
    label: 'Costo del tiempo por mes',
    expression: 'costo/mes = horas/mes × costo por hora del rol',
  },
  {
    id: 'lead',
    label: 'Tiempo transcurrido de una etapa',
    expression: 'transcurrido = efectivos ÷ 60 + espera (horas hábiles)',
    note: 'Las personas simultáneas no alargan el tiempo transcurrido; la espera no consume horas de trabajo.',
  },
  {
    id: 'cycle',
    label: 'Tiempo de ciclo',
    expression: 'ciclo = suma de "transcurrido" a lo largo del camino más largo del flujo',
  },
  {
    id: 'reduction',
    label: 'Reducción del trabajo (propuesto)',
    expression: 'reducción = % manual × potencial de automatización × cobertura de la solución × factor de realización',
    note: 'Cada factor está entre 0 y 1; el producto nunca supera la parte manual de la etapa.',
  },
  {
    id: 'waitReduction',
    label: 'Reducción de la espera (propuesto)',
    expression: 'espera propuesta = espera × (1 − reducción de espera de la solución × factor de realización)',
  },
  {
    id: 'gross',
    label: 'Capacidad liberada valorizada',
    expression: 'bruto/mes = costo/mes actual − costo/mes propuesto',
    note: 'Es capacidad liberada, no dinero ahorrado, salvo que se reasigne o evite contratar.',
  },
  {
    id: 'net',
    label: 'Neto mensual',
    expression: 'neto/mes = bruto/mes − mantenimiento mensual de las soluciones usadas',
    note: 'Cada solución se cuenta una sola vez aunque se aplique a varias etapas.',
  },
  {
    id: 'payback',
    label: 'Recupero y neto al horizonte',
    expression: 'recupero = inversión inicial ÷ neto/mes (solo si el neto > 0); neto al horizonte = neto/mes × meses − inversión inicial',
  },
  {
    id: 'sensitivity',
    label: 'Sensibilidad',
    expression: 'se recalcula todo con el factor de realización base −20 puntos, base, base +20 puntos y 100% (techo teórico)',
  },
];
