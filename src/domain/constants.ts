import type { ActivityType, Evidence, FrequencyUnit, Sector, SolutionId, Thresholds } from './types';

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  captura: 'Captura de datos',
  revision: 'Revisión / control',
  decision: 'Decisión',
  comunicacion: 'Comunicación',
  documento: 'Generación de documentos',
  especializado: 'Trabajo especializado',
  espera: 'Espera / dependencia externa',
};

/** Tipos de actividad donde la automatización de tareas repetitivas suele ser viable. */
export const STRUCTURED_ACTIVITIES: readonly ActivityType[] = [
  'captura',
  'documento',
  'comunicacion',
  'revision',
];

export const EVIDENCE_LABELS: Record<Evidence, string> = {
  medido: 'Medido',
  declarado: 'Declarado por el cliente',
  supuesto: 'Supuesto del equipo',
};

export const EVIDENCE_SHORT: Record<Evidence, string> = {
  medido: 'Medido',
  declarado: 'Declarado',
  supuesto: 'Supuesto',
};

export const EVIDENCE_HELP: Record<Evidence, string> = {
  medido: 'Surge de registros, sistemas o cronometraje.',
  declarado: 'Lo afirmó el cliente en la reunión; no verificado.',
  supuesto: 'Valor tentativo del equipo RIVECT para poder simular.',
};

export const FREQUENCY_LABELS: Record<FrequencyUnit, string> = {
  dia: 'por día',
  semana: 'por semana',
  mes: 'por mes',
};

export const SECTOR_LABELS: Record<Sector, string> = {
  contable: 'Estudio contable',
  clinica: 'Clínica / consultorio',
  juridico: 'Estudio jurídico',
  otro: 'Otro',
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  waitHours: 8,
  cycleSharePct: 30,
  loadSharePct: 25,
  reworkPct: 15,
  repetitiveOccurrences: 20,
  repetitiveManualPct: 60,
  highPotentialPct: 60,
};

export interface SolutionDef {
  id: SolutionId;
  name: string;
  /** Nombre corto para etiquetas compactas (nodos del lienzo). */
  short: string;
  summary: string;
  /** Actividades para las que la solución está pensada. */
  fits: readonly ActivityType[];
  defaultCoveragePct: number;
  defaultWaitReductionPct: number;
  /** Referencia interna en USD. Es un placeholder para cotizar, no una oferta. */
  referenceSetupUsd: number;
  referenceMonthlyUsd: number;
}

export const SOLUTIONS: Record<SolutionId, SolutionDef> = {
  portal_recepcion: {
    id: 'portal_recepcion',
    short: 'Portal de recepción',
    name: 'Portal / formulario de recepción con validación',
    summary: 'El cliente carga datos y archivos en un formulario que valida campos obligatorios y formatos.',
    fits: ['captura', 'comunicacion'],
    defaultCoveragePct: 60,
    defaultWaitReductionPct: 30,
    referenceSetupUsd: 1800,
    referenceMonthlyUsd: 40,
  },
  extraccion_datos: {
    id: 'extraccion_datos',
    short: 'Extracción de datos',
    name: 'Extracción asistida de datos de documentos',
    summary: 'Lectura de documentos con plantillas y reglas; una persona confirma las excepciones.',
    fits: ['captura', 'documento'],
    defaultCoveragePct: 50,
    defaultWaitReductionPct: 10,
    referenceSetupUsd: 2800,
    referenceMonthlyUsd: 70,
  },
  recordatorios: {
    id: 'recordatorios',
    short: 'Recordatorios',
    name: 'Recordatorios y seguimiento automáticos',
    summary: 'Avisos programados por correo o mensajería, con escalamiento si no hay respuesta.',
    fits: ['comunicacion', 'espera', 'decision'],
    defaultCoveragePct: 70,
    defaultWaitReductionPct: 45,
    referenceSetupUsd: 1200,
    referenceMonthlyUsd: 30,
  },
  plantillas_documentos: {
    id: 'plantillas_documentos',
    short: 'Plantillas',
    name: 'Generación de documentos desde plantillas',
    summary: 'Documentos armados con datos ya cargados, con campos variables y control de versiones.',
    fits: ['documento'],
    defaultCoveragePct: 65,
    defaultWaitReductionPct: 10,
    referenceSetupUsd: 1400,
    referenceMonthlyUsd: 25,
  },
  integracion_sistemas: {
    id: 'integracion_sistemas',
    short: 'Integración',
    name: 'Integración y conciliación entre sistemas',
    summary: 'Sincronización de datos entre sistemas existentes y conciliación por reglas.',
    fits: ['captura', 'revision', 'documento'],
    defaultCoveragePct: 55,
    defaultWaitReductionPct: 15,
    referenceSetupUsd: 3600,
    referenceMonthlyUsd: 90,
  },
  flujo_aprobacion: {
    id: 'flujo_aprobacion',
    short: 'Flujo de aprobación',
    name: 'Flujo de aprobación con trazabilidad',
    summary: 'Revisión y aprobación en un flujo con responsables, estados y alertas por demora.',
    fits: ['revision', 'decision'],
    defaultCoveragePct: 30,
    defaultWaitReductionPct: 50,
    referenceSetupUsd: 1600,
    referenceMonthlyUsd: 40,
  },
  tablero_alertas: {
    id: 'tablero_alertas',
    short: 'Tablero de alertas',
    name: 'Tablero de seguimiento y alertas de plazos',
    summary: 'Vista única de casos y vencimientos, con alertas antes de que un plazo se pierda.',
    fits: ['espera', 'decision', 'revision', 'especializado'],
    defaultCoveragePct: 25,
    defaultWaitReductionPct: 40,
    referenceSetupUsd: 1500,
    referenceMonthlyUsd: 30,
  },
  agenda_online: {
    id: 'agenda_online',
    short: 'Agenda online',
    name: 'Agenda online con autogestión',
    summary: 'Turnos o reuniones reservados por el propio cliente según disponibilidad real.',
    fits: ['comunicacion', 'captura'],
    defaultCoveragePct: 65,
    defaultWaitReductionPct: 35,
    referenceSetupUsd: 1200,
    referenceMonthlyUsd: 35,
  },
};

/** Factor de conversión orientativo para sembrar costos en UYU. No hay conversión dinámica. */
export const SEED_UYU_PER_USD = 40;

/** Limitaciones que siempre aplican al modelo. Se muestran en la app y en el diagnóstico. */
export const MODEL_LIMITS: readonly string[] = [
  'Las duraciones y frecuencias son las cargadas en la sesión; la herramienta no las verifica contra sistemas del cliente.',
  'El potencial de automatización, la cobertura de las soluciones y el factor de realización son hipótesis del equipo, no resultados medidos.',
  'El "ahorro" es capacidad liberada valorizada a costo por hora; solo se convierte en dinero si esa capacidad se reasigna o evita contrataciones.',
  'Los costos de implementación y mantenimiento son referencias internas para cotizar, no una oferta ni un presupuesto.',
  'No se modelan cambios en volumen, rotación de personal, curva de aprendizaje, licencias de terceros ni impuestos.',
  'El tiempo de ciclo usa el camino más largo del grafo; los ciclos (bucles de retrabajo) se aproximan con el % de retrabajo y no se recorren.',
  'El retrabajo no se reduce con las soluciones propuestas (supuesto conservador).',
];
